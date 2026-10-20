import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '@/db';
import { notifications, users } from '@/db/schema';

type Note = { title: string; body?: string | null; href?: string };

export async function notify(userIds: number[], note: Note) {
  if (!userIds.length) return;
  const db = await getDb();
  await db.insert(notifications).values(userIds.map((userId) => ({ userId, title: note.title, body: note.body?.slice(0, 300) ?? null, href: note.href ?? null })));
}

export async function notifyAdmins(note: Note, exceptId?: number) {
  const db = await getDb();
  const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.role, 'admin'), eq(users.active, true)));
  await notify(admins.map((a) => a.id).filter((id) => id !== exceptId), note);
}

// Opening a page counts as reading every notification that points to it.
export async function markReadFor(userId: number, href: string) {
  const db = await getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.href, href), isNull(notifications.readAt)));
}

export async function markRead(userId: number, ids?: number[]) {
  const db = await getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), ids ? inArray(notifications.id, ids) : undefined));
}

export async function unreadCount(userId: number) {
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return n;
}
