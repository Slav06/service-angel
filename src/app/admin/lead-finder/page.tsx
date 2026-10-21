import { count, desc, eq, isNotNull, sql } from 'drizzle-orm';
import Link from 'next/link';
import { clearFinderKey, saveFinderKeyAction, saveFinderSettings } from '@/app/admin/actions';
import { ActionForm, Submit } from '@/components/action-form';
import { Badge, PageHeader, Stat } from '@/components/ui';
import { getDb } from '@/db';
import { finderPlaces, leadRequests, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { ago } from '@/lib/format';
import { finderConfig, finderReady } from '@/lib/lead-finder';
import { describeRequest } from '@/lib/requests';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, [string, string]> = {
  queued: ['Starting', 'bg-sky-100 text-sky-800'],
  running: ['Searching', 'bg-sky-100 text-sky-800'],
  done: ['Done', 'bg-green-100 text-green-800'],
  failed: ['Problem', 'bg-red-100 text-red-700'],
  stopped: ['Stopped', 'bg-zinc-200 text-zinc-600'],
};

function KeyRow({ which, label, value, help }: { which: 'anthropic' | 'outscraper'; label: string; value: string | null; help: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t border-zinc-100 pt-4 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium">{label}</p>
        {value ? (
          <>
            <span className="text-sm text-green-700">Connected</span>
            <span className="font-mono text-xs text-zinc-400">…{value.slice(-4)}</span>
            <form action={clearFinderKey} className="ml-auto">
              <input type="hidden" name="which" value={which} />
              <button className="text-xs text-zinc-500 hover:text-red-600 hover:underline">Remove</button>
            </form>
          </>
        ) : (
          <span className="text-sm text-amber-700">Not connected</span>
        )}
      </div>
      {!value && (
        <>
          <p className="text-sm text-zinc-600">{help}</p>
          <ActionForm action={saveFinderKeyAction} reset className="flex flex-wrap gap-2">
            <input type="hidden" name="which" value={which} />
            <input name="key" type="password" autoComplete="off" placeholder="Paste key" className="input min-w-0 flex-1 font-mono" />
            <Submit className="btn btn-primary">Connect</Submit>
          </ActionForm>
        </>
      )}
    </div>
  );
}

export default async function LeadFinder() {
  await requireAdmin();
  const db = await getDb();
  const [cfg, [totals], recent] = await Promise.all([
    finderConfig(),
    db
      .select({
        given: sql<number>`(select count(*)::int from ${finderPlaces})`,
        monthScanned: sql<number>`coalesce(sum(${leadRequests.finderScanned}) filter (where ${leadRequests.createdAt} >= date_trunc('month', now())), 0)::int`,
        runs: count(),
      })
      .from(leadRequests)
      .where(isNotNull(leadRequests.finderStatus)),
    db
      .select({ r: leadRequests, rep: users.name })
      .from(leadRequests)
      .innerJoin(users, eq(users.id, leadRequests.repId))
      .where(isNotNull(leadRequests.finderStatus))
      .orderBy(desc(leadRequests.createdAt))
      .limit(15),
  ]);
  const ready = finderReady(cfg);

  return (
    <>
      <PageHeader
        title="Lead finder"
        sub="When a rep requests leads, Claude finds them on its own: small owner-run businesses with no website and few Google reviews. A business is only ever given out once."
      />
      <div className="grid max-w-5xl gap-4 2xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className={`card text-sm ${ready ? 'border-green-200 bg-green-50 text-green-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            {ready
              ? 'On — new lead requests go straight to Claude.'
              : !cfg.enabled
                ? 'Off — lead requests come to you to fill by hand.'
                : 'Connect both keys below to switch it on. Until then, lead requests come to you to fill by hand.'}
          </div>

          <div className="card space-y-4">
            <KeyRow
              which="anthropic"
              label="Claude (Anthropic API)"
              value={cfg.anthropicKey}
              help={
                <>
                  Plans the searches and picks the best businesses. At <b>console.anthropic.com</b>: add credit under Billing, then API keys → Create key.
                </>
              }
            />
            <KeyRow
              which="outscraper"
              label="Outscraper (Google Maps data)"
              value={cfg.outscraperKey}
              help={
                <>
                  Supplies the real businesses — name, phone, website, reviews. At <b>outscraper.com</b>: sign up, then Profile → API key. First 500
                  businesses each month are free, then $3 per 1,000.
                </>
              }
            />
          </div>

          <ActionForm action={saveFinderSettings} className="card grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
              <input type="checkbox" name="enabled" defaultChecked={cfg.enabled} /> Fill rep requests automatically
            </label>
            <div>
              <label className="label">Most Google reviews a lead can have</label>
              <input name="maxReviews" type="number" min={0} max={500} defaultValue={cfg.maxReviews} className="input" />
            </div>
            <div>
              <label className="label">Most leads per request</label>
              <input name="maxPerRequest" type="number" min={1} max={500} defaultValue={cfg.maxPerRequest} className="input" />
            </div>
            <div>
              <label className="label">Most leads per rep per day</label>
              <input name="dailyCap" type="number" min={1} max={5000} defaultValue={cfg.dailyCap} className="input" />
            </div>
            <div>
              <label className="label">Countries when the rep doesn’t name an area</label>
              <input name="countries" defaultValue={cfg.countries.join(', ')} className="input" />
              <p className="mt-1 text-xs text-zinc-500">Two-letter codes: US, CA, GB, AU, NZ, IE…</p>
            </div>
            <div className="sm:col-span-2">
              <Submit className="btn">Save settings</Submit>
            </div>
          </ActionForm>

          <div className="card overflow-x-auto p-0">
            <p className="h2 px-4 pt-4">Recent runs</p>
            <table className="table mt-2">
              <thead>
                <tr>
                  <th>Rep</th>
                  <th>Request</th>
                  <th>Status</th>
                  <th className="text-right">Found</th>
                  <th className="text-right">Checked</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(({ r, rep }) => {
                  const [label, cls] = STATUS[r.finderStatus ?? 'done'];
                  return (
                    <tr key={r.id} className="hover:bg-zinc-50">
                      <td>{rep}</td>
                      <td>
                        <Link href={`/admin/requests/${r.id}`} className="text-brand-700 hover:underline">
                          {describeRequest(r)}
                        </Link>
                      </td>
                      <td>
                        <Badge className={cls}>{label}</Badge>
                      </td>
                      <td className="text-right tabular-nums">
                        {r.deliveredCount} / {r.quantity}
                      </td>
                      <td className="text-right tabular-nums">{r.finderScanned.toLocaleString('en-US')}</td>
                      <td className="text-zinc-500">{ago(r.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!recent.length && <p className="px-4 pb-4 text-sm text-zinc-500">No runs yet.</p>}
          </div>
        </div>

        <aside className="grid gap-3 sm:grid-cols-3 2xl:block 2xl:space-y-3">
          <Stat label="Businesses handed out (all time)" value={totals.given.toLocaleString('en-US')} sub="each one only ever once" tone="brand" />
          <Stat label="Businesses checked this month" value={totals.monthScanned.toLocaleString('en-US')} sub="what Outscraper bills for" />
          <Stat label="Requests filled by Claude" value={totals.runs} />
          <div className="card text-xs text-zinc-600 sm:col-span-3 2xl:col-span-1">
            <p className="font-semibold text-zinc-800">How a lead is chosen</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Claude plans Google Maps searches — a business type in a town — from the rep’s request.</li>
              <li>Only open businesses with a phone number, no website of their own (a Facebook or Instagram page is fine) and few reviews go through.</li>
              <li>Anything given out before, or already in your leads, is skipped.</li>
              <li>Claude drops chains, franchises and bigger companies, picks the owner-run businesses most likely to buy, and writes a note for the rep.</li>
            </ol>
            <p className="mt-2">Claude never makes up a business: every lead is a real Google Maps listing, linked from the lead.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
