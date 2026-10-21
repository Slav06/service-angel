import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { recordDialerEvent, repForPhone, setSetting, SETTING, syncCall, webhookSecret } from '@/lib/dialerr';

// Dialerr's org event webhook (Integrations → Event Webhooks): dispositions and every text in or out.
// Signed with the secret shown on /admin/dialerr.
type Payload = {
  event?: string;
  data?: {
    disposition?: { name?: string };
    call?: { id?: string | number; duration?: number; status?: string; created_at?: string };
    lead?: { phone?: string; name?: string; first_name?: string; last_name?: string };
    from?: string;
    to?: string;
    text?: string;
    message_id?: string | number;
    received_at?: string;
    sent_at?: string;
    message?: { id?: string | number; body?: string; sent_at?: string };
  };
};

function signed(raw: string, header: string | null, secret: string) {
  const sig = (header ?? '').replace(/^sha256=/i, '').trim();
  const want = createHmac('sha256', secret).update(raw).digest('hex');
  return sig.length === want.length && timingSafeEqual(Buffer.from(sig), Buffer.from(want));
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!signed(raw, req.headers.get('x-dialr-signature'), await webhookSecret())) {
    return NextResponse.json({ error: 'Bad signature.' }, { status: 401 });
  }
  let p: Payload;
  try {
    p = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad JSON.' }, { status: 400 });
  }
  await setSetting(SETTING.lastWebhookAt, new Date().toISOString());
  const d = p.data ?? {};
  const leadName = d.lead?.name ?? ([d.lead?.first_name, d.lead?.last_name].filter(Boolean).join(' ') || null);

  if (p.event === 'lead.disposition_set' && d.call?.id != null) {
    // The webhook doesn't say which rep; the call row (from the panel) or the API's agent does.
    await syncCall(String(d.call.id), null, {
      disposition: d.disposition?.name ?? null,
      ...(d.call.duration != null && { seconds: d.call.duration }),
      ...(d.lead?.phone && { phone: d.lead.phone }),
      ...(leadName && { name: leadName }),
    });
  } else if (p.event === 'message.received' || p.event === 'message.sent') {
    const phone = d.lead?.phone ?? (p.event === 'message.received' ? d.from : d.to) ?? null;
    const id = d.message_id ?? d.message?.id;
    const at = d.received_at ?? d.sent_at ?? d.message?.sent_at;
    await recordDialerEvent({
      repId: await repForPhone(phone),
      kind: p.event === 'message.received' ? 'sms_in' : 'sms_out',
      phone,
      name: leadName,
      body: (d.text ?? d.message?.body ?? '').slice(0, 2000) || null,
      externalId: id != null ? `msg:${id}` : null,
      at: at ? new Date(at) : new Date(),
    });
  }
  return NextResponse.json({ ok: true });
}
