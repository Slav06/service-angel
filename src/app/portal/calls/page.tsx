import { and, asc, desc, eq, notInArray } from 'drizzle-orm';
import Link from 'next/link';
import { deleteCall } from '@/app/portal/actions';
import { CallLogger } from '@/components/call-logger';
import { OutcomePicker, RecordingLink } from '@/components/dialer-activity';
import { Badge, Empty, PageHeader, Stat } from '@/components/ui';
import { getDb } from '@/db';
import { calls, leads } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { duration, fmtDate, OUTCOME_CLASS, OUTCOME_LABEL, pct } from '@/lib/format';
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
      .select({
        id: calls.id,
        outcome: calls.outcome,
        minutes: calls.minutes,
        seconds: calls.seconds,
        notes: calls.notes,
        at: calls.at,
        leadId: calls.leadId,
        business: leads.business,
        source: calls.source,
        direction: calls.direction,
        phone: calls.phone,
        contactName: calls.contactName,
        disposition: calls.disposition,
        recordingUrl: calls.recordingUrl,
        aiSummary: calls.aiSummary,
      })
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
      <PageHeader
        title="Calls"
        sub="Calls you make in the Dialerr panel are logged here automatically — just tap how each one went. Calls from your own phone, log by hand."
      />
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
                <th>Length</th>
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
                      <span className="text-zinc-400">{c.contactName ?? c.phone ?? 'Cold call'}</span>
                    )}
                    {c.source === 'dialerr' && (
                      <span className="ml-1.5 text-[11px] text-zinc-400" title="Logged automatically from Dialerr">
                        {c.direction === 'inbound' ? '↙ inbound' : '↗ Dialerr'}
                      </span>
                    )}
                  </td>
                  <td className={c.outcome === 'connected' ? 'min-w-64' : ''}>
                    <Badge className={OUTCOME_CLASS[c.outcome]}>{OUTCOME_LABEL[c.outcome]}</Badge>
                    {c.outcome === 'connected' && (
                      <div className="mt-1.5">
                        <OutcomePicker callId={c.id} />
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap tabular-nums">
                    {c.seconds != null ? duration(c.seconds) : c.minutes ? `${c.minutes} min` : ''}
                    <div>
                      <RecordingLink call={c} />
                    </div>
                  </td>
                  <td className="max-w-xs text-zinc-600">
                    {c.disposition && <span className="text-xs text-zinc-500">“{c.disposition}” </span>}
                    {c.aiSummary ?? c.notes}
                  </td>
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
