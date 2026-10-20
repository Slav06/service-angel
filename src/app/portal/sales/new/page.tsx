import { and, asc, eq, ne } from 'drizzle-orm';
import { SaleForm } from '@/components/sale-form';
import { PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { leads, packages } from '@/db/schema';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function NewSale({ searchParams }: PageProps<'/portal/sales/new'>) {
  const user = await requireUser();
  const { lead } = await searchParams;
  const db = await getDb();
  const [pkgs, myLeads] = await Promise.all([
    db
      .select({ id: packages.id, name: packages.name, priceCents: packages.priceCents, monthlyCents: packages.monthlyCents })
      .from(packages)
      .where(eq(packages.active, true))
      .orderBy(asc(packages.sort)),
    db
      .select({ id: leads.id, business: leads.business })
      .from(leads)
      .where(and(eq(leads.repId, user.id), ne(leads.stage, 'won')))
      .orderBy(asc(leads.business)),
  ]);
  return (
    <>
      <PageHeader title="Record a sale" sub="Closed a deal? Log it so it counts toward your revenue and commission." />
      <SaleForm packages={pkgs} leads={myLeads} leadId={Number(lead) || undefined} commissionPct={user.commissionPct} />
    </>
  );
}
