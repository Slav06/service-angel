import { and, desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { getDb } from '@/db';
import { calls, leads, STAGES, users, type User } from '@/db/schema';
import { ago, money, OUTCOME_CLASS, OUTCOME_LABEL, pct, STAGE_CLASS, STAGE_LABEL } from '@/lib/format';
import { commissionOwed, dailySeries, PERIODS, pipelineCounts, repStats, statsFor, type Period } from '@/lib/stats';
import { Badge, Bars, Empty, PeriodTabs, Progress, Stat } from './ui';

// Everything a rep needs at a glance. Admins see the same view for any rep.
export async function RepDashboard({ rep, period, base, viewer }: { rep: User; period: Period; base: string; viewer: 'self' | 'admin' }) {
  const db = await getDb();
  const [s, month, today, series, owed, pipe, recent, team, openLeads] = await Promise.all([
    statsFor(rep.id, period),
    statsFor(rep.id, 'month'),
    statsFor(rep.id, 'today'),
    dailySeries(30, rep.id),
    commissionOwed(rep.id),
    pipelineCounts(rep.id),
    db
      .select({ id: calls.id, outcome: calls.outcome, at: calls.at, notes: calls.notes, business: leads.business, leadId: leads.id })
      .from(calls)
      .leftJoin(leads, eq(leads.id, calls.leadId))
      .where(eq(calls.repId, rep.id))
      .orderBy(desc(calls.at))
      .limit(8),
    repStats('month'),
    db
      .select({ n: leads.id })
      .from(leads)
      .where(and(eq(leads.repId, rep.id), eq(leads.stage, 'new'))),
  ]);

  const activeReps = await db.select({ id: users.id }).from(users).where(eq(users.active, true));
  const ranked = activeReps
    .map((u) => ({ id: u.id, revenue: team.get(u.id)?.revenue ?? 0 }))
    .sort((a, b) => b.revenue - a.revenue);
  const rank = ranked.findIndex((r) => r.id === rep.id) + 1;
  const label = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const leadsHref = viewer === 'self' ? '/portal/leads' : `/admin/leads?rep=${rep.id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodTabs current={period} base={base} />
        <p className="text-xs text-zinc-500">
          Showing <b>{PERIODS[period].toLowerCase()}</b> · {rank > 0 && `#${rank} of ${ranked.length} in revenue this month`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Revenue" value={money(s.revenue)} sub={`${s.deals} deal${s.deals === 1 ? '' : 's'} closed`} tone="brand" />
        <Stat label={viewer === 'self' ? 'My commission' : 'Rep commission'} value={money(s.commission)} sub={`${rep.commissionPct}% of sales`} tone="good" />
        <Stat label="Calls made" value={s.calls} sub={`${s.talkMinutes} min talk time`} />
        <Stat label="Close rate" value={pct(s.closeRate)} sub="deals ÷ calls" />
        <Stat label="Connect rate" value={pct(s.connectRate)} sub={`${s.conversations} real conversations`} />
        <Stat label="Appointments" value={s.appointments} sub={`${pct(s.apptToClose)} of appts close`} />
        <Stat label="Avg deal size" value={s.avgDeal ? money(s.avgDeal) : '—'} />
        <Stat label="Cash collected" value={money(s.collected)} sub={`${money(s.revenue - s.collected)} still owed by clients`} />
        <Stat label="Recurring added" value={`${money(s.monthlyRecurring)}/mo`} sub="hosting & care plans" />
        <Stat label="Leads received" value={s.leadsReceived} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-5">
          <p className="h2">Goals</p>
          <Progress label="Revenue this month" value={month.revenue} goal={rep.monthlyGoalCents} format={(n) => money(n)} />
          <Progress label="Calls today" value={today.calls} goal={rep.dailyCallGoal} format={String} />
        </div>
        <div className="card">
          <p className="h2">Commission payouts</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-zinc-500">Owed to {viewer === 'self' ? 'you' : rep.name}</p>
              <p className="text-2xl font-semibold text-amber-600 tabular-nums">{money(owed.owed)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Paid out (all time)</p>
              <p className="text-2xl font-semibold text-green-700 tabular-nums">{money(owed.paid)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">Commission is marked paid by the owner on the Sales page.</p>
        </div>
        <div className="card">
          <div className="flex items-baseline justify-between">
            <p className="h2">Pipeline</p>
            <Link href={leadsHref} className="text-xs text-brand-600 hover:underline">
              All leads →
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {STAGES.map((st) => (
              <Badge key={st} className={STAGE_CLASS[st]}>
                {STAGE_LABEL[st]} · {pipe.byStage[st] ?? 0}
              </Badge>
            ))}
          </div>
          <p className="mt-4 text-sm">
            <b className={pipe.followUpsDue ? 'text-red-600' : ''}>{pipe.followUpsDue}</b> follow-up{pipe.followUpsDue === 1 ? '' : 's'} due
            today · <b>{openLeads.length}</b> untouched new lead{openLeads.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <Bars label="Calls — last 30 days" points={series.map((p) => ({ key: p.day, label: label(p.day), value: p.calls }))} format={String} />
        </div>
        <div className="card">
          <Bars
            label="Revenue — last 30 days"
            points={series.map((p) => ({ key: p.day, label: label(p.day), value: p.revenue }))}
            format={(n) => money(n)}
          />
        </div>
      </div>

      <div className="card">
        <p className="h2">Recent calls</p>
        {recent.length ? (
          <ul className="mt-2 divide-y divide-zinc-100">
            {recent.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <Badge className={OUTCOME_CLASS[c.outcome]}>{OUTCOME_LABEL[c.outcome]}</Badge>
                {c.leadId && viewer === 'self' ? (
                  <Link href={`/portal/leads/${c.leadId}`} className="font-medium hover:underline">
                    {c.business}
                  </Link>
                ) : (
                  <span className="font-medium">{c.business ?? 'Cold call'}</span>
                )}
                {c.notes && <span className="truncate text-zinc-500">— {c.notes}</span>}
                <span className="ml-auto text-xs text-zinc-400">{ago(c.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No calls logged yet.</Empty>
        )}
      </div>
    </div>
  );
}
