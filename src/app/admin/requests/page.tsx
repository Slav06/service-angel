import { count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { closeRequest, fulfillRequest } from '@/app/admin/actions';
import { ActionForm, Submit } from '@/components/action-form';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { leadRequests, leads, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { ago, fmtDate, REQUEST_STATUS_CLASS } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminRequests({ searchParams }: PageProps<'/admin/requests'>) {
  await requireAdmin();
  const { assigned, to } = await searchParams;
  const db = await getDb();
  const [assignedTo] = to ? await db.select({ name: users.name }).from(users).where(eq(users.id, Number(to) || 0)) : [];
  const [open, closed, [{ n: pool }]] = await Promise.all([
    db
      .select({ r: leadRequests, rep: users.name })
      .from(leadRequests)
      .innerJoin(users, eq(users.id, leadRequests.repId))
      .where(inArray(leadRequests.status, ['pending', 'partial']))
      .orderBy(sql`${leadRequests.urgency} = 'urgent' desc`, leadRequests.createdAt),
    db
      .select({ r: leadRequests, rep: users.name })
      .from(leadRequests)
      .innerJoin(users, eq(users.id, leadRequests.repId))
      .where(inArray(leadRequests.status, ['fulfilled', 'denied']))
      .orderBy(desc(leadRequests.resolvedAt))
      .limit(50),
    db.select({ n: count() }).from(leads).where(isNull(leads.repId)),
  ]);

  return (
    <>
      <PageHeader title="Lead requests" sub={`${pool} unassigned lead${pool === 1 ? '' : 's'} available in the pool. Import more on the Leads page.`} />
      {assigned && assignedTo && (
        <p className="card mb-4 border-green-200 bg-green-50 text-sm text-green-800">
          ✓ Assigned {assigned} lead{assigned === '1' ? '' : 's'} to {assignedTo.name}.
        </p>
      )}
      <div className="space-y-3">
        {open.map(({ r, rep }) => (
          <div key={r.id} className="card">
            <div className="flex flex-wrap items-center gap-2">
              <b>{rep}</b> wants <b>{r.quantity - r.deliveredCount}</b> more lead{r.quantity - r.deliveredCount === 1 ? '' : 's'}
              {r.deliveredCount > 0 && <span className="text-sm text-zinc-500">({r.deliveredCount} of {r.quantity} delivered)</span>}
              {r.urgency === 'urgent' && <Badge className="bg-red-100 text-red-700">Urgent</Badge>}
              <span className="ml-auto text-xs text-zinc-500">{ago(r.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              {[r.niche && `Niche: ${r.niche}`, r.area && `Area: ${r.area}`].filter(Boolean).join(' · ') || 'Any niche, any area'}
              {r.notes && ` — “${r.notes}”`}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <ActionForm action={fulfillRequest} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={r.id} />
                <div>
                  <label className="label">How many</label>
                  <input name="count" type="number" min={1} max={500} defaultValue={r.quantity - r.deliveredCount} className="input w-24" />
                </div>
                <label className="flex items-center gap-1.5 pb-1.5 text-sm">
                  <input type="checkbox" name="match" defaultChecked={!!(r.niche || r.area)} /> Match niche/area
                </label>
                <div>
                  <label className="label">Note to rep</label>
                  <input name="note" className="input w-56" />
                </div>
                <Submit>Assign from pool</Submit>
              </ActionForm>
              <form action={closeRequest} className="flex items-end gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input name="note" placeholder="Reason (optional)" className="input w-44" />
                <button name="as" value="fulfilled" className="btn btn-sm" title="Close it — e.g. you sent leads another way">
                  Mark done
                </button>
                <button name="as" value="denied" className="btn btn-sm text-red-600">
                  Deny
                </button>
              </form>
            </div>
          </div>
        ))}
        {!open.length && (
          <div className="card">
            <Empty>No open requests. 🎉</Empty>
          </div>
        )}
      </div>

      <h2 className="h2 mt-8 mb-2">Recently closed</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Rep</th>
              <th>Asked</th>
              <th>Delivered</th>
              <th>Niche / area</th>
              <th>Status</th>
              <th>Closed</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {closed.map(({ r, rep }) => (
              <tr key={r.id}>
                <td>{rep}</td>
                <td className="tabular-nums">{r.quantity}</td>
                <td className="tabular-nums">{r.deliveredCount}</td>
                <td className="text-zinc-600">{[r.niche, r.area].filter(Boolean).join(' · ') || 'Any'}</td>
                <td>
                  <Badge className={REQUEST_STATUS_CLASS[r.status]}>{r.status}</Badge>
                </td>
                <td className="text-zinc-500">{fmtDate(r.resolvedAt)}</td>
                <td className="text-zinc-600">{r.adminNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!closed.length && <Empty>Nothing yet.</Empty>}
      </div>
    </>
  );
}
