import { desc, eq } from 'drizzle-orm';
import { cancelRequest, requestLeads } from '@/app/portal/actions';
import { ActionForm, Submit } from '@/components/action-form';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { leadRequests } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { fmtDate, REQUEST_STATUS_CLASS } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Requests() {
  const user = await requireUser();
  const db = await getDb();
  const rows = await db.select().from(leadRequests).where(eq(leadRequests.repId, user.id)).orderBy(desc(leadRequests.createdAt));
  return (
    <>
      <PageHeader title="Request leads" sub="Running low? Ask for more — the owner gets notified and assigns them to you." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <ActionForm action={requestLeads} reset className="card h-fit space-y-3">
          <div>
            <label className="label">How many leads?</label>
            <input name="quantity" type="number" min={1} max={500} defaultValue={50} required className="input" />
          </div>
          <div>
            <label className="label">Type of business (optional)</label>
            <input name="niche" placeholder="e.g. roofers, dentists, restaurants" className="input" />
          </div>
          <div>
            <label className="label">Area (optional)</label>
            <input name="area" placeholder="e.g. Miami, Broward County" className="input" />
          </div>
          <div>
            <label className="label">How soon?</label>
            <select name="urgency" className="input">
              <option value="normal">Normal</option>
              <option value="urgent">Urgent — I’m out of leads</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" rows={2} className="input" />
          </div>
          <Submit className="btn btn-primary w-full">Send request</Submit>
        </ActionForm>
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Requested</th>
                <th>Qty</th>
                <th>Niche / area</th>
                <th>Status</th>
                <th>Delivered</th>
                <th>Owner note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-zinc-500">{fmtDate(r.createdAt)}</td>
                  <td className="tabular-nums">{r.quantity}</td>
                  <td>
                    {[r.niche, r.area].filter(Boolean).join(' · ') || <span className="text-zinc-400">Any</span>}
                    {r.urgency === 'urgent' && <Badge className="ml-1.5 bg-red-100 text-red-700">Urgent</Badge>}
                  </td>
                  <td>
                    <Badge className={REQUEST_STATUS_CLASS[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="tabular-nums">{r.deliveredCount || '—'}</td>
                  <td className="text-zinc-600">{r.adminNote}</td>
                  <td>
                    {r.status === 'pending' && (
                      <form action={cancelRequest}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="text-xs text-zinc-500 hover:text-red-600">Cancel</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty>No requests yet.</Empty>}
        </div>
      </div>
    </>
  );
}
