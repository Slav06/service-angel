import Link from 'next/link';
import { PERIODS, type Period } from '@/lib/stats';

export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'default' | 'good' | 'brand';
}) {
  const valueClass = tone === 'good' ? 'text-green-700' : tone === 'brand' ? 'text-brand-700' : 'text-zinc-900';
  return (
    <div className="card">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

export function Progress({ label, value, goal, format }: { label: string; value: number; goal: number; format: (n: number) => string }) {
  const p = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-zinc-600">
          {format(value)} / {format(goal)}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${p >= 100 ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${p}%` }} />
      </div>
      <p className="mt-1 text-xs text-zinc-500">{goal > 0 ? `${Math.round((value / goal) * 100)}% of goal` : 'No goal set'}</p>
    </div>
  );
}

// Minimal bar chart: one bar per point, tallest bar fills the height.
export function Bars({
  points,
  format,
  label,
}: {
  points: { key: string; label: string; value: number }[];
  format: (n: number) => string;
  label: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((a, p) => a + p.value, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="h2">{label}</p>
        <p className="text-xs text-zinc-500">Total {format(total)}</p>
      </div>
      <div className="mt-3 flex h-32 items-end gap-[3px]">
        {points.map((p) => (
          <div key={p.key} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-brand-500/80 group-hover:bg-brand-600"
              style={{ height: `${(p.value / max) * 100}%`, minHeight: p.value ? 2 : 0 }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
              {p.label}: {format(p.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>{points[0]?.label}</span>
        <span>{points.at(-1)?.label}</span>
      </div>
    </div>
  );
}

export function PeriodTabs({ current, base, extra = {} }: { current: Period; base: string; extra?: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(Object.keys(PERIODS) as Period[]).map((p) => (
        <Link
          key={p}
          href={`${base}?${new URLSearchParams({ ...extra, p })}`}
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${p === current ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-200'}`}
        >
          {PERIODS[p]}
        </Link>
      ))}
    </div>
  );
}

export function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`badge ${className}`}>{children}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-zinc-500">{children}</p>;
}

export function PageHeader({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="h1">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-zinc-500">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
