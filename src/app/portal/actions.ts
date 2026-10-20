'use server';

import { and, count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb } from '@/db';
import { calls, leadRequests, leads, packages, sales, SALE_STATUSES, users, type SaleStatus } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { hashKey, isValidKey, KEY_RULE, normalizeKey } from '@/lib/auth-key';
import { isOutcome, isStage, OUTCOME_STAGE, stageIndex } from '@/lib/format';
import { cents, date, id, int, optStr, str } from '@/lib/form';

export type ActionState = { ok?: string; error?: string } | null;

async function ownLead(leadId: number, repId: number) {
  const db = await getDb();
  const [lead] = await db.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.repId, repId)));
  return lead ?? null;
}

const refresh = () => revalidatePath('/portal', 'layout');

export async function logCall(_prev: ActionState, f: FormData): Promise<ActionState> {
  const user = await requireUser();
  const outcome = str(f, 'outcome');
  if (!isOutcome(outcome)) return { error: 'Pick how the call went.' };
  const leadId = id(f, 'leadId');
  const lead = leadId ? await ownLead(leadId, user.id) : null;
  if (leadId && !lead) return { error: 'That lead is not assigned to you.' };

  const db = await getDb();
  await db.insert(calls).values({
    repId: user.id,
    leadId: lead?.id ?? null,
    outcome,
    minutes: Math.max(0, Math.min(600, int(f, 'minutes'))),
    notes: optStr(f, 'notes', 2000),
  });

  if (lead) {
    const next = OUTCOME_STAGE[outcome];
    const set: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
    // Calls only move a lead forward; "not interested" closes it unless it's already won.
    if (next && lead.stage !== 'won' && (next === 'lost' || stageIndex(next) > stageIndex(lead.stage))) set.stage = next;
    const followUp = date(f, 'followUp');
    if (followUp) set.nextFollowUpAt = followUp;
    else if (next === 'lost') set.nextFollowUpAt = null;
    await db.update(leads).set(set).where(eq(leads.id, lead.id));
  }
  refresh();
  return { ok: outcome === 'sold' ? 'Nice! Now record the sale so it counts toward your revenue.' : 'Call logged.' };
}

export async function deleteCall(f: FormData) {
  const user = await requireUser();
  const callId = id(f);
  if (!callId) return;
  const db = await getDb();
  await db.delete(calls).where(and(eq(calls.id, callId), eq(calls.repId, user.id)));
  refresh();
}

export async function addLead(_prev: ActionState, f: FormData): Promise<ActionState> {
  const user = await requireUser();
  const business = str(f, 'business', 200);
  if (!business) return { error: 'Business name is required.' };
  const db = await getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      business,
      contactName: optStr(f, 'contactName', 120),
      phone: optStr(f, 'phone', 40),
      email: optStr(f, 'email', 200),
      website: optStr(f, 'website', 200),
      city: optStr(f, 'city', 80),
      niche: optStr(f, 'niche', 80),
      notes: optStr(f, 'notes', 2000),
      source: 'rep',
      repId: user.id,
      assignedAt: new Date(),
    })
    .returning({ id: leads.id });
  refresh();
  redirect(`/portal/leads/${lead.id}`);
}

export async function updateLead(_prev: ActionState, f: FormData): Promise<ActionState> {
  const user = await requireUser();
  const lead = await ownLead(id(f) ?? 0, user.id);
  if (!lead) return { error: 'Lead not found.' };
  const stage = str(f, 'stage');
  const db = await getDb();
  await db
    .update(leads)
    .set({
      business: str(f, 'business', 200) || lead.business,
      contactName: optStr(f, 'contactName', 120),
      phone: optStr(f, 'phone', 40),
      email: optStr(f, 'email', 200),
      website: optStr(f, 'website', 200),
      city: optStr(f, 'city', 80),
      niche: optStr(f, 'niche', 80),
      notes: optStr(f, 'notes', 5000),
      stage: isStage(stage) ? stage : lead.stage,
      nextFollowUpAt: date(f, 'followUp'),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, lead.id));
  refresh();
  return { ok: 'Saved.' };
}

export async function recordSale(_prev: ActionState, f: FormData): Promise<ActionState> {
  const user = await requireUser();
  const db = await getDb();
  const leadId = id(f, 'leadId');
  const lead = leadId ? await ownLead(leadId, user.id) : null;
  if (leadId && !lead) return { error: 'That lead is not assigned to you.' };

  const [pkg] = (id(f, 'packageId') && (await db.select().from(packages).where(eq(packages.id, id(f, 'packageId')!)))) || [];
  const clientName = str(f, 'clientName', 200) || lead?.business || '';
  if (!clientName) return { error: 'Client name is required.' };

  const priceCents = cents(f, 'price') ?? pkg?.priceCents;
  if (priceCents == null || priceCents <= 0) return { error: 'Enter the sale price (e.g. 2499).' };
  const monthlyCents = cents(f, 'monthly') ?? pkg?.monthlyCents ?? 0;
  const status = str(f, 'status') as SaleStatus;
  const collectedCents =
    status === 'paid' ? priceCents : Math.min(priceCents, cents(f, 'collected') ?? 0);

  await db.insert(sales).values({
    repId: user.id,
    leadId: lead?.id ?? null,
    packageId: pkg?.id ?? null,
    clientName,
    packageName: pkg?.name ?? (str(f, 'customName', 80) || 'Custom website'),
    priceCents,
    monthlyCents,
    buildCostCents: pkg?.buildCostCents ?? 0,
    commissionPct: user.commissionPct,
    commissionCents: Math.round((priceCents * user.commissionPct) / 100),
    collectedCents,
    status: SALE_STATUSES.includes(status) && status !== 'refunded' ? status : 'unpaid',
    notes: optStr(f, 'notes', 2000),
  });
  if (lead) await db.update(leads).set({ stage: 'won', nextFollowUpAt: null, updatedAt: new Date() }).where(eq(leads.id, lead.id));
  refresh();
  redirect('/portal/sales?added=1');
}

export async function requestLeads(_prev: ActionState, f: FormData): Promise<ActionState> {
  const user = await requireUser();
  const quantity = int(f, 'quantity');
  if (quantity < 1 || quantity > 500) return { error: 'Request between 1 and 500 leads.' };
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(leadRequests)
    .where(and(eq(leadRequests.repId, user.id), eq(leadRequests.status, 'pending')));
  if (n >= 3) return { error: 'You already have 3 open requests — wait for one to be filled.' };
  await db.insert(leadRequests).values({
    repId: user.id,
    quantity,
    niche: optStr(f, 'niche', 120),
    area: optStr(f, 'area', 120),
    urgency: str(f, 'urgency') === 'urgent' ? 'urgent' : 'normal',
    notes: optStr(f, 'notes', 1000),
  });
  refresh();
  revalidatePath('/admin', 'layout');
  return { ok: 'Request sent — you’ll see new leads in “My leads” once it’s filled.' };
}

export async function cancelRequest(f: FormData) {
  const user = await requireUser();
  const db = await getDb();
  await db
    .delete(leadRequests)
    .where(and(eq(leadRequests.id, id(f) ?? 0), eq(leadRequests.repId, user.id), eq(leadRequests.status, 'pending')));
  refresh();
}

export async function updateProfile(_prev: ActionState, f: FormData): Promise<ActionState> {
  const user = await requireUser();
  const db = await getDb();
  const set: Partial<typeof users.$inferInsert> = { phone: optStr(f, 'phone', 40), email: optStr(f, 'email', 200) };
  const newKey = normalizeKey(str(f, 'newKey', 30));
  if (newKey) {
    if (!isValidKey(newKey)) return { error: `Key must be ${KEY_RULE}.` };
    set.keyHash = await hashKey(newKey);
  }
  await db.update(users).set(set).where(eq(users.id, user.id));
  refresh();
  return { ok: newKey ? 'Saved. Use your new key next time you sign in.' : 'Saved.' };
}
