// The lead finder, running on your computer with your Claude subscription.
//   npm run finder           keep running: fills new lead requests as reps send them (leave the window open)
//   npm run finder -- --once fill whatever is waiting, then stop
// Uses the database in .env.local (the live site's) and the `claude` command you're signed into. Businesses come
// from Outscraper when its key is saved in Owner admin → Lead finder; otherwise Claude searches the web itself.
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { leadRequests, users } from '@/db/schema';
import { finderConfig, FinderPause, lastDropped, markWorkerSeen, pendingFinderRequests, runFinderRound } from '@/lib/lead-finder';
import { cliAsk, cliResearch } from '@/lib/lead-finder-cli';
import { describeRequest } from '@/lib/requests';

const once = process.argv.includes('--once');
const POLL_MS = 20_000;
const PAUSE_MS = 10 * 60_000; // after a usage limit, wait before asking Claude again

const log = (msg: string) => console.log(`${new Date().toLocaleTimeString('en-US')}  ${msg}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function work(id: number) {
  const db = await getDb();
  const [row] = await db.select({ r: leadRequests, rep: users.name }).from(leadRequests).innerJoin(users, eq(users.id, leadRequests.repId)).where(eq(leadRequests.id, id));
  if (!row) return;
  log(`Request #${id} from ${row.rep}: ${describeRequest(row.r)}`);
  for (let round = 1; ; round++) {
    const more = await runFinderRound(id, cliAsk, cliResearch);
    const [r] = await db.select().from(leadRequests).where(eq(leadRequests.id, id));
    log(`  round ${round}: ${r.deliveredCount} of ${r.quantity} found, ${r.finderScanned} businesses checked${r.finderStatus === 'failed' ? ` — stopped: ${r.finderError}` : ''}`);
    for (const d of lastDropped) log(`    left out ${d}`);
    if (!more) break;
  }
}

// One pass: check in, then fill whatever is waiting. Returns false when --once should stop early.
async function tick(state: { quietLogged: boolean }) {
  await markWorkerSeen();
  const cfg = await finderConfig();
  if (!cfg.enabled || cfg.engine !== 'terminal') {
    if (!state.quietLogged) log('Paused: the lead finder is off, or set to use the API key (Owner admin → Lead finder).');
    state.quietLogged = true;
    return true;
  }
  state.quietLogged = false;
  for (const req of await pendingFinderRequests()) {
    try {
      await work(req.id);
    } catch (e) {
      if (!(e instanceof FinderPause)) throw e;
      log(`  paused: ${e.message}. Trying again in ${PAUSE_MS / 60_000} minutes.`);
      if (once) return false;
      for (let waited = 0; waited < PAUSE_MS; waited += POLL_MS) {
        await markWorkerSeen().catch(() => {}); // still here, just waiting
        await sleep(POLL_MS);
      }
      break;
    }
  }
  return true;
}

async function main() {
  log(once ? 'Lead finder: filling waiting requests…' : 'Lead finder is running. Leave this window open; press Ctrl+C to stop.');
  const state = { quietLogged: false };
  for (;;) {
    try {
      if (!(await tick(state))) return;
    } catch (e) {
      if (once) throw e;
      // A dropped connection or a database hiccup shouldn't stop the finder overnight: note it and try again shortly.
      log(`  problem: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}. Trying again in ${POLL_MS / 1000} seconds.`);
    }
    if (once) break;
    await sleep(POLL_MS);
  }
  log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
