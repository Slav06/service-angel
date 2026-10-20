import { and, asc, desc, eq, notInArray } from 'drizzle-orm';
import Link from 'next/link';
import { deleteCall } from '@/app/portal/actions';
import { CallLogger } from '@/components/call-logger';
import { Badge, Empty, PageHeader, Stat } from '@/components/ui';
import { getDb } from '@/db';
import { calls, leads } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { fmtDate, OUTCOME_CLASS, OUTCOME_LABEL, pct } from '@/lib/format';
import { statsFor } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function Calls() {
  const user = await requireUser();
  const db = await getDb();
  const [myLeads, history, today, week] = await Promise.all([
    db
      .select({ id: leads.id, business: leads.business })
      .from(leads)
      .where(and(eq(leads.repId, user.id), notInArray(leads.stage, ['won', 'lost'])))
      .orderBy(asc(leads.nextFollowUpAt), asc(leads.business)),
    db
      .select({ id: calls.id, outcome: calls.outcome, minutes: calls.minutes, notes: calls.notes, at: calls.at, leadId: calls.leadId, business: leads.business })
      .from(calls)
      .leftJoin(leads, eq(leads.id, calls.leadId))
      .where(eq(calls.repId, user.id))
      .orderBy(desc(calls.at))
      .limit(100),
    statsFor(user.id, 'today'),
    statsFor(user.id, 'week'),
  ]);

  return (
    <>
      <PageHeader title="Log calls" sub="Every dial counts — log it here and your stats update instantly." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-4">
          <div className="card">
            <CallLogger leads={myLeads} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Calls today" value={`${today.calls} / ${user.dailyCallGoal}`} sub={`${today.conversations} conversations`} />
            <Stat label="This week" value={week.calls} sub={`connect rate ${pct(week.connectRate)}`} />
          </div>
        </div>
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Lead</th>
                <th>Outcome</th>
                <th>Min</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr key={c.id}>
                  <td className="whitespace-nowrap text-zinc-500">{fmtDate(c.at, true)}</td>
                  <td>
                    {c.leadId ? (
                      <Link href={`/portal/leads/${c.leadId}`} className="font-medium hover:underline">
                        {c.business}
                      </Link>
                    ) : (
                      <span className="text-zinc-400">Cold call</span>
                    )}
                  </td>
                  <td>
                    <Badge className={OUTCOME_CLASS[c.outcome]}>{OUTCOME_LABEL[c.outcome]}</Badge>
                  </td>
                  <td className="tabular-nums">{c.minutes || ''}</td>
                  <td className="max-w-xs text-zinc-600">{c.notes}</td>
                  <td>
                    <form action={deleteCall}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-xs text-zinc-400 hover:text-red-600" title="Delete (logged by mistake)">
                        ✕
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!history.length && <Empty>No calls yet — log your first one.</Empty>}
        </div>
      </div>
    </>
  );
}
