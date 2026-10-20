'use server';

import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { leads, users } from '@/db/schema';

export type QuoteState = { ok: true } | { error: string } | null;

const field = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max) || null;

// Public quote request → a lead. A rep's referral link (?ref=<id>) assigns it to them.
export async function requestQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  if (field(formData, 'company_fax')) return { ok: true }; // honeypot: bots fill every field
  const business = field(formData, 'business');
  const contactName = field(formData, 'name');
  const phone = field(formData, 'phone', 40);
  const email = field(formData, 'email');
  if (!business || !contactName) return { error: 'Please add your name and business name.' };
  if (!phone && !email) return { error: 'Please add a phone number or email so we can reach you.' };

  const db = await getDb();
  const refId = Number(field(formData, 'ref', 12));
  const [rep] = Number.isInteger(refId) && refId > 0
    ? await db.select({ id: users.id }).from(users).where(and(eq(users.id, refId), eq(users.active, true)))
    : [];

  const pkg = field(formData, 'package', 40);
  const message = [pkg && `Interested in: ${pkg}`, field(formData, 'message', 2000)].filter(Boolean).join('\n\n') || null;
  await db.insert(leads).values({
    business,
    contactName,
    phone,
    email,
    website: field(formData, 'website'),
    city: field(formData, 'city', 80),
    niche: field(formData, 'niche', 80),
    message,
    source: rep ? 'referral' : 'website',
    repId: rep?.id ?? null,
    assignedAt: rep ? new Date() : null,
  });
  return { ok: true };
}
