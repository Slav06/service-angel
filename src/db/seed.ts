import { count } from 'drizzle-orm';
import type { DB } from '.';
import { packages } from './schema';

// Starter catalog on an empty database. Edit prices on /admin/packages.
export async function seedPackages(db: DB) {
  const [{ n }] = await db.select({ n: count() }).from(packages);
  if (n > 0) return;
  await db.insert(packages).values({
    name: 'Website Plan',
    tagline: 'Everything your business needs online — one simple monthly price.',
    priceCents: 0,
    monthlyCents: 50_000,
    featured: true,
    features: [
      'Custom design & copywriting',
      'Mobile-friendly, fast-loading pages',
      'Hosting, SSL security & backups included',
      'Local SEO & Google Business Profile setup',
      'Contact & quote request forms',
      'Monthly content updates',
      'A real person to call for support',
    ],
  });
}
