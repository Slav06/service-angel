import { asc } from 'drizzle-orm';
import Link from 'next/link';
import { createRep, resetKey, updateRep } from '@/app/admin/actions';
import { ActionForm, Submit } from '@/components/action-form';
import { PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { ago } from '@/lib/format';
import { origin } from '@/lib/origin';

export const dynamic = 'force-dynamic';

export default async function Reps() {
  const me = await requireAdmin();
  const db = await getDb();
  const reps = await db.select().from(users).orderBy(asc(users.active), asc(users.name));
  const base = await origin();

  return (
    <>
      <PageHeader title="Sales reps" sub={<>Reps can also sign themselves up at <code className="text-xs">{base}/join</code> — turn off anyone you don’t recognize.</>} />

      <ActionForm action={createRep} reset className="card mb-6 grid gap-3 sm:grid-cols-6 sm:items-end">
        <input type="hidden" name="origin" value={base} />
        <div className="sm:col-span-2">
          <label className="label">New rep’s name</label>
          <input name="name" required placeholder="Maria G" className="input" />
        </div>
        <div>
          <label className="label">Commission %</label>
          <input name="commissionPct" type="number" step="0.5" min={0} max={100} defaultValue={20} className="input" />
        </div>
        <div>
          <label className="label">Monthly goal ($)</label>
          <input name="monthlyGoal" defaultValue="10000" className="input" />
        </div>
        <div>
          <label className="label">Daily call goal</label>
          <input name="dailyCallGoal" type="number" defaultValue={60} className="input" />
        </div>
        <Submit>Add rep</Submit>
      </ActionForm>

      <div className="space-y-3">
        {reps.map((r) => (
          <div key={r.id} className={`card ${r.active ? '' : 'opacity-60'}`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <Link href={`/admin/reps/${r.id}`} className="font-semibold text-brand-700 hover:underline">
                {r.name}
              </Link>
              <span className="text-xs text-zinc-500">
                {r.role === 'admin' ? 'Admin' : 'Rep'} · {r.selfRegistered ? 'signed up themselves' : 'added by owner'} · last seen {ago(r.lastSeenAt)}
                {r.phone && ` · ${r.phone}`}
                {r.email && ` · ${r.email}`}
              </span>
            </div>
            <ActionForm action={updateRep} className="grid gap-3 sm:grid-cols-7 sm:items-end">
              <input type="hidden" name="id" value={r.id} />
              <div>
                <label className="label">Commission %</label>
                <input name="commissionPct" type="number" step="0.5" min={0} max={100} defaultValue={r.commissionPct} className="input" />
              </div>
              <div>
                <label className="label">Monthly goal ($)</label>
                <input name="monthlyGoal" defaultValue={r.monthlyGoalCents / 100} className="input" />
              </div>
              <div>
                <label className="label">Daily calls</label>
                <input name="dailyCallGoal" type="number" defaultValue={r.dailyCallGoal} className="input" />
              </div>
              <div>
                <label className="label">Role</label>
                <select name="role" defaultValue={r.role} className="input">
                  <option value="rep">Rep</option>
                  <option value="admin">Admin (sees everything)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 pb-1.5 text-sm">
                <input type="checkbox" name="active" defaultChecked={r.active} disabled={r.id === me.id} />
                Active
                {r.id === me.id && <input type="hidden" name="active" value="on" />}
              </label>
              <Submit className="btn">Save</Submit>
            </ActionForm>
            <ActionForm action={resetKey} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="origin" value={base} />
              <Submit className="btn btn-sm">Reset key & get login link</Submit>
            </ActionForm>
          </div>
        ))}
      </div>
    </>
  );
}
