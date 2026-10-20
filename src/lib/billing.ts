import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { payments, sales, type Sale } from '@/db/schema';
import { APP_TZ } from './brand';

// '2026-10-01' for any moment in October (business time zone).
export function monthKey(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ, year: 'numeric', month: '2-digit' }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-01`;
}

export const monthLabel = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const commissionOn = (sale: Pick<Sale, 'commissionPct'>, amountCents: number) => Math.round((amountCents * sale.commissionPct) / 100);

// Records one payment (a month's fee or the setup fee). Returns false if that month is already recorded.
export async function recordPayment(
  sale: Sale,
  opts: { forMonth?: string; kind?: 'monthly' | 'setup'; amountCents?: number; paidAt?: Date } = {},
) {
  const kind = opts.kind ?? 'monthly';
  const amountCents = opts.amountCents ?? (kind === 'setup' ? sale.priceCents : sale.monthlyCents);
  if (amountCents <= 0) return false;
  const db = await getDb();
  const [row] = await db
    .insert(payments)
    .values({
      saleId: sale.id,
      repId: sale.repId,
      amountCents,
      commissionCents: commissionOn(sale, amountCents),
      forMonth: opts.forMonth ?? monthKey(opts.paidAt),
      kind,
      paidAt: opts.paidAt ?? new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: payments.id });
  if (row && sale.status === 'pending') await db.update(sales).set({ status: 'active' }).where(eq(sales.id, sale.id));
  return !!row;
}
