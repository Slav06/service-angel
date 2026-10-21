import { randomBytes } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { and, eq, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { finderPlaces, leadRequests, leads, type LeadRequest } from '@/db/schema';
import { getSetting, setSetting } from './dialerr';
import { notify, notifyAdmins } from './notify';
import { addMessage, describeRequest, requestHref } from './requests';

// The lead finder fills a rep's lead request on its own:
//   1. Claude plans Google Maps searches (business type + town) for the request;
//   2. Outscraper returns the real businesses for each search (name, phone, website, reviews…);
//   3. code keeps only open businesses with a phone, no real website and few reviews that nobody has been given;
//   4. Claude picks the owner-run ones most likely to buy a website and writes a note for the rep;
//   5. each pick is registered in finder_places (forever) and lands in the rep's leads.
// Claude never invents a business: it only plans searches and chooses among search results.
// Without an Outscraper key, the terminal engine finds businesses by searching the web itself (lead-finder-cli.ts
// cliResearch); every phone number and name it returns must appear in a page it actually read, or it's dropped.
// A request is worked in rounds. Claude runs one of two ways (the "engine" setting):
//   terminal — `npm run finder` on the owner's computer, using their Claude subscription (lead-finder-cli.ts);
//   api      — on the website with an Anthropic API key; each round runs in its own function call (kept well
//              under the 300 s limit) and starts the next (see kickFinder).

const MODEL = 'claude-opus-5-5';
const OUTSCRAPER = process.env.OUTSCRAPER_BASE_URL ?? 'https://api.app.outscraper.com'; // override for local testing
const PER_SEARCH = 40; // businesses per Maps search (Outscraper bills per business returned)
const STALE_MS = 5 * 60_000; // a run with no sign of life this long is presumed dead and restarted

// ---------- Settings ----------

export const FINDER = {
  enabled: 'finder.enabled',
  anthropicKey: 'finder.anthropic_key',
  outscraperKey: 'finder.outscraper_key',
  maxReviews: 'finder.max_reviews',
  maxPerRequest: 'finder.max_per_request',
  dailyCap: 'finder.daily_cap',
  countries: 'finder.countries',
  runSecret: 'finder.run_secret',
  engine: 'finder.engine',
  workerSeen: 'finder.worker_seen',
} as const;

export type FinderEngine = 'terminal' | 'api';

export const DEFAULT_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'NZ', 'IE'];

export type FinderConfig = {
  enabled: boolean;
  engine: FinderEngine;
  anthropicKey: string | null;
  outscraperKey: string | null;
  maxReviews: number;
  maxPerRequest: number;
  dailyCap: number;
  countries: string[];
};

const num = (v: string | null, fallback: number) => (v != null && Number.isFinite(Number(v)) ? Number(v) : fallback);

export async function finderConfig(): Promise<FinderConfig> {
  const [enabled, engine, anthropicKey, outscraperKey, maxReviews, maxPerRequest, dailyCap, countries] = await Promise.all(
    [FINDER.enabled, FINDER.engine, FINDER.anthropicKey, FINDER.outscraperKey, FINDER.maxReviews, FINDER.maxPerRequest, FINDER.dailyCap, FINDER.countries].map(
      getSetting,
    ),
  );
  return {
    enabled: enabled !== '0',
    engine: engine === 'api' ? 'api' : 'terminal',
    anthropicKey: anthropicKey ?? process.env.ANTHROPIC_API_KEY ?? null,
    outscraperKey: outscraperKey ?? process.env.OUTSCRAPER_API_KEY ?? null,
    maxReviews: num(maxReviews, 15),
    maxPerRequest: num(maxPerRequest, 50),
    dailyCap: num(dailyCap, 100),
    countries: countries ? countries.split(',').filter(Boolean) : DEFAULT_COUNTRIES,
  };
}

// On and connected: new requests go straight to the finder. The terminal engine needs no Anthropic key.
// Without Outscraper, only the terminal engine can work (Claude researches the web itself).
export const finderReady = (c: FinderConfig) => c.enabled && (c.engine === 'terminal' || (!!c.anthropicKey && !!c.outscraperKey));

// The terminal worker checks in every poll, so the admin can tell whether it's running.
export async function markWorkerSeen() {
  await setSetting(FINDER.workerSeen, new Date().toISOString());
}

export async function workerSeenAt() {
  const v = await getSetting(FINDER.workerSeen);
  return v ? new Date(v) : null;
}

export const workerOnline = (seen: Date | null) => !!seen && Date.now() - seen.getTime() < 2 * 60_000;

async function runSecret() {
  const existing = await getSetting(FINDER.runSecret);
  if (existing) return existing;
  const db = await getDb();
  await db.execute(sql`insert into settings (key, value) values (${FINDER.runSecret}, ${randomBytes(24).toString('hex')}) on conflict do nothing`);
  return (await getSetting(FINDER.runSecret))!;
}

export async function checkRunSecret(given: string | null) {
  return !!given && given === (await runSecret());
}

// ---------- Outscraper (Google Maps data) ----------

export type MapsPlace = {
  place_id?: string;
  name?: string;
  phone?: string | null;
  site?: string | null;
  full_address?: string | null;
  city?: string | null;
  state?: string | null;
  country_code?: string | null;
  rating?: number | null;
  reviews?: number | null;
  business_status?: string | null;
  category?: string | null;
  type?: string | null;
  subtypes?: string | null;
  location_link?: string | null;
  verified?: boolean | null;
};

export async function testOutscraperKey(key: string) {
  const r = await fetch(`${OUTSCRAPER}/requests?type=running`, { headers: { 'X-API-KEY': key }, cache: 'no-store' }).catch(() => null);
  return !!r?.ok;
}

async function outscraper(path: string, key: string) {
  const r = await fetch(`${OUTSCRAPER}${path}`, { headers: { 'X-API-KEY': key }, cache: 'no-store', signal: AbortSignal.timeout(100_000) });
  const body = (await r.json().catch(() => null)) as { data?: MapsPlace[][]; id?: string; status?: string; errorMessage?: string } | null;
  if (!r.ok || !body) throw new Error(`Outscraper ${r.status}: ${body?.errorMessage ?? 'no response'}`);
  return body;
}

// One Maps search, e.g. "roofer in Abilene, TX". Waits for the result (polling if Outscraper queues it).
export async function searchMaps(key: string, query: string, region: string): Promise<MapsPlace[]> {
  const params = new URLSearchParams({ query, region, language: 'en', organizationsPerQueryLimit: String(PER_SEARCH), dropDuplicates: 'true', async: 'false' });
  let body = await outscraper(`/maps/search-v3?${params}`, key);
  for (let i = 0; !body.data && body.id && i < 18; i++) {
    await new Promise((res) => setTimeout(res, 5000));
    body = await outscraper(`/requests/${encodeURIComponent(body.id)}`, key);
  }
  return (body.data ?? []).flat().filter(Boolean);
}

// ---------- Filters (code, not judgment) ----------

// Social pages, directories and booking profiles: a business with only these has no website of its own.
const NOT_A_WEBSITE = [
  'facebook.com', 'fb.com', 'fb.me', 'instagram.com', 'linktr.ee', 'linkin.bio', 'tiktok.com', 'twitter.com', 'x.com', 'linkedin.com',
  'youtube.com', 'yelp.com', 'nextdoor.com', 'business.site', 'g.page', 'google.com', 'goo.gl', 'wa.me', 'whatsapp.com',
  'booksy.com', 'vagaro.com', 'styleseat.com', 'fresha.com', 'setmore.com', 'calendly.com', 'thumbtack.com', 'angi.com',
  'homeadvisor.com', 'houzz.com', 'bark.com', 'yell.com', 'checkatrade.com', 'yellowpages.com', 'yellowpages.ca', 'truelocal.com.au',
  'hipages.com.au', 'nocowboys.co.nz', 'groupon.com', 'doordash.com', 'ubereats.com', 'grubhub.com',
];

export function websiteHost(site: string | null | undefined) {
  if (!site) return null;
  try {
    return new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function hasRealWebsite(site: string | null | undefined) {
  const host = websiteHost(site);
  return !!host && !NOT_A_WEBSITE.some((d) => host === d || host.endsWith(`.${d}`));
}

export const phone10 = (p: string | null | undefined) => (p ?? '').replace(/\D/g, '').slice(-10);

export type Candidate = MapsPlace & { place_id: string; name: string; phone: string };

// Keep open businesses with a phone, no real website and few reviews; drop names that appear at several
// addresses (chains).
export function screen(places: MapsPlace[], maxReviews: number): Candidate[] {
  // If the data stopped carrying the website or review fields, every business would look like a lead: refuse.
  if (places.length >= 10 && (!places.some((p) => 'site' in p) || !places.some((p) => 'reviews' in p))) {
    throw new Error('Outscraper results are missing the website or reviews fields — not handing out unchecked leads.');
  }
  const seen = new Set<string>();
  const listings = new Map<string, Set<string>>(); // name → distinct listings
  for (const p of places) {
    const n = (p.name ?? '').trim().toLowerCase();
    if (n && p.place_id) listings.set(n, (listings.get(n) ?? new Set()).add(p.place_id));
  }
  const out: Candidate[] = [];
  for (const p of places) {
    if (!p.place_id || !p.name || !p.phone || seen.has(p.place_id)) continue;
    seen.add(p.place_id);
    if (p.business_status && p.business_status !== 'OPERATIONAL') continue;
    if (phone10(p.phone).length < 7) continue;
    if (hasRealWebsite(p.site)) continue;
    if ((p.reviews ?? 0) > maxReviews) continue;
    if ((listings.get(p.name.trim().toLowerCase())?.size ?? 0) > 1) continue;
    out.push(p as Candidate);
  }
  return out;
}

// Drop anything already handed out by the finder or already in the system as a lead.
async function unseen(cands: Candidate[]) {
  if (!cands.length) return cands;
  const db = await getDb();
  const ids = cands.map((c) => c.place_id);
  const phones = [...new Set(cands.map((c) => phone10(c.phone)))];
  const [given, existing] = await Promise.all([
    db
      .select({ placeId: finderPlaces.placeId, phone: finderPlaces.phone })
      .from(finderPlaces)
      .where(or(inArray(finderPlaces.placeId, ids), inArray(finderPlaces.phone, phones))),
    db
      .select({ d: sql<string>`right(regexp_replace(${leads.phone}, '\\D', '', 'g'), 10)` })
      .from(leads)
      .where(and(isNotNull(leads.phone), inArray(sql`right(regexp_replace(${leads.phone}, '\\D', '', 'g'), 10)`, phones))),
  ]);
  const usedIds = new Set(given.map((g) => g.placeId));
  const usedPhones = new Set([...given.map((g) => g.phone), ...existing.map((e) => e.d)]);
  return cands.filter((c) => !usedIds.has(c.place_id) && !usedPhones.has(phone10(c.phone)));
}

// ---------- Claude ----------

// "any", "anywhere", "-"… typed into a request field means no preference.
export const anyIsBlank = (v: string | null) => (v && !/^\s*(any|anything|anywhere|all|everywhere|none|n\/a|-+)\s*$/i.test(v) ? v : null);

export const WHO = `Service Angel builds and runs websites for small businesses on a $500/month plan. Our sales reps cold-call business owners.
The ideal lead is a small, independent business run by its owner, a family or a small team: no website of its own (at most a Facebook,
Instagram or directory page), few Google reviews, still building its customer base, and the kind of business whose customers search
online before they buy (home services and trades, beauty and wellness, auto, cleaning, pets, events, food trucks and small eateries,
fitness, tutoring, local professional services). Not leads: chains, franchises, big companies, dealerships, government offices, schools,
hospitals, charities, churches, and anyone a rep couldn't sell a website to.`;

const PlanSchema = z.object({
  searches: z.array(
    z.object({
      query: z.string().describe('A Google Maps search: business type plus town and region, e.g. "mobile mechanic in Abilene, TX"'),
      region: z.string().describe('Two-letter country code of that town, e.g. US, GB, AU'),
    }),
  ),
});

const PickSchema = z.object({
  picks: z.array(
    z.object({
      id: z.number().int().describe('The candidate id'),
      score: z.number().int().describe('1-10: how good a website lead this is'),
      why: z.string().describe('One short sentence for the rep on why this business needs a website'),
    }),
  ),
});

// One structured question to Claude, answered by whichever engine is running the round.
export type Ask = <T extends z.ZodType>(effort: 'low' | 'medium', schema: T, system: string, user: string) => Promise<z.infer<T>>;

// Claude can't answer right now (e.g. the subscription's usage limit): leave the request queued and try later.
export class FinderPause extends Error {}

export const apiAsk = (key: string): Ask => async (effort, schema, system, user) => {
  const res = await new Anthropic({ apiKey: key, maxRetries: 3 }).beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort, format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: 'user', content: user }],
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error(`Claude returned no answer (${res.stop_reason})`);
  return res.parsed_output;
};

export async function planSearches(ask: Ask, req: LeadRequest, needed: number, count: number, countries: string[]) {
  const system = `${WHO}

You plan Google Maps searches that will turn up these businesses. Each search is one business type in one town.
Rules:
- If the rep named a niche or area, stay within it. Otherwise choose business types from the list above, and towns in these countries: ${countries.join(', ')}.
- Prefer small towns, suburbs and mid-size cities over big downtowns: more businesses there still have no website.
- Spread searches across different towns and types; never repeat a search that was already run.
- Use the local word for the trade (e.g. "plumber" in the US, "plumber" or "heating engineer" in the UK).`;
  const user = `Rep's request: ${describeRequest(req)}
Niche: ${anyIsBlank(req.niche) ?? 'any'} · Area: ${anyIsBlank(req.area) ?? 'any'} · Still needed: ${needed}
Rep's notes: ${req.notes ?? 'none'}
Searches already run (don't repeat): ${req.finderQueries.length ? req.finderQueries.join(' | ') : 'none'}

Plan exactly ${count} new searches.`;
  const out = await ask('low', PlanSchema, system, user);
  const done = new Set(req.finderQueries.map((q) => q.toLowerCase()));
  return out.searches
    .map((s) => ({ query: s.query.trim().slice(0, 150), region: s.region.trim().toUpperCase().slice(0, 2) }))
    .filter((s) => s.query && /^[A-Z]{2}$/.test(s.region) && !done.has(s.query.toLowerCase()))
    .slice(0, count);
}

export async function pickBest(ask: Ask, req: LeadRequest, cands: Candidate[], needed: number) {
  const list = cands.map((c, id) => ({
    id,
    name: c.name,
    category: c.category ?? c.type ?? null,
    other_categories: c.subtypes ?? null,
    address: c.full_address ?? null,
    reviews: c.reviews ?? 0,
    rating: c.rating ?? null,
    online_presence: websiteHost(c.site) ?? 'none',
    google_verified: c.verified ?? null,
  }));
  const system = `${WHO}

You review real businesses from Google Maps (all already checked: open, have a phone, no real website, few reviews) and pick the
best leads for our reps. Return only businesses that fit: drop chains, franchises, branches of larger companies, and every kind of
non-lead above. Score each pick 1-10 for how likely the owner is to buy a website from a cold call. For each pick write one short,
specific sentence the rep can use (e.g. "Family-run bakery with 6 reviews and only an Instagram page — no way to be found on Google").
Never add a business that isn't in the list.`;
  const user = `Rep's request: ${describeRequest(req)}. Rep's notes: ${req.notes ?? 'none'}
Pick at most ${needed}, best first, and leave out anything that doesn't fit even if that means fewer.

Candidates:
${JSON.stringify(list)}`;
  const out = await ask('medium', PickSchema, system, user);
  const used = new Set<number>();
  return out.picks
    .filter((p) => Number.isInteger(p.id) && p.id >= 0 && p.id < cands.length && !used.has(p.id) && used.add(p.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, needed)
    .map((p) => ({ cand: cands[p.id], score: Math.max(1, Math.min(10, p.score)), why: p.why.trim().slice(0, 300) }));
}

// ---------- Delivery ----------

// Register and hand out picks; anything another run grabbed first (the unique indexes) is skipped.
export type LeadPick = { cand: Candidate; score: number; why: string };

async function deliver(req: LeadRequest, picks: LeadPick[]) {
  const db = await getDb();
  let added = 0;
  for (const { cand: c, score, why } of picks) {
    const [reg] = await db
      .insert(finderPlaces)
      .values({ placeId: c.place_id, phone: phone10(c.phone), name: c.name, country: c.country_code ?? null, repId: req.repId, requestId: req.id })
      .onConflictDoNothing()
      .returning({ id: finderPlaces.id });
    if (!reg) continue;
    const host = websiteHost(c.site);
    const [lead] = await db
      .insert(leads)
      .values({
        business: c.name.slice(0, 200),
        phone: c.phone,
        website: c.site ?? null,
        city: [c.city, c.state, c.country_code].filter(Boolean).join(', ') || null,
        niche: c.category ?? c.type ?? null,
        mapsUrl: c.location_link ?? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(c.place_id)}`,
        // Shown read-only on the lead as "Why Claude picked this lead"; the rep's own notes stay empty.
        message: [
          why,
          [
            c.rating != null && `⭐ ${c.rating}`,
            c.reviews != null ? `${c.reviews} Google review${c.reviews === 1 ? '' : 's'}` : 'review count not checked',
            host ? `only has ${host}` : 'no website',
            `lead score ${score}/10`,
          ]
            .filter(Boolean)
            .join(' · '),
          c.full_address,
        ]
          .filter(Boolean)
          .join('\n'),
        source: 'finder',
        repId: req.repId,
        requestId: req.id,
        assignedAt: new Date(),
      })
      .returning({ id: leads.id });
    await db.update(finderPlaces).set({ leadId: lead.id }).where(eq(finderPlaces.id, reg.id));
    added++;
  }
  return added;
}

// ---------- Running a request ----------

const maxRounds = (quantity: number) => Math.min(20, 3 + Math.ceil(quantity / 5));

// Take the request for this run: queued, or "running" with no sign of life (the last run died).
async function claim(id: number) {
  const db = await getDb();
  const [req] = await db
    .update(leadRequests)
    .set({ finderStatus: 'running', finderBeatAt: new Date() })
    .where(
      and(
        eq(leadRequests.id, id),
        or(
          eq(leadRequests.finderStatus, 'queued'),
          and(eq(leadRequests.finderStatus, 'running'), lt(leadRequests.finderBeatAt, new Date(Date.now() - STALE_MS))),
        ),
      ),
    )
    .returning();
  return req ?? null;
}

// ---------- Web research (no Outscraper) ----------

// Finds businesses by searching the web; returns picks whose phone and name were verified against what it read.
export type Research = (
  req: LeadRequest,
  needed: number,
  cfg: FinderConfig,
) => Promise<{ picks: LeadPick[]; dropped: string[]; searched: string[]; scanned: number }>;

// Why researched businesses were left out, for the worker's log.
export let lastDropped: string[] = [];

export const mapsSearchUrl = (name: string, place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${place}`.trim())}`;

// Same rules as screen() for what the web research reports, plus never-before-given.
export async function screenResearch(picks: LeadPick[], maxReviews: number) {
  const ok = picks.filter(
    ({ cand: c }) => phone10(c.phone).length >= 7 && !hasRealWebsite(c.site) && (c.reviews == null || c.reviews <= maxReviews),
  );
  const fresh = new Set((await unseen(ok.map((p) => p.cand))).map((c) => c.place_id));
  return ok.filter((p) => fresh.has(p.cand.place_id));
}

// One round of searching. Returns true when another round should follow. `ask` is the terminal engine when
// called from `npm run finder`; otherwise the API key is used.
export async function runFinderRound(id: number, engineAsk?: Ask, research?: Research): Promise<boolean> {
  const req = await claim(id);
  if (!req) return false;
  const db = await getDb();
  const cfg = await finderConfig();
  try {
    const needed = req.quantity - req.deliveredCount;
    if (needed <= 0 || req.finderRounds >= maxRounds(req.quantity)) return finish(req);

    let picks: LeadPick[];
    let queries: string[];
    let scanned: number;
    if (cfg.outscraperKey) {
      const ask = engineAsk ?? (cfg.anthropicKey ? apiAsk(cfg.anthropicKey) : null);
      if (!ask) throw new Error('The lead finder is missing its Claude API key.');
      const searches = await planSearches(ask, req, needed, Math.min(5, 2 + Math.ceil(needed / 15)), cfg.countries);
      const results = await Promise.allSettled(searches.map((s) => searchMaps(cfg.outscraperKey!, s.query, s.region)));
      const places = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
      if (searches.length && results.every((r) => r.status === 'rejected')) throw (results[0] as PromiseRejectedResult).reason;
      const fresh = await unseen(screen(places, cfg.maxReviews));
      picks = fresh.length ? await pickBest(ask, req, fresh.slice(0, 100), needed) : [];
      queries = searches.map((s) => s.query);
      scanned = places.length;
    } else {
      if (!research) throw new Error('Without an Outscraper key, leads are found by the lead finder on your computer (npm run finder).');
      const found = await research(req, Math.min(needed, 10), cfg);
      const kept = await screenResearch(found.picks, cfg.maxReviews);
      const keptIds = new Set(kept.map((p) => p.cand.place_id));
      lastDropped = [
        ...found.dropped,
        ...found.picks.filter((p) => !keptIds.has(p.cand.place_id)).map((p) => `${p.cand.name}: already given out, or too many reviews`),
      ];
      picks = kept.slice(0, needed);
      queries = found.searched;
      scanned = found.scanned;
    }
    const added = await deliver(req, picks);

    const [after] = await db
      .update(leadRequests)
      .set({
        deliveredCount: sql`${leadRequests.deliveredCount} + ${added}`,
        finderRounds: sql`${leadRequests.finderRounds} + 1`,
        finderScanned: sql`${leadRequests.finderScanned} + ${scanned}`,
        finderQueries: [...req.finderQueries, ...queries].slice(-200),
        finderBeatAt: new Date(),
        finderError: null,
        status: req.deliveredCount + added > 0 ? 'partial' : req.status,
        // Hand over to the next round (which claims 'queued'), unless the owner stopped it meanwhile.
        finderStatus: sql`case when ${leadRequests.finderStatus} = 'running' then 'queued' else ${leadRequests.finderStatus} end`,
      })
      .where(eq(leadRequests.id, req.id))
      .returning();
    if (after.finderStatus !== 'queued') return false;
    if (after.deliveredCount >= after.quantity || after.finderRounds >= maxRounds(after.quantity)) return finish(after);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof FinderPause) {
      // Nothing was handed out this round; it runs again once Claude is available.
      await db.update(leadRequests).set({ finderStatus: 'queued', finderError: msg.slice(0, 500) }).where(eq(leadRequests.id, req.id));
      throw e;
    }
    await db.update(leadRequests).set({ finderStatus: 'failed', finderError: msg.slice(0, 500) }).where(eq(leadRequests.id, req.id));
    await notifyAdmins({ title: `Lead finder stopped on ${describeRequest(req)}`, body: msg.slice(0, 200), href: requestHref('admin', req.id) });
    return false;
  }
}

async function finish(req: LeadRequest) {
  const db = await getDb();
  const got = req.deliveredCount;
  const full = got >= req.quantity;
  await db
    .update(leadRequests)
    .set({ finderStatus: 'done', status: full ? 'fulfilled' : got > 0 ? 'partial' : 'accepted', resolvedAt: full ? new Date() : null })
    .where(eq(leadRequests.id, req.id));
  const scanned = `after checking ${req.finderScanned.toLocaleString('en-US')} businesses`;
  if (got > 0) {
    await addMessage(req.id, {
      authorId: null,
      kind: 'event',
      body: full
        ? `found all ${got} leads ${scanned}. They're in My leads.`
        : `found ${got} of ${req.quantity} leads ${scanned}. They're in My leads; the owner will follow up on the rest.`,
    });
    await notify([req.repId], { title: `${got} new lead${got === 1 ? '' : 's'} are in your list`, body: 'Found by Claude for your request.', href: '/portal/leads' });
  } else {
    await addMessage(req.id, { authorId: null, kind: 'event', body: `couldn’t find matching businesses ${scanned}. The owner will follow up.` });
  }
  if (!full) await notifyAdmins({ title: `Lead finder found ${got} of ${req.quantity} for ${describeRequest(req)}`, href: requestHref('admin', req.id) });
  return false;
}

// Start (or continue) a request's run in a fresh function call. Call inside after(). With the terminal engine
// there's nothing to start: the worker on the owner's computer picks queued requests up.
export async function kickFinder(origin: string, id: number) {
  if ((await finderConfig()).engine !== 'api') return;
  await fetch(`${origin}/api/finder/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-finder-secret': await runSecret() },
    body: JSON.stringify({ id }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
}

export const isStale = (r: Pick<LeadRequest, 'finderStatus' | 'finderBeatAt'>) =>
  (r.finderStatus === 'queued' || r.finderStatus === 'running') && (!r.finderBeatAt || Date.now() - r.finderBeatAt.getTime() > STALE_MS);

// Queue a request for the finder (new request, retry, or "find these with Claude").
export async function queueFinder(id: number) {
  const db = await getDb();
  await db
    .update(leadRequests)
    .set({
      finderStatus: 'queued',
      finderError: null,
      finderBeatAt: null,
      finderRounds: 0,
      status: sql`case when ${leadRequests.deliveredCount} > 0 then 'partial' else 'accepted' end`,
    })
    .where(eq(leadRequests.id, id));
}

export async function saveFinderKey(which: 'anthropicKey' | 'outscraperKey', value: string | null) {
  await setSetting(FINDER[which], value);
}

// Requests the terminal worker should work on: queued, or running with no sign of life.
export async function pendingFinderRequests() {
  const db = await getDb();
  return db
    .select()
    .from(leadRequests)
    .where(
      or(
        eq(leadRequests.finderStatus, 'queued'),
        and(eq(leadRequests.finderStatus, 'running'), lt(leadRequests.finderBeatAt, new Date(Date.now() - STALE_MS))),
      ),
    )
    .orderBy(leadRequests.createdAt);
}
