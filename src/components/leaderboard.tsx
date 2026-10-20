import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { money, pct } from '@/lib/format';
import { repStats, type Period } from '@/lib/stats';
import { Empty } from './ui';

const MEDAL = ['🥇', '🥈', '🥉'];

export async function Leaderboard({ period, highlight, showMoney = true }: { period: Period; highlight?: number; showMoney?: boolean }) {
  const db = await getDb();
  const [reps, stats] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.active, true)),
    repStats(period),
  ]);
  const rows = reps
    .map((r) => ({ ...r, s: stats.get(r.id) }))
    .filter((r) => r.s && (r.s.calls || r.s.deals || r.s.activeClients))
    .sort((a, b) => b.s!.revenue - a.s!.revenue || b.s!.deals - a.s!.deals || b.s!.calls - a.s!.calls);
  if (!rows.length) return <Empty>No activity in this period yet.</Empty>;
  return (
    <table className="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Rep</th>
          {showMoney && <th className="text-right">Collected</th>}
          <th className="text-right">New clients</th>
          <th className="text-right">Active</th>
          <th className="text-right">Calls</th>
          <th className="text-right">Conversations</th>
          <th className="text-right">Appts</th>
          <th className="text-right">Close rate</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id} className={r.id === highlight ? 'bg-brand-50 font-medium' : ''}>
            <td className="w-10">{MEDAL[i] ?? i + 1}</td>
            <td>{r.name}{r.id === highlight && ' (you)'}</td>
            {showMoney && <td className="text-right tabular-nums">{money(r.s!.revenue)}</td>}
            <td className="text-right tabular-nums">{r.s!.deals}</td>
            <td className="text-right tabular-nums">{r.s!.activeClients}</td>
            <td className="text-right tabular-nums">{r.s!.calls}</td>
            <td className="text-right tabular-nums">{r.s!.conversations}</td>
            <td className="text-right tabular-nums">{r.s!.appointments}</td>
            <td className="text-right tabular-nums">{pct(r.s!.closeRate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
