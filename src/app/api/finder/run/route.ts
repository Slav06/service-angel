import { after, NextResponse, type NextRequest } from 'next/server';
import { checkRunSecret, kickFinder, runFinderRound } from '@/lib/lead-finder';

// Runs one round of the lead finder for a request, then starts the next round in a fresh call.
// Internal: called by kickFinder with the secret from the settings table.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!(await checkRunSecret(req.headers.get('x-finder-secret')))) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  const { id } = ((await req.json().catch(() => ({}))) ?? {}) as { id?: unknown };
  if (typeof id !== 'number' || !Number.isInteger(id)) return NextResponse.json({ error: 'Bad id.' }, { status: 400 });
  const origin = req.nextUrl.origin;
  after(async () => {
    if (await runFinderRound(id)) await kickFinder(origin, id);
  });
  return NextResponse.json({ ok: true }, { status: 202 });
}
