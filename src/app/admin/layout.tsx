import { and, count, eq, isNull } from 'drizzle-orm';
import { AppShell } from '@/components/app-shell';
import { DialerPanel } from '@/components/dialer-panel';
import { getDb } from '@/db';
import { leadRequests, leads } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { unreadCount } from '@/lib/notify';

export const metadata = { title: 'Owner admin', robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const user = await requireAdmin();
  const db = await getDb();
  const [[{ n: pending }], [{ n: inbound }]] = await Promise.all([
    db.select({ n: count() }).from(leadRequests).where(eq(leadRequests.status, 'pending')),
    db.select({ n: count() }).from(leads).where(and(isNull(leads.repId), eq(leads.source, 'website'))),
  ]);
  const unread = await unreadCount(user.id);
  return (
    <AppShell
      user={user}
      bell={{ href: '/admin/notifications', count: unread }}
      aside={<DialerPanel signIn />}
      nav={[
        { href: '/admin', label: 'Company overview' },
        { href: '/admin/reps', label: 'Sales reps' },
        { href: '/admin/requests', label: 'Lead requests', badge: pending },
        { href: '/admin/lead-finder', label: 'Lead finder' },
        { href: '/admin/leads', label: 'Leads', badge: inbound },
        { href: '/admin/sales', label: 'Clients & payouts' },
        { href: '/admin/leaderboard', label: 'Leaderboard' },
        { href: '/admin/packages', label: 'Packages & pricing' },
        { href: '/admin/dialerr', label: 'Dialerr setup' },
      ]}
      switchTo={{ href: '/portal', label: 'My rep portal' }}
    >
      {children}
    </AppShell>
  );
}
