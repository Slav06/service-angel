import { OUTCOMES, STAGES, type Outcome, type RequestStatus, type SaleStatus, type Stage } from '@/db/schema';
import { APP_TZ } from './brand';

// Whole dollars unless there are cents to show (e.g. a 20% commission of $499.80).
export function money(cents: number | null | undefined) {
  const c = Math.round(cents ?? 0);
  const digits = c % 100 === 0 ? 0 : 2;
  return (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// "$1,499" / "1499" / "1,499.50" → cents. Returns null when unparseable.
export function parseMoney(input: string): number | null {
  const s = input.replace(/[$,\s]/g, '');
  if (!s || !/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

export const pct = (n: number | null | undefined, digits = 1) =>
  n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(digits)}%`;

export const ratio = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);

export function fmtDate(d: Date | null | undefined, withTime = false) {
  if (!d) return '—';
  return d.toLocaleString('en-US', {
    timeZone: APP_TZ,
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

export function ago(d: Date | null | undefined) {
  if (!d) return '—';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const STAGE_LABEL: Record<Stage, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  proposal: 'Proposal sent',
  won: 'Won',
  lost: 'Lost',
};

export const STAGE_CLASS: Record<Stage, string> = {
  new: 'bg-sky-100 text-sky-800',
  contacted: 'bg-amber-100 text-amber-800',
  interested: 'bg-emerald-100 text-emerald-800',
  proposal: 'bg-violet-100 text-violet-800',
  won: 'bg-green-600 text-white',
  lost: 'bg-zinc-200 text-zinc-600',
};

export const OUTCOME_LABEL: Record<Outcome, string> = {
  connected: 'Answered',
  no_answer: 'No answer',
  voicemail: 'Voicemail',
  gatekeeper: 'Gatekeeper',
  not_interested: 'Not interested',
  callback: 'Call back',
  interested: 'Interested',
  appointment: 'Appointment set',
  sold: 'Sold!',
};

export const OUTCOME_CLASS: Record<Outcome, string> = {
  connected: 'bg-sky-100 text-sky-800',
  no_answer: 'bg-zinc-100 text-zinc-600',
  voicemail: 'bg-zinc-100 text-zinc-600',
  gatekeeper: 'bg-zinc-100 text-zinc-700',
  not_interested: 'bg-red-100 text-red-700',
  callback: 'bg-amber-100 text-amber-800',
  interested: 'bg-emerald-100 text-emerald-800',
  appointment: 'bg-teal-100 text-teal-800',
  sold: 'bg-green-600 text-white',
};

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  pending: 'Awaiting 1st payment',
  active: 'Active',
  cancelled: 'Cancelled',
};

export const SALE_STATUS_CLASS: Record<SaleStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-green-100 text-green-800',
  cancelled: 'bg-zinc-200 text-zinc-600',
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Waiting for owner',
  accepted: 'Accepted — in progress',
  partial: 'Partly delivered',
  fulfilled: 'Delivered',
  denied: 'Declined',
};

export const REQUEST_STATUS_CLASS: Record<RequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-sky-100 text-sky-800',
  partial: 'bg-violet-100 text-violet-800',
  fulfilled: 'bg-green-100 text-green-800',
  denied: 'bg-zinc-200 text-zinc-600',
};

// Where a call outcome moves the lead (only ever forward, except "not interested").
export const OUTCOME_STAGE: Partial<Record<Outcome, Stage>> = {
  connected: 'contacted',
  no_answer: 'contacted',
  voicemail: 'contacted',
  gatekeeper: 'contacted',
  callback: 'contacted',
  interested: 'interested',
  appointment: 'interested',
  not_interested: 'lost',
};

// The stage a call moves a lead to, or null to leave it. Calls only move a lead forward;
// "not interested" closes it unless it's already won.
export function stageAfterCall(current: Stage, outcome: Outcome): Stage | null {
  const next = OUTCOME_STAGE[outcome];
  if (!next || current === 'won') return null;
  return next === 'lost' || stageIndex(next) > stageIndex(current) ? next : null;
}

// 125 → "2:05", 3725 → "1:02:05".
export function duration(seconds: number | null | undefined) {
  const s = Math.max(0, Math.round(seconds ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// "3h 20m" / "45m" for talk-time totals.
export function hoursMinutes(seconds: number) {
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

export const isStage = (s: unknown): s is Stage => STAGES.includes(s as Stage);
export const isOutcome = (s: unknown): s is Outcome => OUTCOMES.includes(s as Outcome);
export const stageIndex = (s: Stage) => STAGES.indexOf(s);

// A follow-up counts as due when it falls within the next 24 hours (or is overdue).
export const dueCutoff = () => new Date(Date.now() + 86400_000);
