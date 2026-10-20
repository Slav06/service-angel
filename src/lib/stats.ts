import { sql, type SQL } from 'drizzle-orm';
import { getDb } from '@/db';
import { CONVERSATION_OUTCOMES } from '@/db/schema';
import { APP_TZ } from './brand';
import { ratio } from './format';

export const PERIODS = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  last30: 'Last 30 days',
  quarter: 'This quarter',
  year: 'This year',
  all: 'All time',
} as const;
export type Period = keyof typeof PERIODS;
export const isPeriod = (p: unknown): p is Period => typeof p === 'string' && p in PERIODS;

const tz = sql.raw(`'${APP_TZ.replace(/'/g, '')}'`);

// Start of the period as a timestamptz, computed in the business time zone.
function periodStart(p: Period): SQL | null {
  const trunc = (unit: string) => sql`(date_trunc(${sql.raw(`'${unit}'`)}, now() at time zone ${tz}) at time zone ${tz})`;
  switch (p) {
    case 'today':
      return trunc('day');
    case 'week':
      return trunc('week');
    case 'month':
      return trunc('month');
    case 'quarter':
      return trunc('quarter');
    case 'year':
      return trunc('year');
    case 'last30':
      return sql`(now() - interval '30 days')`;
    case 'all':
      return null;
  }
}

const since = (col: SQL, p: Period) => {
  const start = periodStart(p);
  return start ? sql`${col} >= ${start}` : sql`true`;
};

export type RepStats = {
  repId: number;
  calls: number;
  conversations: number;
  appointments: number;
  talkMinutes: number;
  deals: number;
  revenue: number;
  monthlyRecurring: number;
  commission: number;
  buildCost: number;
  collected: number;
  companyProfit: number;
  leadsReceived: number;
  // Derived rates (null when there is nothing to divide by).
  closeRate: number | null; // deals per call
  connectRate: number | null; // conversations per call
  apptToClose: number | null; // deals per appointment
  avgDeal: number | null;
};

const emptyStats = (repId: number): RepStats => ({
  repId,
  calls: 0,
  conversations: 0,
  appointments: 0,
  talkMinutes: 0,
  deals: 0,
  revenue: 0,
  monthlyRecurring: 0,
  commission: 0,
  buildCost: 0,
  collected: 0,
  companyProfit: 0,
  leadsReceived: 0,
  closeRate: null,
  connectRate: null,
  apptToClose: null,
  avgDeal: null,
});

const convoList = sql.join(
  CONVERSATION_OUTCOMES.map((o) => sql`${o}`),
  sql`, `,
);

// Per-rep numbers for a period. repId limits to one rep; omit for the whole team.
export async function repStats(period: Period, repId?: number): Promise<Map<number, RepStats>> {
  const repFilter = (col: string) => (repId ? sql`${sql.raw(col)} = ${repId}` : sql`true`);

  const [callRows, saleRows, leadRows] = await Promise.all([
    query<{ rep_id: number; calls: number; convos: number; appts: number; minutes: number }>(sql`
      select rep_id,
        count(*)::int as calls,
        (count(*) filter (where outcome in (${convoList})))::int as convos,
        (count(*) filter (where outcome in ('appointment', 'sold')))::int as appts,
        coalesce(sum(minutes), 0)::int as minutes
      from calls
      where ${since(sql`at`, period)} and ${repFilter('rep_id')}
      group by rep_id`),
    query<{
      rep_id: number;
      deals: number;
      revenue: number;
      mrr: number;
      commission: number;
      build_cost: number;
      collected: number;
    }>(sql`
      select rep_id,
        count(*)::int as deals,
        coalesce(sum(price_cents), 0)::int as revenue,
        coalesce(sum(monthly_cents), 0)::int as mrr,
        coalesce(sum(commission_cents), 0)::int as commission,
        coalesce(sum(build_cost_cents), 0)::int as build_cost,
        coalesce(sum(collected_cents), 0)::int as collected
      from sales
      where status <> 'refunded' and ${since(sql`closed_at`, period)} and ${repFilter('rep_id')}
      group by rep_id`),
    query<{ rep_id: number; n: number }>(sql`
      select rep_id, count(*)::int as n from leads
      where rep_id is not null and ${since(sql`coalesce(assigned_at, created_at)`, period)} and ${repFilter('rep_id')}
      group by rep_id`),
  ]);

  const out = new Map<number, RepStats>();
  const get = (id: number) => {
    let s = out.get(id);
    if (!s) out.set(id, (s = emptyStats(id)));
    return s;
  };
  for (const r of callRows) {
    Object.assign(get(r.rep_id), { calls: r.calls, conversations: r.convos, appointments: r.appts, talkMinutes: r.minutes });
  }
  for (const r of saleRows) {
    Object.assign(get(r.rep_id), {
      deals: r.deals,
      revenue: r.revenue,
      monthlyRecurring: r.mrr,
      commission: r.commission,
      buildCost: r.build_cost,
      collected: r.collected,
    });
  }
  for (const r of leadRows) get(r.rep_id).leadsReceived = r.n;
  for (const s of out.values()) derive(s);
  return out;
}

function derive(s: RepStats) {
  s.companyProfit = s.revenue - s.commission - s.buildCost;
  s.closeRate = ratio(s.deals, s.calls);
  s.connectRate = ratio(s.conversations, s.calls);
  s.apptToClose = ratio(s.deals, s.appointments);
  s.avgDeal = s.deals ? s.revenue / s.deals : null;
  return s;
}

export function sumStats(all: Iterable<RepStats>): RepStats {
  const t = emptyStats(0);
  for (const s of all) {
    t.calls += s.calls;
    t.conversations += s.conversations;
    t.appointments += s.appointments;
    t.talkMinutes += s.talkMinutes;
    t.deals += s.deals;
    t.revenue += s.revenue;
    t.monthlyRecurring += s.monthlyRecurring;
    t.commission += s.commission;
    t.buildCost += s.buildCost;
    t.collected += s.collected;
    t.leadsReceived += s.leadsReceived;
  }
  return derive(t);
}

export async function statsFor(repId: number, period: Period) {
  return (await repStats(period, repId)).get(repId) ?? emptyStats(repId);
}

export type DayPoint = { day: string; calls: number; revenue: number; deals: number };

// One point per day for the last `days` days (oldest first), zero-filled.
export async function dailySeries(days: number, repId?: number): Promise<DayPoint[]> {
  const repFilter = repId ? sql`rep_id = ${repId}` : sql`true`;
  const start = sql`(date_trunc('day', now() at time zone ${tz}) - ${`${days - 1} days`}::interval)`;
  return query<DayPoint>(sql`
      with d as (select generate_series(${start}, date_trunc('day', now() at time zone ${tz}), interval '1 day')::date as day),
      c as (select (at at time zone ${tz})::date as day, count(*)::int as n from calls where ${repFilter} and at >= ${start} at time zone ${tz} group by 1),
      s as (select (closed_at at time zone ${tz})::date as day, count(*)::int as n, sum(price_cents)::int as rev
            from sales where status <> 'refunded' and ${repFilter} and closed_at >= ${start} at time zone ${tz} group by 1)
      select to_char(d.day, 'YYYY-MM-DD') as day, coalesce(c.n, 0)::int as calls,
             coalesce(s.rev, 0)::int as revenue, coalesce(s.n, 0)::int as deals
      from d left join c using (day) left join s using (day) order by d.day`);
}

// Commission earned but not yet paid out (all time).
export async function commissionOwed(repId?: number) {
  const repFilter = repId ? sql`rep_id = ${repId}` : sql`true`;
  const [r] = await query<{ owed: number; paid: number }>(sql`
      select coalesce(sum(commission_cents) filter (where commission_paid_at is null), 0)::int as owed,
             coalesce(sum(commission_cents) filter (where commission_paid_at is not null), 0)::int as paid
      from sales where status <> 'refunded' and ${repFilter}`);
  return r ?? { owed: 0, paid: 0 };
}

export async function pipelineCounts(repId?: number) {
  const repFilter = repId ? sql`rep_id = ${repId}` : sql`rep_id is not null`;
  const rows = await query<{ stage: string; n: number }>(sql`select stage, count(*)::int as n from leads where ${repFilter} group by stage`);
  const due = await query<{ n: number }>(sql`
      select count(*)::int as n from leads
      where ${repFilter} and stage not in ('won', 'lost') and next_follow_up_at is not null
        and next_follow_up_at < (date_trunc('day', now() at time zone ${tz}) + interval '1 day') at time zone ${tz}`);
  return { byStage: Object.fromEntries(rows.map((r) => [r.stage, r.n])) as Record<string, number>, followUpsDue: due[0]?.n ?? 0 };
}

async function query<T>(q: SQL): Promise<T[]> {
  const db = await getDb();
  return rowsOf<T>(await db.execute(q));
}

// postgres-js returns an array; PGlite returns { rows }.
export function rowsOf<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  return ((res as { rows?: T[] }).rows ?? []) as T[];
}
