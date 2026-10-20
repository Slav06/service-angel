import { and, eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db';
import { notifications } from '@/db/schema';
import { getUser } from '@/lib/auth';

// Clicking a notification marks it read and jumps to what it's about.
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));
  const db = await getDb();
  const [n] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, Number(req.nextUrl.searchParams.get('id')) || 0), eq(notifications.userId, user.id)))
    .returning({ href: notifications.href });
  const fallback = user.role === 'admin' ? '/admin' : '/portal';
  const href = n?.href?.startsWith('/') ? n.href : fallback;
  return NextResponse.redirect(new URL(href, req.url));
}
