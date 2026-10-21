'use server';

import { and, asc, eq, ilike, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '@/db';
import { leadRequests, leads, packages, payments, sales, users } from '@/db/schema';
import { monthKey, monthLabel, recordPayment } from '@/lib/billing';
import { dialerrApi, setSetting, SETTING } from '@/lib/dialerr';
import { DEFAULT_COUNTRIES, FINDER, kickFinder, queueFinder, saveFinderKey, testOutscraperKey } from '@/lib/lead-finder';
import { origin } from '@/lib/origin';
import { notify } from '@/lib/notify';
import { addMessage, describeRequest, isCsvLike, readUpload, requestHref } from '@/lib/requests';
import { findUserByName, requireAdmin, revokeSessions } from '@/lib/auth';
import { generateKey, hashKey } from '@/lib/auth-key';
import { cents, id, int, optStr, str } from '@/lib/form';
import { insertLeads, MAX_IMPORT, parseLeadTable } from '@/lib/leads-import';

export type ActionState = { ok?: string; error?: string } | null;

const refresh = () => {
  revalidatePath('/admin', 'layout');
  revalidatePath('/portal', 'layout');
};

// ---------- Reps ----------

export async function createRep(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = str(f, 'name', 40).replace(/\s+/g, ' ');
  if (name.length < 2) return { error: 'Name must be at least 2 characters.' };
  if (await findUserByName(name)) return { error: 'Someone already has that name.' };
  const key = generateKey();
  const db = await getDb();
  await db.insert(users).values({
    name,
    role: str(f, 'role') === 'admin' ? 'admin' : 'rep',
    keyHash: await hashKey(key),
    commissionPct: clampPct(Number(str(f, 'commissionPct')) || 20),
    monthlyGoalCents: cents(f, 'monthlyGoal') ?? 1_000_000,
    dailyCallGoal: int(f, 'dailyCallGoal', 60) || 60,
  });
  refresh();
  return { ok: `Created ${name}. Their key is “${key}”. Send them: ${loginLink(f, name, key)}` };
}

export async function updateRep(_prev: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const repId = id(f);
  if (!repId) return { error: 'Missing rep.' };
  const active = f.get('active') === 'on';
  const role = str(f, 'role') === 'admin' ? 'admin' : 'rep';
  if (repId === admin.id && (!active || role !== 'admin')) return { error: 'You can’t remove your own admin access.' };
  const db = await getDb();
  await db
    .update(users)
    .set({
      commissionPct: clampPct(Number(str(f, 'commissionPct'))),
      monthlyGoalCents: cents(f, 'monthlyGoal') ?? 0,
      dailyCallGoal: Math.max(0, int(f, 'dailyCallGoal')),
      role,
      active,
    })
    .where(eq(users.id, repId));
  if (!active) await revokeSessions(repId);
  refresh();
  return { ok: 'Saved. New commission % applies to sales logged from now on.' };
}

export async function resetKey(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const repId = id(f);
  const db = await getDb();
  const [rep] = repId ? await db.select().from(users).where(eq(users.id, repId)) : [];
  if (!rep) return { error: 'Rep not found.' };
  const key = generateKey();
  await db.update(users).set({ keyHash: await hashKey(key) }).where(eq(users.id, rep.id));
  await revokeSessions(rep.id);
  return { ok: `New key: “${key}” — login link: ${loginLink(f, rep.name, key)}` };
}

function loginLink(f: FormData, name: string, key: string) {
  return `${str(f, 'origin', 200)}/auth?${new URLSearchParams({ name, key })}`;
}

const clampPct = (n: number) => (Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 100) / 100)) : 20);

// ---------- Leads ----------

// Paste from a spreadsheet (tabs) or a CSV. A header row is detected; otherwise columns are
// business, contact, phone, email, city, niche, website.
export async function importLeads(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const rows = parseLeadTable(str(f, 'csv', 2_000_000));
  if (!rows.length) return { error: 'Paste some rows with a business name first.' };
  if (rows.length > MAX_IMPORT) return { error: `Import at most ${MAX_IMPORT.toLocaleString()} leads at a time.` };
  const repId = id(f, 'repId');
  await insertLeads(rows, { repId, niche: optStr(f, 'niche', 80), city: optStr(f, 'city', 80) });
  refresh();
  return { ok: `Imported ${rows.length} lead${rows.length === 1 ? '' : 's'}${repId ? ' and assigned them' : ' into the pool'}.` };
}

export async function assignLeads(f: FormData) {
  await requireAdmin();
  const ids = f.getAll('leadIds').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) return;
  const repId = id(f, 'repId');
  const db = await getDb();
  await db
    .update(leads)
    .set({ repId, assignedAt: repId ? new Date() : null, updatedAt: new Date() })
    .where(inArray(leads.id, ids));
  refresh();
}

export async function deleteLeads(f: FormData) {
  await requireAdmin();
  const ids = f.getAll('leadIds').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) return;
  const db = await getDb();
  await db.delete(leads).where(inArray(leads.id, ids));
  refresh();
}

// ---------- Lead requests ----------

async function loadRequest(f: FormData) {
  const db = await getDb();
  const [req] = await db.select().from(leadRequests).where(eq(leadRequests.id, id(f) ?? 0));
  return req ?? null;
}

const closed = (status: string) => status === 'fulfilled' || status === 'denied';

export async function acceptRequest(f: FormData) {
  const admin = await requireAdmin();
  const req = await loadRequest(f);
  if (!req || req.status !== 'pending') return;
  const db = await getDb();
  await db.update(leadRequests).set({ status: 'accepted' }).where(eq(leadRequests.id, req.id));
  await addMessage(req.id, { authorId: admin.id, kind: 'event', body: 'Accepted the request' });
  await notify([req.repId], { title: `${admin.name} accepted your request for ${describeRequest(req)}`, body: 'Your leads are on the way.', href: requestHref('rep', req.id) });
  refresh();
}

export async function declineRequest(f: FormData) {
  const admin = await requireAdmin();
  const req = await loadRequest(f);
  if (!req || closed(req.status)) return;
  const reason = optStr(f, 'note', 500);
  const db = await getDb();
  await db.update(leadRequests).set({ status: 'denied', adminNote: reason, resolvedAt: new Date() }).where(eq(leadRequests.id, req.id));
  await addMessage(req.id, { authorId: admin.id, kind: 'event', body: 'Declined the request' });
  if (reason) await addMessage(req.id, { authorId: admin.id, body: reason });
  await notify([req.repId], { title: `Your request for ${describeRequest(req)} was declined`, body: reason, href: requestHref('rep', req.id) });
  refresh();
}

export async function markDelivered(f: FormData) {
  const admin = await requireAdmin();
  const req = await loadRequest(f);
  if (!req || closed(req.status)) return;
  const db = await getDb();
  await db.update(leadRequests).set({ status: 'fulfilled', resolvedAt: new Date() }).where(eq(leadRequests.id, req.id));
  await addMessage(req.id, { authorId: admin.id, kind: 'event', body: 'Marked the request as delivered' });
  await notify([req.repId], { title: `Your request for ${describeRequest(req)} is complete`, href: requestHref('rep', req.id) });
  refresh();
}

// A message to the rep, optionally with a document of leads. CSV files can also be loaded straight into their lead list.
export async function sendToRep(_prev: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const req = await loadRequest(f);
  if (!req) return { error: 'Request not found.' };
  const body = optStr(f, 'body', 4000);
  const upload = await readUpload(f.get('file'));
  if (upload && 'error' in upload) return { error: upload.error };
  if (!body && !upload) return { error: 'Write a message or attach a file.' };

  let imported: number | null = null;
  if (upload && f.get('import') === 'on') {
    if (!isCsvLike(upload)) return { error: 'Only CSV files can be added to their lead list. Untick that box to just send the file.' };
    const rows = parseLeadTable(upload.data.toString('utf8'));
    if (!rows.length) return { error: 'No rows with a business name were found in that CSV.' };
    if (rows.length > MAX_IMPORT) return { error: `That file has over ${MAX_IMPORT.toLocaleString()} leads — split it up.` };
    imported = await insertLeads(rows, { repId: req.repId, requestId: req.id, niche: req.niche, city: req.area });
  }

  await addMessage(req.id, { authorId: admin.id, body, file: upload ? { ...upload, importedCount: imported } : undefined });
  const delivered = req.deliveredCount + (imported ?? 0);
  const done = f.get('complete') === 'on' || delivered >= req.quantity;
  // A message alone doesn't change the status; sending leads moves it forward.
  const status = done ? 'fulfilled' : delivered ? 'partial' : upload && req.status === 'pending' ? 'accepted' : req.status;
  if (!closed(req.status)) {
    const db = await getDb();
    await db
      .update(leadRequests)
      .set({ deliveredCount: delivered, status, resolvedAt: done ? new Date() : null })
      .where(eq(leadRequests.id, req.id));
  }
  await notify([req.repId], {
    title: upload ? `${admin.name} sent you ${imported ? `${imported} leads` : upload.name}` : `New message from ${admin.name}`,
    body: body ?? (imported ? 'They’re already in My leads.' : 'Open the request to download it.'),
    href: requestHref('rep', req.id),
  });
  refresh();
  return { ok: imported ? `Sent — ${imported} leads were added to their list.` : 'Sent.' };
}

// Hand out the oldest unassigned leads that match the request's niche/area.
export async function fulfillRequest(_prev: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const req = await loadRequest(f);
  if (!req || closed(req.status)) return { error: 'Request not found or already closed.' };
  const want = Math.max(1, Math.min(int(f, 'count', req.quantity - req.deliveredCount), 500));
  const matchOnly = f.get('match') === 'on';
  const db = await getDb();

  const conds: SQL[] = [isNull(leads.repId)];
  if (matchOnly && req.niche) conds.push(ilike(leads.niche, `%${req.niche}%`));
  if (matchOnly && req.area) conds.push(ilike(leads.city, `%${req.area}%`));
  const pool = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(...conds))
    .orderBy(asc(leads.createdAt))
    .limit(want);
  if (!pool.length) return { error: matchOnly ? 'No unassigned leads match — untick “match” or import more.' : 'The lead pool is empty — import leads first.' };

  await db
    .update(leads)
    .set({ repId: req.repId, requestId: req.id, assignedAt: new Date(), updatedAt: new Date() })
    .where(and(inArray(leads.id, pool.map((p) => p.id)), isNull(leads.repId)));
  const delivered = req.deliveredCount + pool.length;
  const done = delivered >= req.quantity;
  await db
    .update(leadRequests)
    .set({ deliveredCount: delivered, status: done ? 'fulfilled' : 'partial', resolvedAt: done ? new Date() : null })
    .where(eq(leadRequests.id, req.id));
  const note = optStr(f, 'note', 500);
  await addMessage(req.id, { authorId: admin.id, kind: 'event', body: `Added ${pool.length} lead${pool.length === 1 ? '' : 's'} to your list from the lead pool` });
  if (note) await addMessage(req.id, { authorId: admin.id, body: note });
  await notify([req.repId], { title: `${admin.name} added ${pool.length} leads to your list`, body: note ?? 'Find them in My leads.', href: requestHref('rep', req.id) });
  refresh();
  return { ok: `Assigned ${pool.length} lead${pool.length === 1 ? '' : 's'} to the rep.` };
}

// ---------- Clients & payments ----------

// <input type="month"> gives '2026-10' → '2026-10-01'.
function monthField(f: FormData) {
  const v = str(f, 'month', 7);
  return /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : monthKey();
}

export async function addPayment(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  const [sale] = await db.select().from(sales).where(eq(sales.id, id(f) ?? 0));
  if (!sale) return { error: 'Client not found.' };
  const forMonth = monthField(f);
  const ok = await recordPayment(sale, { forMonth, amountCents: cents(f, 'amount') ?? undefined });
  if (!ok) return { error: `${monthLabel(forMonth)} is already recorded for ${sale.clientName}.` };
  refresh();
  return { ok: `Recorded ${monthLabel(forMonth)}.` };
}

// One click per month: every active client that hasn't paid for that month yet.
export async function addMonthForAll(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const forMonth = monthField(f);
  const db = await getDb();
  const due = await db
    .select()
    .from(sales)
    .where(
      and(
        eq(sales.status, 'active'),
        sql`not exists (select 1 from ${payments} where ${payments.saleId} = ${sales.id} and ${payments.forMonth} = ${forMonth} and ${payments.kind} = 'monthly')`,
      ),
    );
  let n = 0;
  for (const sale of due) if (await recordPayment(sale, { forMonth })) n++;
  refresh();
  return n
    ? { ok: `Recorded ${monthLabel(forMonth)} for ${n} client${n === 1 ? '' : 's'}.` }
    : { error: `Every active client already has ${monthLabel(forMonth)} recorded.` };
}

export async function deletePayment(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  await db.delete(payments).where(eq(payments.id, id(f) ?? 0));
  refresh();
}

export async function setClientStatus(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  const cancel = str(f, 'to') === 'cancelled';
  await db
    .update(sales)
    .set(cancel ? { status: 'cancelled', cancelledAt: new Date() } : { status: 'active', cancelledAt: null })
    .where(eq(sales.id, id(f) ?? 0));
  refresh();
}

export async function updateSale(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  const [sale] = await db.select().from(sales).where(eq(sales.id, id(f) ?? 0));
  if (!sale) return { error: 'Client not found.' };
  await db
    .update(sales)
    .set({
      clientName: str(f, 'clientName', 200) || sale.clientName,
      monthlyCents: cents(f, 'monthly') ?? sale.monthlyCents,
      priceCents: cents(f, 'setup') ?? sale.priceCents,
      buildCostCents: cents(f, 'buildCost') ?? sale.buildCostCents,
      commissionPct: str(f, 'commissionPct') ? clampPct(Number(str(f, 'commissionPct'))) : sale.commissionPct,
    })
    .where(eq(sales.id, sale.id));
  refresh();
  return { ok: 'Saved. Changes apply to payments recorded from now on.' };
}

export async function setCommissionPaid(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  const paid = str(f, 'paid') === '1';
  const repId = id(f, 'repId');
  const paymentId = id(f);
  // One payment, or everything owed to a rep ("pay out everything owed").
  const where = paymentId
    ? eq(payments.id, paymentId)
    : repId
      ? and(eq(payments.repId, repId), isNull(payments.commissionPaidAt))
      : undefined;
  if (!where) return;
  await db.update(payments).set({ commissionPaidAt: paid ? new Date() : null }).where(where);
  refresh();
}

export async function deleteSale(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  await db.delete(sales).where(eq(sales.id, id(f) ?? 0));
  refresh();
}

// ---------- Packages ----------

export async function savePackage(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = str(f, 'name', 60);
  const priceCents = cents(f, 'price') ?? 0;
  if (!name) return { error: 'Name is required.' };
  const values = {
    name,
    tagline: optStr(f, 'tagline', 200),
    priceCents,
    monthlyCents: cents(f, 'monthly') ?? 0,
    buildCostCents: cents(f, 'buildCost') ?? 0,
    features: str(f, 'features', 4000).split('\n').map((s) => s.trim()).filter(Boolean),
    featured: f.get('featured') === 'on',
    active: f.get('active') === 'on',
    sort: int(f, 'sort'),
  };
  const db = await getDb();
  const pkgId = id(f);
  if (pkgId) await db.update(packages).set(values).where(eq(packages.id, pkgId));
  else await db.insert(packages).values(values);
  refresh();
  revalidatePath('/');
  return { ok: 'Saved — the public pricing section is updated.' };
}

// ---------- Dialerr ----------

export async function linkDialerr(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const repId = id(f);
  if (!repId) return { error: 'Missing rep.' };
  const email = str(f, 'dialerrEmail', 200).toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'That doesn’t look like an email address.' };
  const db = await getDb();
  const [taken] = email
    ? await db.select({ name: users.name }).from(users).where(and(sql`lower(${users.dialerrEmail}) = ${email}`, sql`${users.id} <> ${repId}`))
    : [];
  if (taken) return { error: `${taken.name} is already linked to that Dialerr login.` };
  await db.update(users).set({ dialerrEmail: email }).where(eq(users.id, repId));
  refresh();
  return { ok: email ? 'Linked. Their dialer signs in as this Dialerr agent next time they open the portal.' : 'Unlinked.' };
}

export async function saveDialerrToken(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const token = str(f, 'token', 200);
  if (!/^api_[0-9a-f]{64}$/i.test(token)) return { error: 'Paste the API token that starts with “api_” (Settings → API Access → API tokens).' };
  const r = await dialerrApi('/api/v1/leads?limit=1', token).catch(() => null);
  if (!r?.ok) return { error: `Dialerr didn’t accept that token${r ? ` (${r.status})` : ''}. Check it hasn’t been revoked.` };
  await setSetting(SETTING.apiToken, token);
  refresh();
  return { ok: 'Connected. New calls now pick up their length, direction, disposition and recording from Dialerr.' };
}

export async function clearDialerrToken() {
  await requireAdmin();
  await setSetting(SETTING.apiToken, null);
  refresh();
}

// ---------- Lead finder ----------

// Hand a request to Claude (or retry one that stopped).
export async function findWithClaude(f: FormData) {
  const admin = await requireAdmin();
  const req = await loadRequest(f);
  if (!req || closed(req.status) || req.finderStatus === 'queued' || req.finderStatus === 'running') return;
  await queueFinder(req.id);
  await addMessage(req.id, { authorId: admin.id, kind: 'event', body: req.finderStatus ? 'Restarted the lead finder' : 'Asked Claude to find these leads' });
  const base = await origin();
  after(() => kickFinder(base, req.id));
  refresh();
}

export async function stopFinder(f: FormData) {
  const admin = await requireAdmin();
  const req = await loadRequest(f);
  if (!req || (req.finderStatus !== 'queued' && req.finderStatus !== 'running')) return;
  const db = await getDb();
  await db.update(leadRequests).set({ finderStatus: 'stopped' }).where(eq(leadRequests.id, req.id));
  await addMessage(req.id, { authorId: admin.id, kind: 'event', body: `Stopped the lead finder at ${req.deliveredCount} of ${req.quantity}` });
  refresh();
}

export async function saveFinderSettings(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const countries = str(f, 'countries', 200)
    .toUpperCase()
    .split(/[\s,]+/)
    .filter((c) => /^[A-Z]{2}$/.test(c));
  await Promise.all([
    setSetting(FINDER.enabled, f.get('enabled') === 'on' ? '1' : '0'),
    setSetting(FINDER.maxReviews, String(Math.max(0, Math.min(500, int(f, 'maxReviews', 15))))),
    setSetting(FINDER.maxPerRequest, String(Math.max(1, Math.min(500, int(f, 'maxPerRequest', 50))))),
    setSetting(FINDER.dailyCap, String(Math.max(1, Math.min(5000, int(f, 'dailyCap', 100))))),
    setSetting(FINDER.countries, (countries.length ? countries : DEFAULT_COUNTRIES).join(',')),
  ]);
  refresh();
  return { ok: 'Saved.' };
}

export async function saveFinderKeyAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const which = str(f, 'which') === 'outscraper' ? 'outscraperKey' : 'anthropicKey';
  const key = str(f, 'key', 300);
  if (!key) return { error: 'Paste the key first.' };
  if (which === 'anthropicKey') {
    if (!key.startsWith('sk-ant-')) return { error: 'A Claude API key starts with “sk-ant-”.' };
    const ok = await new Anthropic({ apiKey: key, maxRetries: 0 }).models
      .retrieve('claude-opus-5-5')
      .then(() => true)
      .catch(() => false);
    if (!ok) return { error: 'Anthropic didn’t accept that key. Check it was copied in full and the account has credit.' };
  } else if (!(await testOutscraperKey(key))) {
    return { error: 'Outscraper didn’t accept that key.' };
  }
  await saveFinderKey(which, key);
  refresh();
  return { ok: 'Connected.' };
}

export async function clearFinderKey(f: FormData) {
  await requireAdmin();
  await saveFinderKey(str(f, 'which') === 'outscraper' ? 'outscraperKey' : 'anthropicKey', null);
  refresh();
}
