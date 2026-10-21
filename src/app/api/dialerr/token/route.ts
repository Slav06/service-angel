import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

// Seamless Dialerr sign-in for the owner's admin panel: exchanges the secret embed key for a short-lived
// agent token (https://dialerr.com/llms.txt). Admin-only — the token signs into the owner's Dialerr account.
export async function GET() {
  const user = await getUser();
  if (user?.role !== 'admin') return NextResponse.json({ success: false, error: 'Sign in as the owner first.' }, { status: 401 });
  const secret = process.env.DIALERR_SECRET;
  if (!secret) return NextResponse.json({ success: false, error: 'DIALERR_SECRET is not set.' }, { status: 503 });

  const agentEmail = process.env.DIALERR_AGENT_EMAIL; // optional; otherwise the key's default agent
  const r = await fetch('https://dialerr.com/api/v1/embed/token', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(agentEmail ? { agentEmail } : {}),
    cache: 'no-store',
  });
  return new NextResponse(await r.text(), { status: r.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
