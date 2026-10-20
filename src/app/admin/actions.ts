'use server';

import { and, asc, eq, ilike, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb } from '@/db';
import { leadRequests, leads, packages, payments, sales, users } from '@/db/schema';
import { monthKey, monthLabel, recordPayment } from '@/lib/billing';
import { findUserByName, requireAdmin, revokeSessions } from '@/lib/auth';
import { generateKey, hashKey } from '@/lib/auth-key';
import { cents, id, int, optStr, str } from '@/lib/form';

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

const HEADER_ALIASES: Record<string, string> = {
  business: 'business', company: 'business', 'business name': 'business', name: 'business',
  contact: 'contactName', 'contact name': 'contactName', owner: 'contactName',
  phone: 'phone', 'phone number': 'phone', tel: 'phone',
  email: 'email', 'e-mail': 'email',
  website: 'website', url: 'website', site: 'website',
  city: 'city', location: 'city', area: 'city',
  niche: 'niche', category: 'niche', industry: 'niche', type: 'niche',
};
const DEFAULT_COLUMNS = ['business', 'contactName', 'phone', 'email', 'city', 'niche', 'website'];

function parseLine(line: string, sep: string) {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

// Paste from a spreadsheet (tabs) or a CSV. A header row is detected; otherwise columns are
// business, contact, phone, email, city, niche, website.
export async function importLeads(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const lines = str(f, 'csv', 2_000_000).split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { error: 'Paste some rows first.' };
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const first = parseLine(lines[0], sep).map((h) => HEADER_ALIASES[h.toLowerCase()]);
  const hasHeader = first.filter(Boolean).length >= 2;
  const columns = hasHeader ? first : DEFAULT_COLUMNS;
  const repId = id(f, 'repId');
  const niche = optStr(f, 'niche', 80);
  const city = optStr(f, 'city', 80);

  const rows = (hasHeader ? lines.slice(1) : lines)
    .map((line) => {
      const cells = parseLine(line, sep);
      const r: Record<string, string> = {};
      columns.forEach((c, i) => {
        if (c && cells[i]) r[c] = cells[i].slice(0, 200);
      });
      return r;
    })
    .filter((r) => r.business);
  if (!rows.length) return { error: 'No rows had a business name.' };
  if (rows.length > 5000) return { error: 'Import at most 5,000 leads at a time.' };

  const db = await getDb();
  const now = new Date();
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(leads).values(
      rows.slice(i, i + 500).map((r) => ({
        business: r.business,
        contactName: r.contactName || null,
        phone: r.phone || null,
        email: r.email || null,
        website: r.website || null,
        city: r.city || city,
        niche: r.niche || niche,
        source: 'import' as const,
        repId,
        assignedAt: repId ? now : null,
      })),
    );
  }
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

// Hand out the oldest unassigned leads that match the request's niche/area.
export async function fulfillRequest(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  const [req] = await db.select().from(leadRequests).where(eq(leadRequests.id, id(f) ?? 0));
  if (!req || !['pending', 'partial'].includes(req.status)) return { error: 'Request not found or already closed.' };
  const want = Math.max(1, Math.min(int(f, 'count', req.quantity - req.deliveredCount), 500));
  const matchOnly = f.get('match') === 'on';

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
  await db
    .update(leadRequests)
    .set({
      deliveredCount: delivered,
      status: delivered >= req.quantity ? 'fulfilled' : 'partial',
      adminNote: optStr(f, 'note', 500) ?? req.adminNote,
      resolvedAt: delivered >= req.quantity ? new Date() : null,
    })
    .where(eq(leadRequests.id, req.id));
  refresh();
  // The request leaves the open list once filled, so confirm on the page itself.
  redirect(`/admin/requests?assigned=${pool.length}&to=${req.repId}`);
}

export async function closeRequest(f: FormData) {
  await requireAdmin();
  const db = await getDb();
  await db
    .update(leadRequests)
    .set({ status: str(f, 'as') === 'fulfilled' ? 'fulfilled' : 'denied', adminNote: optStr(f, 'note', 500), resolvedAt: new Date() })
    .where(eq(leadRequests.id, id(f) ?? 0));
  refresh();
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
