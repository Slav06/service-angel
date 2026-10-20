import { desc, eq } from 'drizzle-orm';
import { markAllRead } from '@/app/notifications/actions';
import { getDb } from '@/db';
import { notifications, type User } from '@/db/schema';
import { ago } from '@/lib/format';
import { Empty, PageHeader } from './ui';

export async function NotificationList({ user }: { user: User }) {
  const db = await getDb();
  const rows = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(100);
  const unread = rows.filter((n) => !n.readAt).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" sub={unread ? `${unread} unread` : 'You’re all caught up.'}>
        {unread > 0 && (
          <form action={markAllRead}>
            <button className="btn">Mark all as read</button>
          </form>
        )}
      </PageHeader>
      <div className="card divide-y divide-zinc-100 p-0">
        {rows.map((n) => (
          <a key={n.id} href={`/notifications/open?id=${n.id}`} className={`flex gap-3 px-4 py-3 hover:bg-zinc-50 ${n.readAt ? '' : 'bg-brand-50/50'}`}>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-brand-600'}`} />
            <span className="min-w-0 flex-1">
              <span className={`block text-sm ${n.readAt ? 'text-zinc-700' : 'font-semibold text-zinc-900'}`}>{n.title}</span>
              {n.body && <span className="block truncate text-sm text-zinc-500">{n.body}</span>}
            </span>
            <span className="shrink-0 text-xs text-zinc-400">{ago(n.createdAt)}</span>
          </a>
        ))}
        {!rows.length && <Empty>No notifications yet.</Empty>}
      </div>
    </div>
  );
}
