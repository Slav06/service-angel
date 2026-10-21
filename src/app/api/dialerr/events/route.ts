import { after, NextResponse, type NextRequest } from 'next/server';
import { getUser } from '@/lib/auth';
import { recordDialerEvent, recordDialerrCall, syncCall } from '@/lib/dialerr';

// The dialer panel reports what happens in it (window "dialerr:*" events). We trust only the session for who
// made the call; the rest is filled in from Dialerr's API when a token is configured.
const EVENTS = ['call_connected', 'call_ended', 'missed_call', 'voicemail'] as const;
type Event = (typeof EVENTS)[number];

const text = (v: unknown, max: number) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) || null : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { event?: string; detail?: Record<string, unknown> } | null;
  const event = body?.event as Event;
  if (!EVENTS.includes(event)) return NextResponse.json({ error: 'Unknown event.' }, { status: 400 });

  const d = body?.detail ?? {};
  const callId = text(d.callId, 64);
  const phone = text(d.phone, 40);
  const name = text(d.leadName, 120);
  const seconds = num(d.durationSeconds);

  if (event === 'voicemail') {
    const link = text(d.url, 1000);
    const url = link && /^https:\/\//i.test(link) ? link : null;
    await recordDialerEvent({ repId: user.id, kind: 'voicemail', phone, url, seconds, externalId: url ? `vm:${url}` : null });
  } else {
    await recordDialerrCall({ dialerrId: callId, repId: user.id, phone, name, seconds, connected: event !== 'missed_call' });
    // Duration, direction, recording and disposition settle once the call is over.
    if (callId && event !== 'call_connected') after(() => syncCall(callId, user.id).catch(() => null));
  }
  return new NextResponse(null, { status: 204 });
}
