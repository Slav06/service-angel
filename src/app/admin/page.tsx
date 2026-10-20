import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { Bars, PageHeader, PeriodTabs, Stat } from '@/components/ui';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { ago, money, pct, ratio } from '@/lib/format';
import { commissionOwed, dailySeries, isPeriod, PERIODS, repStats, sumStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function Overview({ searchParams }: PageProps<'/admin'>) {
  await requireAdmin();
  const { p } = await searchParams;
  const period = isPeriod(p) ? p : 'month';
  const db = await getDb();
  const [reps, stats, series, owed] = await Promise.all([
    db.select().from(users).where(eq(users.active, true)),
    repStats(period),
    dailySeries(30),
    commissionOwed(),
  ]);
  const t = sumStats(stats.values());
  const label = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const rows = reps
    .map((r) => ({ r, s: stats.get(r.id) }))
    .sort((a, b) => (b.s?.revenue ?? 0) - (a.s?.revenue ?? 0) || (b.s?.calls ?? 0) - (a.s?.calls ?? 0));

  return (
    <>
      <PageHeader title="Company overview" sub={`All reps · ${PERIODS[period].toLowerCase()}`}>
        <PeriodTabs current={period} base="/admin" />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Revenue" value={money(t.revenue)} sub={`${t.deals} deals`} tone="brand" />
        <Stat label="Company profit" value={money(t.companyProfit)} sub={`${pct(ratio(t.companyProfit, t.revenue))} margin`} tone="good" />
        <Stat label="Commissions" value={money(t.commission)} sub={`${money(owed.owed)} owed (all time)`} />
        <Stat label="Build costs" value={money(t.buildCost)} />
        <Stat label="Cash collected" value={money(t.collected)} sub={`${money(t.revenue - t.collected)} outstanding`} />
        <Stat label="Calls" value={t.calls} sub={`${t.talkMinutes} min talk time`} />
        <Stat label="Close rate" value={pct(t.closeRate)} sub="deals ÷ calls" />
        <Stat label="Connect rate" value={pct(t.connectRate)} sub={`${t.conversations} conversations`} />
        <Stat label="Avg deal" value={t.avgDeal ? money(t.avgDeal) : '—'} sub={`${t.appointments} appointments`} />
        <Stat label="Recurring added" value={`${money(t.monthlyRecurring)}/mo`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <Bars label="Team revenue — last 30 days" points={series.map((d) => ({ key: d.day, label: label(d.day), value: d.revenue }))} format={(n) => money(n)} />
        </div>
        <div className="card">
          <Bars label="Team calls — last 30 days" points={series.map((d) => ({ key: d.day, label: label(d.day), value: d.calls }))} format={String} />
        </div>
      </div>

      <div className="card mt-4 overflow-x-auto p-0">
        <p className="h2 px-4 pt-4">Reps · {PERIODS[period].toLowerCase()}</p>
        <table className="table mt-2">
          <thead>
            <tr>
              <th>Rep</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Profit</th>
              <th className="text-right">Commission</th>
              <th className="text-right">Deals</th>
              <th className="text-right">Calls</th>
              <th className="text-right">Convos</th>
              <th className="text-right">Appts</th>
              <th className="text-right">Close %</th>
              <th className="text-right">Connect %</th>
              <th className="text-right">Leads in</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, s }) => (
              <tr key={r.id} className="hover:bg-zinc-50">
                <td>
                  <Link href={`/admin/reps/${r.id}?p=${period}`} className="font-medium text-brand-700 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="text-right tabular-nums">{money(s?.revenue)}</td>
                <td className="text-right tabular-nums text-green-700">{money(s?.companyProfit)}</td>
                <td className="text-right tabular-nums">{money(s?.commission)}</td>
                <td className="text-right tabular-nums">{s?.deals ?? 0}</td>
                <td className="text-right tabular-nums">{s?.calls ?? 0}</td>
                <td className="text-right tabular-nums">{s?.conversations ?? 0}</td>
                <td className="text-right tabular-nums">{s?.appointments ?? 0}</td>
                <td className="text-right tabular-nums">{pct(s?.closeRate)}</td>
                <td className="text-right tabular-nums">{pct(s?.connectRate)}</td>
                <td className="text-right tabular-nums">{s?.leadsReceived ?? 0}</td>
                <td className="text-zinc-500">{ago(r.lastSeenAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
