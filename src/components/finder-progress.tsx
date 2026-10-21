import { findWithClaude, stopFinder } from '@/app/admin/actions';
import type { LeadRequest } from '@/db/schema';
import { ago } from '@/lib/format';
import { AutoRefresh } from './auto-refresh';

// What the Claude lead finder is doing on a request. The owner also gets stop / retry.
export function FinderProgress({ req, owner = false }: { req: LeadRequest; owner?: boolean }) {
  const s = req.finderStatus;
  if (!s) {
    if (!owner || req.status === 'fulfilled' || req.status === 'denied') return null;
    return (
      <form action={findWithClaude} className="card mt-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="id" value={req.id} />
        <p className="flex-1 text-sm text-zinc-700">Let Claude find these leads: owner-run businesses with no website and few reviews.</p>
        <button className="btn btn-primary">✨ Find with Claude</button>
      </form>
    );
  }
  const working = s === 'queued' || s === 'running';
  const pctDone = Math.min(100, Math.round((req.deliveredCount / Math.max(1, req.quantity)) * 100));
  return (
    <div className={`card mt-4 ${working ? 'border-brand-200 bg-brand-50/40' : s === 'failed' ? 'border-red-200 bg-red-50/50' : ''}`}>
      {working && <AutoRefresh />}
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm font-medium">
          {working && (
            <>
              <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-brand-600" />
              Claude is finding leads… {req.deliveredCount} of {req.quantity}
            </>
          )}
          {s === 'done' && `Claude found ${req.deliveredCount} of ${req.quantity} leads`}
          {s === 'stopped' && `Lead finder stopped at ${req.deliveredCount} of ${req.quantity}`}
          {s === 'failed' && (owner ? 'The lead finder hit a problem' : 'The lead finder paused — the owner has been told')}
        </p>
        {owner && working && (
          <form action={stopFinder}>
            <input type="hidden" name="id" value={req.id} />
            <button className="btn btn-sm">Stop</button>
          </form>
        )}
        {owner && !working && req.deliveredCount < req.quantity && req.status !== 'denied' && (
          <form action={findWithClaude}>
            <input type="hidden" name="id" value={req.id} />
            <button className="btn btn-sm btn-primary">{s === 'failed' ? 'Try again' : 'Find the rest'}</button>
          </form>
        )}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pctDone}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {req.finderScanned.toLocaleString('en-US')} businesses checked
        {req.finderRounds > 0 && ` in ${req.finderRounds} round${req.finderRounds === 1 ? '' : 's'} of searching`}
        {working && req.finderBeatAt && ` · last update ${ago(req.finderBeatAt)}`}
      </p>
      {owner && s === 'failed' && req.finderError && <p className="mt-2 text-xs text-red-700">{req.finderError}</p>}
      {owner && req.finderQueries.length > 0 && (
        <details className="mt-2 text-xs text-zinc-500">
          <summary className="cursor-pointer">Searches run ({req.finderQueries.length})</summary>
          <p className="mt-1">{req.finderQueries.join(' · ')}</p>
        </details>
      )}
    </div>
  );
}
