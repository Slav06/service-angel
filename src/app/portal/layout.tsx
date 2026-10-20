import { and, count, eq, lt, notInArray } from 'drizzle-orm';
import { AppShell } from '@/components/app-shell';
import { getDb } from '@/db';
import { leads } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { dueCutoff } from '@/lib/format';
import { unreadCount } from '@/lib/notify';

export const metadata = { title: 'Sales portal', robots: { index: false } };

export default async function PortalLayout({ children }: LayoutProps<'/portal'>) {
  const user = await requireUser();
  const db = await getDb();
  const [{ n: due }] = await db
    .select({ n: count() })
    .from(leads)
    .where(and(eq(leads.repId, user.id), notInArray(leads.stage, ['won', 'lost']), lt(leads.nextFollowUpAt, dueCutoff())));
  const [{ n: fresh }] = await db.select({ n: count() }).from(leads).where(and(eq(leads.repId, user.id), eq(leads.stage, 'new')));
  const unread = await unreadCount(user.id);
  return (
    <AppShell
      user={user}
      bell={{ href: '/portal/notifications', count: unread }}
      nav={[
        { href: '/portal', label: 'Dashboard' },
        { href: '/portal/calls', label: 'Log calls' },
        { href: '/portal/leads', label: 'My leads', badge: due + fresh },
        { href: '/portal/sales', label: 'My clients' },
        { href: '/portal/requests', label: 'Request leads' },
        { href: '/portal/leaderboard', label: 'Leaderboard' },
        { href: '/portal/profile', label: 'Profile' },
      ]}
      switchTo={user.role === 'admin' ? { href: '/admin', label: 'Owner admin' } : undefined}
    >
      {children}
    </AppShell>
  );
}
