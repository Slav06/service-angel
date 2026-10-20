import { desc, eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import { requestLeads } from '@/app/portal/actions';
import { ActionForm, Submit } from '@/components/action-form';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { leadRequests, notifications } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { ago, REQUEST_STATUS_CLASS, REQUEST_STATUS_LABEL } from '@/lib/format';
import { describeRequest } from '@/lib/requests';

export const dynamic = 'force-dynamic';

export default async function Requests() {
  const user = await requireUser();
  const db = await getDb();
  const rows = await db
    .select({
      r: leadRequests,
      unread: sql<number>`(select count(*)::int from ${notifications} where ${notifications.userId} = ${user.id} and ${notifications.readAt} is null and ${notifications.href} = '/portal/requests/' || ${leadRequests.id})`,
    })
    .from(leadRequests)
    .where(eq(leadRequests.repId, user.id))
    .orderBy(desc(leadRequests.lastMessageAt));
  return (
    <>
      <PageHeader title="Request leads" sub="Ask the owner for more leads. You’ll get a notification when they answer — and can chat about it in the request." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <ActionForm action={requestLeads} className="card h-fit space-y-3">
          <p className="h2">New request</p>
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
            <label className="label">Message to the owner (optional)</label>
            <textarea name="notes" rows={2} className="input" />
          </div>
          <Submit className="btn btn-primary w-full">Send request</Submit>
        </ActionForm>

        <div className="space-y-3">
          {rows.map(({ r, unread }) => (
            <Link key={r.id} href={`/portal/requests/${r.id}`} className="card flex flex-wrap items-center gap-3 transition hover:border-brand-300 hover:shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {describeRequest(r)}
                  {r.urgency === 'urgent' && <Badge className="ml-2 bg-red-100 text-red-700">Urgent</Badge>}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Sent {ago(r.createdAt)} · last activity {ago(r.lastMessageAt)}
                  {r.deliveredCount > 0 && ` · ${r.deliveredCount} leads delivered`}
                </p>
              </div>
              {unread > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">{unread} new</span>}
              <Badge className={REQUEST_STATUS_CLASS[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
            </Link>
          ))}
          {!rows.length && (
            <div className="card">
              <Empty>No requests yet. Send your first one!</Empty>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
