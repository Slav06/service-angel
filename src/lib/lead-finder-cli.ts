import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { leads } from '@/db/schema';
import { anyIsBlank, FinderPause, hasRealWebsite, mapsSearchUrl, phone10, WHO, type Ask, type LeadPick, type Research } from './lead-finder';
import { describeRequest } from './requests';

// The lead finder's terminal engine: answers with the owner's Claude subscription by running Claude Code
// headless (`claude -p`). Lean on purpose: only the tools a question needs, no settings, project files, memory,
// MCP servers or skills, and our own system prompt, so each call costs about what it says.
const CLAUDE = process.env.CLAUDE_BIN ?? 'claude';
const workDir = mkdtempSync(path.join(tmpdir(), 'lead-finder-'));
const LEAN = ['--setting-sources', '', '--no-session-persistence', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--disable-slash-commands'];

type CliResult = { type?: string; is_error?: boolean; subtype?: string; result?: string; structured_output?: unknown };

function run(args: string[], input: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE, args, { cwd: workDir, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Claude took too long to answer.'));
    }, timeoutMs);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`Couldn't start Claude Code (${e.message}). Is \`claude\` installed and signed in?`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (out.trim()) resolve(out);
      else reject(new Error(`Claude Code exited (${code}): ${err.trim().slice(0, 300) || 'no output'}`));
    });
    child.stdin.end(input);
  });
}

// Claude Code validates the schema itself and rejects the draft-2020-12 "$schema" marker zod adds.
function jsonSchema(schema: z.ZodType) {
  const s: Record<string, unknown> = { ...z.toJSONSchema(schema) };
  delete s.$schema;
  return JSON.stringify(s);
}

function answer<T extends z.ZodType>(res: CliResult | undefined, schema: T): z.infer<T> {
  if (!res || res.is_error || res.structured_output == null) {
    const why = res?.result ?? res?.subtype ?? 'no answer';
    // Usage limits and rate limits clear up on their own: pause instead of failing the request.
    if (/limit|rate|overloaded|529|try again/i.test(why)) throw new FinderPause(`Claude is busy or at its usage limit: ${why.slice(0, 200)}`);
    if (/log ?in|auth|credential/i.test(why)) throw new FinderPause(`Claude Code isn't signed in: ${why.slice(0, 200)}`);
    throw new Error(`Claude didn't answer: ${why.slice(0, 300)}`);
  }
  return schema.parse(res.structured_output);
}

export const cliAsk: Ask = async (effort, schema, system, user) => {
  const args = ['-p', '--output-format', 'json', '--json-schema', jsonSchema(schema), '--system-prompt', system, '--effort', effort, '--tools', '', ...LEAN];
  const raw = await run(args, user, 8 * 60_000);
  let res: CliResult;
  try {
    res = JSON.parse(raw);
  } catch {
    throw new Error(`Claude Code gave an unreadable answer: ${raw.slice(0, 200)}`);
  }
  return answer(res, schema);
};

// ---------- Web research ----------

const ResearchSchema = z.object({
  businesses: z.array(
    z.object({
      name: z.string(),
      phone: z.string().describe('Exactly as written on source_url'),
      city: z.string(),
      region: z.string().describe('State, province or county'),
      country: z.string().describe('Two-letter country code, e.g. US'),
      category: z.string(),
      address: z.string().nullable(),
      has_own_website: z.boolean().describe('True if you found a website of their own (not a social or directory page)'),
      social_url: z.string().nullable().describe('Their own Facebook or Instagram page, or null'),
      google_reviews: z.number().int().nullable().describe('Google review count you saw, or null if not checked'),
      source_url: z.string().describe('The page where you read the phone number'),
      score: z.number().int().describe('1-10: how good a website lead this is'),
      why: z.string().describe('One short sentence for the rep on why this business needs a website'),
    }),
  ),
  searches: z.array(z.string()).describe('The searches you ran, e.g. "plumber Joplin MO"'),
});

// Phone numbers seen in what Claude actually read, keyed by their last 9 digits (last 7 for short numbers).
function phonesIn(text: string) {
  const keys = new Set<string>();
  for (const m of text.matchAll(/\+?\(?\d[\d\s().\-–]{5,}\d/g)) {
    const d = m[0].replace(/\D/g, '');
    if (d.length >= 7) keys.add(d.length >= 9 ? d.slice(-9) : d.slice(-7));
  }
  return keys;
}
const phoneKey = (p: string) => {
  const d = p.replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : d.slice(-7);
};
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const cliResearch: Research = async (req, needed, cfg) => {
  const db = await getDb();
  const given = await db.select({ business: leads.business }).from(leads).where(eq(leads.requestId, req.id));
  const system = `${WHO}

You find these businesses yourself by searching the web (WebSearch) and reading pages (WebFetch): Google results, Yelp, Facebook pages,
Yellow Pages, local directories, chamber of commerce lists. Every business you return must:
- be a real business you found on a page in this task. Copy its phone number exactly as written on that page and give that page as
  source_url. Never guess, complete or reformat a number from memory — anything not on a page you read will be thrown out.
- have no website of its own. Search "<name> <town>" to check. Being listed in directories, or having only a Facebook or
  Instagram page (put that in social_url), is fine; if it has a website of its own, leave it out.
- have few Google reviews — at most ${cfg.maxReviews} — when you can see the count; give the count, or null if you couldn't check.
- be small and owner-run: no chains, franchises, branches or larger companies.
Work efficiently: start from directory or listing pages that show many local businesses with phone numbers, then check the
promising ones. Stop as soon as you have the number asked for.
When the rep didn't name a business type, mix several types from the list above (no more than a third of one type), and spread
across different towns.`;
  const user = `Rep's request: ${describeRequest(req)}
Niche: ${anyIsBlank(req.niche) ?? 'any (choose business types from the list above)'} · Area: ${anyIsBlank(req.area) ?? `any town in ${cfg.countries.join(', ')} (prefer small towns and suburbs)`}
Rep's notes: ${req.notes ?? 'none'}
Searches already done for this request — try different towns or types: ${req.finderQueries.length ? req.finderQueries.slice(-40).join(' | ') : 'none'}
Already given for this request — don't return again: ${given.length ? given.map((g) => g.business).join(' | ') : 'none'}

Find ${needed} businesses.`;

  const args = [
    '-p', '--output-format', 'stream-json', '--verbose',
    '--json-schema', jsonSchema(ResearchSchema),
    '--system-prompt', system,
    '--effort', 'medium',
    '--tools', 'WebSearch,WebFetch', '--allowedTools', 'WebSearch,WebFetch',
    '--max-turns', '60',
    ...LEAN,
  ];
  const raw = await run(args, user, 20 * 60_000);
  if (process.env.FINDER_DEBUG_DIR) writeFileSync(path.join(process.env.FINDER_DEBUG_DIR, `research-${req.id}-${Date.now()}.jsonl`), raw);

  // Everything the web tools returned is the evidence; the final line carries the answer.
  let evidence = '';
  let result: CliResult | undefined;
  for (const line of raw.split('\n')) {
    let m: { type?: string; message?: { content?: unknown } } & CliResult;
    try {
      m = JSON.parse(line);
    } catch {
      continue;
    }
    if (m.type === 'result') result = m;
    if (m.type === 'user' && Array.isArray(m.message?.content)) {
      for (const c of m.message.content as { type?: string; content?: unknown }[]) {
        if (c.type === 'tool_result') evidence += `\n${typeof c.content === 'string' ? c.content : JSON.stringify(c.content)}`;
      }
    }
  }
  const out = answer(result, ResearchSchema);
  const seenPhones = phonesIn(evidence);
  const seenText = words(evidence);

  const picks: LeadPick[] = [];
  const dropped: string[] = [];
  for (const b of out.businesses) {
    const digits = phone10(b.phone);
    const firstWords = words(b.name).split(' ').slice(0, 2).join(' ');
    // The anti-invention check: the number and the name must both appear in what Claude read.
    if (digits.length < 7 || !seenPhones.has(phoneKey(b.phone))) {
      dropped.push(`${b.name}: phone ${b.phone} not on any page read`);
      continue;
    }
    if (!firstWords || !seenText.includes(firstWords)) {
      dropped.push(`${b.name}: name not on any page read`);
      continue;
    }
    if (b.has_own_website) {
      dropped.push(`${b.name}: has its own website`);
      continue;
    }
    // Keep a social page as the lead's "current page"; a directory URL isn't theirs, so it's not kept.
    const social = b.social_url && /^https?:\/\//i.test(b.social_url) ? b.social_url : null;
    const site = social && !hasRealWebsite(social) ? social : null;
    const country = b.country.trim().toUpperCase().slice(0, 2);
    picks.push({
      cand: {
        place_id: `web:${country}:${b.phone.replace(/\D/g, '')}`,
        name: b.name.trim().slice(0, 200),
        phone: b.phone.trim(),
        site,
        city: b.city,
        state: b.region,
        country_code: country,
        category: b.category,
        full_address: b.address,
        reviews: b.google_reviews,
        rating: null,
        location_link: mapsSearchUrl(b.name, `${b.city} ${b.region}`),
      },
      score: Math.max(1, Math.min(10, b.score)),
      why: b.why.trim().slice(0, 300),
    });
  }
  return { picks, dropped, searched: out.searches.map((q) => q.slice(0, 150)), scanned: out.businesses.length };
};
