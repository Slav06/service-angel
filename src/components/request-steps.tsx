import type { RequestStatus } from '@/db/schema';

const STEPS = ['Requested', 'Accepted', 'Delivered'] as const;

// Requested → Accepted → Delivered, with "Declined" replacing the tail.
export function RequestSteps({ status }: { status: RequestStatus }) {
  const reached = status === 'pending' ? 0 : status === 'accepted' || status === 'partial' ? 1 : status === 'fulfilled' ? 2 : 0;
  return (
    <ol className="flex items-center gap-2 text-xs font-medium">
      {STEPS.map((s, i) => {
        const label = status === 'denied' && i === 1 ? 'Declined' : status === 'partial' && i === 2 ? 'Partly delivered' : s;
        const on = status === 'denied' ? i <= 1 : i <= reached;
        const tone = status === 'denied' && i === 1 ? 'bg-zinc-500 text-white' : on ? 'bg-brand-600 text-white' : 'bg-zinc-200 text-zinc-500';
        if (status === 'denied' && i === 2) return null;
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className={`h-0.5 w-6 rounded ${on ? 'bg-brand-600' : 'bg-zinc-200'}`} />}
            <span className={`rounded-full px-2.5 py-1 ${tone}`}>
              {on && status !== 'denied' ? '✓ ' : ''}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
