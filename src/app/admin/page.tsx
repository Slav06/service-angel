import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { CallFeed, PhoneTiles, TextFeed } from '@/components/dialer-activity';
import { Bars, PageHeader, PeriodTabs, Stat } from '@/components/ui';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { recentDialerrCalls, recentTexts } from '@/lib/dialerr';
import { ago, duration, hoursMinutes, money, pct, ratio } from '@/lib/format';
import { commissionOwed, dailySeries, isPeriod, PERIODS, phoneStats, repStats, sumStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function Overview({ searchParams }: PageProps<'/admin'>) {
  await requireAdmin();
  const { p } = await searchParams;
  const period = isPeriod(p) ? p : 'month';
  const db = await getDb();
  const [reps, stats, series, owed, phone, feed, texts] = await Promise.all([
    db.select().from(users).where(eq(users.active, true)),
    repStats(period),
    dailySeries(30),
    commissionOwed(),
    phoneStats(period),
    recentDialerrCalls(15),
    recentTexts(10),
  ]);
  const teamPhone = phone.get(0)!;
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
        <Stat label="Revenue collected" value={money(t.revenue)} sub="client payments received" tone="brand" />
        <Stat label="Company profit" value={money(t.companyProfit)} sub={`${pct(ratio(t.companyProfit, t.revenue))} margin`} tone="good" />
        <Stat label="Commissions earned" value={money(t.commission)} sub={`${money(owed.owed)} owed (all time)`} />
        <Stat label="Monthly recurring now" value={`${money(t.mrr)}/mo`} sub={`${t.activeClients} active clients`} tone="brand" />
        <Stat label="New clients" value={t.deals} sub={`+${money(t.newMrr)}/mo · ${t.cancelled} cancelled`} />
        <Stat label="Calls" value={t.calls} sub={`${t.talkMinutes} min talk time`} />
        <Stat label="Close rate" value={pct(t.closeRate)} sub="new clients ÷ calls" />
        <Stat label="Connect rate" value={pct(t.connectRate)} sub={`${t.conversations} conversations`} />
        <Stat label="Appointments" value={t.appointments} sub={`${pct(t.apptToClose)} close`} />
        <Stat label="Build costs" value={money(t.buildCost)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <Bars label="Payments collected — last 30 days" points={series.map((d) => ({ key: d.day, label: label(d.day), value: d.revenue }))} format={(n) => money(n)} />
        </div>
        <div className="card">
          <Bars label="Team calls — last 30 days" points={series.map((d) => ({ key: d.day, label: label(d.day), value: d.calls }))} format={String} />
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Phone activity · Dialerr</h2>
          <Link href="/admin/dialerr" className="text-xs text-brand-600 hover:underline">
            Dialerr setup →
          </Link>
        </div>
        <PhoneTiles s={teamPhone} />
        <div className="card mt-4 overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Rep</th>
                <th className="text-right">Dials</th>
                <th className="text-right">Answered</th>
                <th className="text-right">Answer %</th>
                <th className="text-right">Inbound</th>
                <th className="text-right">Talk time</th>
                <th className="text-right">Avg call</th>
                <th className="text-right">Texts sent</th>
                <th className="text-right">Need outcome</th>
                <th>Last call</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((r) => {
                const ph = phone.get(r.id);
                return (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td>
                      <Link href={`/admin/reps/${r.id}?p=${period}`} className="font-medium text-brand-700 hover:underline">
                        {r.name}
                      </Link>
                      {!r.dialerrEmail && <span className="ml-1.5 text-xs text-amber-600">not linked</span>}
                    </td>
                    <td className="text-right tabular-nums">{ph?.dials ?? 0}</td>
                    <td className="text-right tabular-nums">{ph?.answered ?? 0}</td>
                    <td className="text-right tabular-nums">{pct(ph?.answerRate)}</td>
                    <td className="text-right tabular-nums">{ph?.inbound ?? 0}</td>
                    <td className="text-right tabular-nums">{hoursMinutes(ph?.talkSeconds ?? 0)}</td>
                    <td className="text-right tabular-nums">{ph?.avgCall == null ? '—' : duration(ph.avgCall)}</td>
                    <td className="text-right tabular-nums">{ph?.textsSent ?? 0}</td>
                    <td className={`text-right tabular-nums ${ph?.untagged ? 'font-medium text-amber-700' : ''}`}>{ph?.untagged ?? 0}</td>
                    <td className="text-zinc-500">{ago(ph?.lastCallAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
          <div className="card">
            <p className="h2">Latest calls</p>
            <CallFeed rows={feed} showRep />
          </div>
          <div className="card">
            <p className="h2">Texts & voicemails</p>
            <TextFeed rows={texts} showRep />
          </div>
        </div>
      </section>

      <div className="card mt-8 overflow-x-auto p-0">
        <p className="h2 px-4 pt-4">Reps · {PERIODS[period].toLowerCase()}</p>
        <table className="table mt-2">
          <thead>
            <tr>
              <th>Rep</th>
              <th className="text-right">Collected</th>
              <th className="text-right">Profit</th>
              <th className="text-right">Commission</th>
              <th className="text-right">New clients</th>
              <th className="text-right">Active</th>
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
                <td className="text-right tabular-nums">{s?.activeClients ?? 0}</td>
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
