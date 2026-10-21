import Link from 'next/link';
import { setCallOutcome } from '@/app/portal/actions';
import type { Outcome } from '@/db/schema';
import type { FeedCall, recentTexts } from '@/lib/dialerr';
import { ago, duration, fmtDate, hoursMinutes, OUTCOME_CLASS, OUTCOME_LABEL, pct } from '@/lib/format';
import type { PhoneStats } from '@/lib/stats';
import { Badge, Empty, Stat } from './ui';

// Outcomes a rep picks for an answered Dialerr call, in the order they usually happen.
const TAGS: Outcome[] = ['voicemail', 'gatekeeper', 'not_interested', 'callback', 'interested', 'appointment', 'sold'];

export function PhoneTiles({ s }: { s: PhoneStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Stat label="Dials" value={s.dials} sub={s.inbound ? `+ ${s.inbound} inbound` : 'outbound calls'} tone="brand" />
      <Stat label="Answered" value={s.answered} sub={`${pct(s.answerRate)} answer rate`} />
      <Stat label="Talk time" value={hoursMinutes(s.talkSeconds)} sub={`longest ${duration(s.longest)}`} tone="good" />
      <Stat label="Avg answered call" value={s.avgCall == null ? '—' : duration(s.avgCall)} sub={`${s.recorded} recorded`} />
      <Stat label="Texts" value={s.textsSent + s.textsReceived} sub={`${s.textsSent} sent · ${s.textsReceived} received · ${s.voicemails} voicemail`} />
    </div>
  );
}

export function RecordingLink({ call }: { call: { id: number; recordingUrl: string | null } }) {
  if (!call.recordingUrl) return null;
  return (
    <a href={`/api/dialerr/recording/${call.id}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-700 hover:underline">
      ▶ Recording
    </a>
  );
}

// "How did it go?" buttons for an answered call (the rep's own view only).
export function OutcomePicker({ callId }: { callId: number }) {
  return (
    <form action={setCallOutcome} className="flex flex-wrap gap-1">
      <input type="hidden" name="id" value={callId} />
      {TAGS.map((o) => (
        <button key={o} name="outcome" value={o} className="rounded border border-zinc-300 px-1.5 py-0.5 text-[11px] font-medium hover:border-brand-600 hover:bg-brand-50">
          {OUTCOME_LABEL[o]}
        </button>
      ))}
    </form>
  );
}

export function CallFeed({ rows, showRep = false, canTag = false, leadHref }: { rows: FeedCall[]; showRep?: boolean; canTag?: boolean; leadHref?: (id: number) => string }) {
  if (!rows.length) return <Empty>No Dialerr calls yet — calls made in the dialer panel show up here automatically.</Empty>;
  return (
    <ul className="divide-y divide-zinc-100">
      {rows.map((c) => {
        const who = c.business ?? c.contactName ?? c.phone ?? 'Unknown number';
        return (
          <li key={c.id} className="py-2.5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span title={c.direction === 'inbound' ? 'Inbound call' : 'Outbound call'} className="text-zinc-400">
                {c.direction === 'inbound' ? '↙' : '↗'}
              </span>
              {c.leadId && leadHref ? (
                <Link href={leadHref(c.leadId)} className="font-medium hover:underline">
                  {who}
                </Link>
              ) : (
                <span className="font-medium">{who}</span>
              )}
              {c.business && c.phone && <span className="text-xs text-zinc-400">{c.phone}</span>}
              <Badge className={OUTCOME_CLASS[c.outcome]}>{OUTCOME_LABEL[c.outcome]}</Badge>
              {c.disposition && <span className="text-xs text-zinc-500">“{c.disposition}”</span>}
              {c.seconds ? <span className="text-xs text-zinc-500 tabular-nums">{duration(c.seconds)}</span> : null}
              <RecordingLink call={c} />
              <span className="ml-auto text-xs text-zinc-400" title={fmtDate(c.at, true)}>
                {showRep && <b className="font-medium text-zinc-600">{c.repName} · </b>}
                {ago(c.at)}
              </span>
            </div>
            {(c.aiSummary || c.notes) && <p className="mt-1 text-xs text-zinc-600">{c.aiSummary ?? c.notes}</p>}
            {canTag && c.outcome === 'connected' && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-amber-700">How did it go?</span>
                <OutcomePicker callId={c.id} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function TextFeed({ rows, showRep = false }: { rows: Awaited<ReturnType<typeof recentTexts>>; showRep?: boolean }) {
  if (!rows.length) return <Empty>No texts or voicemails yet.</Empty>;
  return (
    <ul className="divide-y divide-zinc-100">
      {rows.map((t) => (
        <li key={t.id} className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge className={t.kind === 'sms_in' ? 'bg-sky-100 text-sky-800' : t.kind === 'sms_out' ? 'bg-zinc-100 text-zinc-700' : 'bg-violet-100 text-violet-800'}>
              {t.kind === 'sms_in' ? 'Text in' : t.kind === 'sms_out' ? 'Text out' : 'Voicemail'}
            </Badge>
            <span className="font-medium">{t.name ?? t.phone ?? 'Unknown'}</span>
            {t.url && (
              <a href={t.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-700 hover:underline">
                ▶ Listen{t.seconds ? ` (${duration(t.seconds)})` : ''}
              </a>
            )}
            <span className="ml-auto text-xs text-zinc-400">
              {showRep && t.repName && <b className="font-medium text-zinc-600">{t.repName} · </b>}
              {ago(t.at)}
            </span>
          </div>
          {t.body && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{t.body}</p>}
        </li>
      ))}
    </ul>
  );
}
