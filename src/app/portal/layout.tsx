import { and, count, eq, lt, notInArray } from 'drizzle-orm';
import { AppShell } from '@/components/app-shell';
import { DialerPanel } from '@/components/dialer-panel';
import { getDb } from '@/db';
import { calls, leads } from '@/db/schema';
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
  const [{ n: untagged }] = await db.select({ n: count() }).from(calls).where(and(eq(calls.repId, user.id), eq(calls.outcome, 'connected')));
  const unread = await unreadCount(user.id);
  return (
    <AppShell
      user={user}
      bell={{ href: '/portal/notifications', count: unread }}
      aside={<DialerPanel signIn={!!user.dialerrEmail || user.role === 'admin'} />}
      nav={[
        { href: '/portal', label: 'Dashboard' },
        { href: '/portal/calls', label: 'Calls', badge: untagged },
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
