import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { calls } from '@/db/schema';
import { getUser } from '@/lib/auth';
import { dialerrApi, isDialerrUrl } from '@/lib/dialerr';

// Plays a call recording. Dialerr serves recordings behind the org API token, so we fetch it here
// for the owner or the rep who made the call.
export async function GET(_req: Request, { params }: RouteContext<'/api/dialerr/recording/[id]'>) {
  const user = await getUser();
  if (!user) return new NextResponse('Sign in first.', { status: 401 });
  const id = Number((await params).id);
  const db = await getDb();
  const [call] = Number.isInteger(id) ? await db.select().from(calls).where(eq(calls.id, id)) : [];
  if (!call?.recordingUrl || (user.role !== 'admin' && call.repId !== user.id)) return new NextResponse('Not found.', { status: 404 });

  // A pre-signed link elsewhere (e.g. storage) needs no token.
  if (!isDialerrUrl(call.recordingUrl)) return NextResponse.redirect(call.recordingUrl);
  const u = new URL(call.recordingUrl);
  const r = await dialerrApi(u.pathname + u.search);
  if (!r?.ok || !r.body) return new NextResponse('Recording not available yet.', { status: 502 });
  return new NextResponse(r.body, {
    headers: { 'content-type': r.headers.get('content-type') ?? 'audio/mpeg', 'cache-control': 'private, max-age=3600' },
  });
}
