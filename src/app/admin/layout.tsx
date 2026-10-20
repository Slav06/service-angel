import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { AppShell } from '@/components/app-shell';
import { getDb } from '@/db';
import { leadRequests, leads } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';

export const metadata = { title: 'Owner admin', robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const user = await requireAdmin();
  const db = await getDb();
  const [[{ n: pending }], [{ n: inbound }]] = await Promise.all([
    db.select({ n: count() }).from(leadRequests).where(inArray(leadRequests.status, ['pending', 'partial'])),
    db.select({ n: count() }).from(leads).where(and(isNull(leads.repId), eq(leads.source, 'website'))),
  ]);
  return (
    <AppShell
      user={user}
      nav={[
        { href: '/admin', label: 'Company overview' },
        { href: '/admin/reps', label: 'Sales reps' },
        { href: '/admin/requests', label: 'Lead requests', badge: pending },
        { href: '/admin/leads', label: 'Leads', badge: inbound },
        { href: '/admin/sales', label: 'Clients & payouts' },
        { href: '/admin/leaderboard', label: 'Leaderboard' },
        { href: '/admin/packages', label: 'Packages & pricing' },
      ]}
      switchTo={{ href: '/portal', label: 'My rep portal' }}
    >
      {children}
    </AppShell>
  );
}
