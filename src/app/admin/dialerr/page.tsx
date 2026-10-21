import { asc, eq } from 'drizzle-orm';
import { clearDialerrToken, linkDialerr, saveDialerrToken } from '@/app/admin/actions';
import { ActionForm, Submit } from '@/components/action-form';
import { CopyField } from '@/components/copy-field';
import { PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { apiToken, getSetting, SETTING, webhookSecret } from '@/lib/dialerr';
import { ago } from '@/lib/format';
import { origin } from '@/lib/origin';

export const dynamic = 'force-dynamic';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_DIALERR_KEY;

// Does the embed key let this site sign people in? (Dialerr only hands tokens to its allowed domains.)
async function allowedHere(site: string) {
  if (!PUBLIC_KEY) return null;
  const r = await fetch(`https://dialerr.com/api/v1/embed/config?key=${PUBLIC_KEY}`, { cache: 'no-store' }).catch(() => null);
  if (!r?.ok) return null;
  const { allowedOrigins = [], name } = (await r.json()) as { allowedOrigins?: string[]; name?: string };
  const ok = allowedOrigins.some((o) => o === site || (o.includes('*') && new RegExp(`^${o.replace(/[.]/g, '\\.').replace('*', '[^.]+')}$`).test(site)));
  return { ok, keyName: name ?? 'your embed key' };
}

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-green-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
          {done ? '✓' : n}
        </span>
        <p className="font-semibold">{title}</p>
      </div>
      <div className="mt-3 space-y-3 text-sm text-zinc-700 sm:pl-10">{children}</div>
    </div>
  );
}

export default async function DialerrSetup() {
  await requireAdmin();
  const db = await getDb();
  const site = await origin();
  const [people, token, secret, lastWebhook, embed] = await Promise.all([
    db.select().from(users).where(eq(users.active, true)).orderBy(asc(users.name)),
    apiToken(),
    webhookSecret(),
    getSetting(SETTING.lastWebhookAt),
    allowedHere(site),
  ]);
  const linked = people.filter((p) => p.dialerrEmail).length;

  return (
    <>
      <PageHeader
        title="Dialerr setup"
        sub="Every call made in the dialer panel is logged for the rep who made it and feeds the company overview, each rep’s dashboard and the leaderboard."
      />
      <div className="max-w-3xl space-y-4">
        <Step n={1} done={!!embed?.ok} title="Let this site sign people into the dialer">
          {embed?.ok ? (
            <p>
              <b>{site}</b> is an allowed domain on {embed.keyName}, so the panel signs everyone in automatically.
            </p>
          ) : (
            <>
              <p>Dialerr only signs people in on domains you’ve approved. Until then the panel shows Dialerr’s own sign-in box.</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  Open <b>dialerr.com → Settings → API Access</b>.
                </li>
                <li>
                  Under <b>Embed keys</b>, open <b>{embed?.keyName ?? 'your embed key'}</b>.
                </li>
                <li>Add this allowed domain and save:</li>
              </ol>
              <CopyField label="Allowed domain" value={site} />
              <p className="text-xs text-zinc-500">This step turns green on its own once Dialerr has it.</p>
            </>
          )}
        </Step>

        <Step n={2} done={linked === people.length} title={`Link each person to their Dialerr login (${linked} of ${people.length})`}>
          <p>
            Enter the email each rep signs into Dialerr with (add them as agents in <b>Dialerr → Agents</b> first). Their panel then signs in as them, and
            calls Dialerr reports for that agent count toward their stats.
          </p>
          <div className="divide-y divide-zinc-100">
            {people.map((p) => (
              <ActionForm key={p.id} action={linkDialerr} className="flex flex-wrap items-center gap-2 py-2">
                <input type="hidden" name="id" value={p.id} />
                <span className="w-32 shrink-0 font-medium">
                  {p.name}
                  {p.role === 'admin' && <span className="block text-xs font-normal text-zinc-500">owner</span>}
                </span>
                <input
                  name="dialerrEmail"
                  type="email"
                  defaultValue={p.dialerrEmail ?? ''}
                  placeholder={p.role === 'admin' ? 'default agent on your key' : 'agent@yourcompany.com'}
                  className="input min-w-0 flex-1"
                />
                <Submit className="btn btn-sm">Save</Submit>
              </ActionForm>
            ))}
          </div>
        </Step>

        <Step n={3} done={!!token} title="Pull full call details (API token)">
          <p>
            With an API token, each call is filled in from Dialerr: exact length, inbound or outbound, the disposition the rep picked, the recording and
            Dialerr’s AI summary. It also credits calls made in Dialerr’s own app to the right rep.
          </p>
          {token ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs text-zinc-500">api_…{token.slice(-4)}</span>
              <span className="text-green-700">Connected</span>
              <form action={clearDialerrToken}>
                <button className="text-xs text-zinc-500 hover:text-red-600 hover:underline">Remove</button>
              </form>
            </div>
          ) : (
            <>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  In <b>dialerr.com → Settings → API Access → API tokens</b>, create a new token (name it “Service Angel”).
                </li>
                <li>Paste it below. It’s stored only in your database and never shown again here.</li>
              </ol>
              <ActionForm action={saveDialerrToken} reset className="flex flex-wrap gap-2">
                <input name="token" type="password" autoComplete="off" placeholder="api_…" className="input min-w-0 flex-1 font-mono" />
                <Submit className="btn btn-primary">Connect</Submit>
              </ActionForm>
            </>
          )}
          <p className="text-xs text-zinc-500">Dialerr includes 1,000 API lookups a month free, then $0.01 each (one per call).</p>
        </Step>

        <Step n={4} done={!!lastWebhook} title="Send texts and dispositions here (webhook)">
          <p>
            In <b>Dialerr → Integrations → Event Webhooks</b>, paste this URL and signing secret. Every text sent or received and every disposition then shows
            up here.
          </p>
          <CopyField label="Webhook URL" value={`${site}/api/dialerr/webhook`} />
          <CopyField label="Signing secret" value={secret} />
          <p className="text-xs text-zinc-500">{lastWebhook ? `Last event received ${ago(new Date(lastWebhook))}.` : 'Nothing received yet.'}</p>
        </Step>

        <div className="card text-sm text-zinc-700">
          <p className="font-semibold">What’s tracked</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Every call made or missed in the dialer panel, the moment it happens, credited to whoever is signed in here.</li>
            <li>Call length, direction, disposition, recording and AI summary (step 3).</li>
            <li>Texts in and out, and dispositions set anywhere in Dialerr (step 4). Voicemails left for a rep.</li>
            <li>
              Calls to a number on one of the rep’s leads are attached to that lead and move it along the pipeline. Answered calls wait for the rep to tap how
              it went, unless their Dialerr disposition already says.
            </li>
          </ul>
          <p className="mt-2 text-xs text-zinc-500">
            Dialerr doesn’t offer a full call history export, so calls made in Dialerr’s own app only show up here once they get a disposition (with steps 3 and
            4 done).
          </p>
        </div>
      </div>
    </>
  );
}
