import { randomBytes } from 'node:crypto';
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { calls, dialerEvents, leads, settings, users, type Outcome } from '@/db/schema';
import { stageAfterCall } from './format';

// Dialerr (https://dialerr.com/llms.txt) feeds the call stats from three places:
//  1. the dialer panel in the portal/admin reports each call as it connects and ends (we know the signed-in rep);
//  2. with an org API token, each call is filled in from the Data API (duration, direction, disposition, recording);
//  3. the org's event webhook sends dispositions and every text, sent or received.
const API = 'https://api.dialerr.com';

// ---------- Settings ----------

export const SETTING = {
  apiToken: 'dialerr.api_token',
  webhookSecret: 'dialerr.webhook_secret',
  lastWebhookAt: 'dialerr.last_webhook_at',
} as const;

export async function getSetting(key: string) {
  const db = await getDb();
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key));
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string | null) {
  const db = await getDb();
  if (value == null) {
    await db.delete(settings).where(eq(settings.key, key));
    return;
  }
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export async function apiToken() {
  return (await getSetting(SETTING.apiToken)) ?? process.env.DIALERR_API_TOKEN ?? null;
}

// Made on first use; the owner pastes it into Dialerr next to the webhook URL.
export async function webhookSecret() {
  const existing = await getSetting(SETTING.webhookSecret);
  if (existing) return existing;
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key: SETTING.webhookSecret, value: randomBytes(24).toString('hex') })
    .onConflictDoNothing();
  return (await getSetting(SETTING.webhookSecret))!;
}

// ---------- Data API ----------

export type ApiCall = {
  id: string;
  state?: 'ringing' | 'connected' | 'ended' | 'no_answer' | 'failed';
  direction?: 'inbound' | 'outbound';
  to?: string;
  from?: string;
  agent?: { id: number; name: string; email: string } | null;
  lead?: { id: number; name: string | null } | null;
  started_at?: string;
  answered_at?: string | null;
  duration_seconds?: number;
  recording_url?: string | null;
  disposition?: string | null;
  disposition_notes?: string | null;
  ai_summary?: string | null;
};

export async function dialerrApi(path: string, token?: string | null) {
  token ??= await apiToken();
  if (!token) return null;
  return fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
}

export async function fetchCall(id: string): Promise<ApiCall | null> {
  const r = await dialerrApi(`/api/v1/calls/${encodeURIComponent(id)}`).catch(() => null);
  return r?.ok ? ((await r.json()) as ApiCall) : null;
}

// Recordings are fetched with the API token, so only ever send it to Dialerr itself.
export function isDialerrUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'dialerr.com' || u.hostname.endsWith('.dialerr.com'));
  } catch {
    return false;
  }
}

// ---------- Matching ----------

export const last10 = (phone: string | null | undefined) => (phone ?? '').replace(/\D/g, '').slice(-10);

const phoneMatches = (digits: string) => sql`right(regexp_replace(coalesce(${leads.phone}, ''), '\\D', '', 'g'), 10) = ${digits}`;

export async function repByDialerrEmail(email: string | null | undefined) {
  if (!email) return null;
  const db = await getDb();
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.dialerrEmail}) = ${email.trim().toLowerCase()}`);
  return u?.id ?? null;
}

// The rep who owns the lead with this number (for texts, which don't say which rep sent them).
export async function repForPhone(phone: string | null | undefined) {
  const digits = last10(phone);
  if (digits.length < 7) return null;
  const db = await getDb();
  const [l] = await db
    .select({ repId: leads.repId })
    .from(leads)
    .where(and(isNotNull(leads.repId), phoneMatches(digits)))
    .orderBy(desc(leads.updatedAt))
    .limit(1);
  return l?.repId ?? null;
}

// Map a Dialerr disposition ("Appointment set", "Not interested", …) onto our call outcomes.
const DISPOSITIONS: [RegExp, Outcome][] = [
  [/\b(sold|closed|sale|signed|won)\b/, 'sold'],
  [/appoint|meeting|demo|booked|scheduled/, 'appointment'],
  [/not interested|no interest|\bdnc\b|do not call|wrong number|bad number/, 'not_interested'],
  [/call ?back|follow ?up|later/, 'callback'],
  [/interest|\bhot\b|\bwarm\b/, 'interested'],
  [/voice ?mail|\bvm\b|left (a )?message/, 'voicemail'],
  [/gate ?keeper|receptionist/, 'gatekeeper'],
  [/no answer|busy|unreachable|disconnected/, 'no_answer'],
];

export function outcomeFromDisposition(name: string | null | undefined): Outcome | null {
  const d = (name ?? '').toLowerCase();
  if (!d) return null;
  return DISPOSITIONS.find(([re]) => re.test(d))?.[1] ?? null;
}

// ---------- Recording ----------

export type DialerrCall = {
  dialerrId: string | null;
  repId?: number | null; // needed only for a call we haven't seen yet
  connected?: boolean;
  phone?: string | null;
  name?: string | null;
  seconds?: number | null;
  direction?: 'inbound' | 'outbound' | null;
  disposition?: string | null;
  notes?: string | null;
  recordingUrl?: string | null;
  aiSummary?: string | null;
  at?: Date | null;
};

// Outcomes we picked automatically; once a rep (or a disposition) says how it went, we leave it alone.
const AUTO: Outcome[] = ['connected', 'no_answer'];

// Create or fill in the call row for a Dialerr call. Safe to call repeatedly with partial details.
export async function recordDialerrCall(c: DialerrCall, retry = true): Promise<number | null> {
  const db = await getDb();
  const [existing] = c.dialerrId ? await db.select().from(calls).where(eq(calls.dialerrId, c.dialerrId)) : [];
  const fromDisposition = outcomeFromDisposition(c.disposition);
  const seconds = c.seconds != null && Number.isFinite(c.seconds) ? Math.max(0, Math.min(36_000, Math.round(c.seconds))) : null;

  if (existing) {
    const set: Partial<typeof calls.$inferInsert> = {};
    if (seconds != null && seconds > (existing.seconds ?? 0)) Object.assign(set, { seconds, minutes: Math.round(seconds / 60) });
    if (c.phone && !existing.phone) set.phone = c.phone;
    if (c.name && !existing.contactName) set.contactName = c.name;
    if (c.direction) set.direction = c.direction;
    if (c.disposition) set.disposition = c.disposition;
    if (c.notes && !existing.notes) set.notes = c.notes;
    if (c.recordingUrl) set.recordingUrl = c.recordingUrl;
    if (c.aiSummary) set.aiSummary = c.aiSummary;
    if (AUTO.includes(existing.outcome)) {
      const outcome = fromDisposition ?? (c.connected || existing.outcome === 'connected' ? 'connected' : 'no_answer');
      if (outcome !== existing.outcome) set.outcome = outcome;
    }
    if (Object.keys(set).length) await db.update(calls).set(set).where(eq(calls.id, existing.id));
    if (set.outcome && existing.leadId) await advanceLead(existing.leadId, existing.repId, set.outcome);
    return existing.id;
  }

  if (!c.repId) return null;
  const digits = last10(c.phone);
  const [lead] =
    digits.length >= 7
      ? await db
          .select({ id: leads.id })
          .from(leads)
          .where(and(eq(leads.repId, c.repId), phoneMatches(digits)))
          .orderBy(desc(leads.updatedAt))
          .limit(1)
      : [];
  const outcome = fromDisposition ?? (c.connected ? 'connected' : 'no_answer');
  const [row] = await db
    .insert(calls)
    .values({
      repId: c.repId,
      leadId: lead?.id ?? null,
      outcome,
      minutes: seconds ? Math.round(seconds / 60) : 0,
      notes: c.notes ?? null,
      at: c.at ?? new Date(),
      source: 'dialerr',
      dialerrId: c.dialerrId,
      direction: c.direction ?? null,
      phone: c.phone ?? null,
      contactName: c.name ?? null,
      seconds,
      disposition: c.disposition ?? null,
      recordingUrl: c.recordingUrl ?? null,
      aiSummary: c.aiSummary ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: calls.id });
  // Lost a race with another report of the same call: fill that row in instead.
  if (!row) return retry ? recordDialerrCall(c, false) : null;
  if (lead) await advanceLead(lead.id, c.repId, outcome);
  return row.id;
}

async function advanceLead(leadId: number, repId: number, outcome: Outcome) {
  const db = await getDb();
  const [lead] = await db.select({ stage: leads.stage }).from(leads).where(and(eq(leads.id, leadId), eq(leads.repId, repId)));
  const next = lead && stageAfterCall(lead.stage, outcome);
  if (next) await db.update(leads).set({ stage: next, updatedAt: new Date() }).where(eq(leads.id, leadId));
}

// Fill a call in from the Data API (no-op without a token). fallbackRepId attributes a call
// whose Dialerr agent isn't linked to anyone here.
export async function syncCall(dialerrId: string, fallbackRepId?: number | null, extra: Partial<DialerrCall> = {}) {
  const api = await fetchCall(dialerrId);
  if (!api) return extra.disposition ? recordDialerrCall({ dialerrId, repId: fallbackRepId, ...extra }) : null;
  const repId = (await repByDialerrEmail(api.agent?.email)) ?? fallbackRepId ?? null;
  const inbound = api.direction === 'inbound';
  return recordDialerrCall({
    dialerrId,
    repId,
    connected: !!api.answered_at || api.state === 'connected' || api.state === 'ended',
    phone: inbound ? api.from : api.to,
    name: api.lead?.name,
    seconds: api.duration_seconds,
    direction: api.direction,
    disposition: api.disposition,
    notes: api.disposition_notes,
    recordingUrl: api.recording_url,
    aiSummary: api.ai_summary,
    at: api.started_at ? new Date(api.started_at) : null,
    ...extra,
  });
}

export async function recordDialerEvent(e: typeof dialerEvents.$inferInsert) {
  const db = await getDb();
  await db.insert(dialerEvents).values(e).onConflictDoNothing();
}

// ---------- Feeds ----------

// Latest Dialerr calls, newest first (one rep, or everyone).
export async function recentDialerrCalls(limit: number, repId?: number, onlyUntagged = false) {
  const db = await getDb();
  return db
    .select({
      id: calls.id,
      at: calls.at,
      outcome: calls.outcome,
      direction: calls.direction,
      phone: calls.phone,
      contactName: calls.contactName,
      seconds: calls.seconds,
      disposition: calls.disposition,
      notes: calls.notes,
      recordingUrl: calls.recordingUrl,
      aiSummary: calls.aiSummary,
      repId: calls.repId,
      repName: users.name,
      leadId: calls.leadId,
      business: leads.business,
    })
    .from(calls)
    .innerJoin(users, eq(users.id, calls.repId))
    .leftJoin(leads, eq(leads.id, calls.leadId))
    .where(and(eq(calls.source, 'dialerr'), repId ? eq(calls.repId, repId) : undefined, onlyUntagged ? eq(calls.outcome, 'connected') : undefined))
    .orderBy(desc(calls.at))
    .limit(limit);
}
export type FeedCall = Awaited<ReturnType<typeof recentDialerrCalls>>[number];

export async function recentTexts(limit: number, repId?: number) {
  const db = await getDb();
  return db
    .select({
      id: dialerEvents.id,
      kind: dialerEvents.kind,
      phone: dialerEvents.phone,
      name: dialerEvents.name,
      body: dialerEvents.body,
      url: dialerEvents.url,
      seconds: dialerEvents.seconds,
      at: dialerEvents.at,
      repName: users.name,
    })
    .from(dialerEvents)
    .leftJoin(users, eq(users.id, dialerEvents.repId))
    .where(repId ? eq(dialerEvents.repId, repId) : undefined)
    .orderBy(desc(dialerEvents.at))
    .limit(limit);
}
