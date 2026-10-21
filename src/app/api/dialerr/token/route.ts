import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

// Seamless Dialerr sign-in for the dialer panel: exchanges the secret embed key for a short-lived agent token
// (https://dialerr.com/llms.txt). Each person signs in as their own Dialerr agent (users.dialerr_email, set on
// /admin/reps); only the owner may fall back to the key's default agent.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Sign in first.' }, { status: 401 });
  const agentEmail = user.dialerrEmail ?? (user.role === 'admin' ? process.env.DIALERR_AGENT_EMAIL : undefined);
  if (!agentEmail && user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Ask the owner to link your Dialerr login.' }, { status: 403 });
  }
  const secret = process.env.DIALERR_SECRET;
  if (!secret) return NextResponse.json({ success: false, error: 'DIALERR_SECRET is not set.' }, { status: 503 });

  const r = await fetch('https://dialerr.com/api/v1/embed/token', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(agentEmail ? { agentEmail } : {}),
    cache: 'no-store',
  });
  return new NextResponse(await r.text(), { status: r.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
