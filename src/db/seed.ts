import { count } from 'drizzle-orm';
import type { DB } from '.';
import { packages } from './schema';

// Starter catalog on an empty database. Edit prices on /admin/packages.
export async function seedPackages(db: DB) {
  const [{ n }] = await db.select({ n: count() }).from(packages);
  if (n > 0) return;
  await db.insert(packages).values([
    {
      name: 'Starter',
      tagline: 'A clean, fast site to get you found.',
      priceCents: 99_900,
      monthlyCents: 4_900,
      buildCostCents: 15_000,
      sort: 1,
      features: ['Up to 5 pages', 'Mobile-friendly design', 'Contact form', 'Google Maps & business profile setup', 'Hosting & SSL included'],
    },
    {
      name: 'Business',
      tagline: 'Everything a local business needs to win customers online.',
      priceCents: 249_900,
      monthlyCents: 9_900,
      buildCostCents: 40_000,
      featured: true,
      sort: 2,
      features: ['Up to 12 pages', 'Custom design & copywriting', 'Online booking or quote requests', 'Local SEO setup', 'Reviews widget', 'Monthly updates included'],
    },
    {
      name: 'Premium',
      tagline: 'Online store or advanced features, done for you.',
      priceCents: 499_900,
      monthlyCents: 19_900,
      buildCostCents: 90_000,
      sort: 3,
      features: ['Unlimited pages', 'E-commerce or custom features', 'Payments & integrations', 'Advanced SEO & analytics', 'Priority support', 'Quarterly strategy call'],
    },
  ]);
}
