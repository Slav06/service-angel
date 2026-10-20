import { and, count, eq, isNull, notInArray } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { acceptRequest, declineRequest, fulfillRequest, markDelivered, sendToRep } from '@/app/admin/actions';
import { ActionForm, ConfirmButton, Submit } from '@/components/action-form';
import { Composer } from '@/components/composer';
import { RequestSteps } from '@/components/request-steps';
import { Thread } from '@/components/thread';
import { Badge, Stat } from '@/components/ui';
import { getDb } from '@/db';
import { leadRequests, leads, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { ago, pct, REQUEST_STATUS_CLASS, REQUEST_STATUS_LABEL } from '@/lib/format';
import { markReadFor } from '@/lib/notify';
import { describeRequest, loadThread, requestHref } from '@/lib/requests';
import { statsFor } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function AdminRequest({ params }: PageProps<'/admin/requests/[id]'>) {
  const admin = await requireAdmin();
  const db = await getDb();
  const [row] = await db
    .select({ r: leadRequests, rep: users })
    .from(leadRequests)
    .innerJoin(users, eq(users.id, leadRequests.repId))
    .where(eq(leadRequests.id, Number((await params).id) || 0));
  if (!row) notFound();
  const { r: req, rep } = row;
  await markReadFor(admin.id, requestHref('admin', req.id));
  const [items, month, [{ n: openLeads }], [{ n: pool }]] = await Promise.all([
    loadThread(req.id),
    statsFor(rep.id, 'month'),
    db.select({ n: count() }).from(leads).where(and(eq(leads.repId, rep.id), notInArray(leads.stage, ['won', 'lost']))),
    db.select({ n: count() }).from(leads).where(isNull(leads.repId)),
  ]);
  const open = !['fulfilled', 'denied'].includes(req.status);
  const remaining = Math.max(1, req.quantity - req.deliveredCount);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        <Link href="/admin/requests" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← All requests
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h1">
              {rep.name}: {describeRequest(req)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className={REQUEST_STATUS_CLASS[req.status]}>{REQUEST_STATUS_LABEL[req.status]}</Badge>
              {req.urgency === 'urgent' && <Badge className="bg-red-100 text-red-700">Urgent</Badge>}
              <span className="text-sm text-zinc-500">
                asked {ago(req.createdAt)}
                {req.deliveredCount > 0 && ` · ${req.deliveredCount} of ${req.quantity} delivered`}
              </span>
            </div>
          </div>
          <RequestSteps status={req.status} />
        </div>

        {req.status === 'pending' && (
          <div className="card mt-4 flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50">
            <p className="flex-1 text-sm text-amber-900">
              <b>{rep.name}</b> is waiting for your answer.
            </p>
            <form action={acceptRequest}>
              <input type="hidden" name="id" value={req.id} />
              <button className="btn btn-primary">✓ Accept</button>
            </form>
            <form action={declineRequest} className="flex gap-2">
              <input type="hidden" name="id" value={req.id} />
              <input name="note" placeholder="Reason (optional)" className="input w-44" />
              <ConfirmButton message="Decline this request?" className="btn text-red-600">
                Decline
              </ConfirmButton>
            </form>
          </div>
        )}

        <div className="card mt-4 bg-zinc-50/60">
          <Thread items={items} me={admin} />
        </div>

        <div className="card mt-4">
          <p className="h2 mb-3">Reply or send leads to {rep.name}</p>
          <Composer action={sendToRep} requestId={req.id} owner placeholder={`Message ${rep.name}… (attach your leads spreadsheet here)`} />
        </div>
      </div>

      <aside className="space-y-4 xl:pt-9">
        <div className="card">
          <div className="flex items-center justify-between">
            <p className="h2">{rep.name}</p>
            <Link href={`/admin/reps/${rep.id}`} className="text-xs text-brand-600 hover:underline">
              Full analytics →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Calls this month" value={month.calls} />
            <Stat label="New clients" value={month.deals} />
            <Stat label="Close rate" value={pct(month.closeRate)} />
            <Stat label="Open leads they hold" value={openLeads} />
          </div>
        </div>

        {open && (
          <ActionForm action={fulfillRequest} className="card space-y-3">
            <p className="h2">Assign from your lead pool</p>
            <p className="text-xs text-zinc-500">{pool} unassigned leads available. They go straight into the rep’s list.</p>
            <input type="hidden" name="id" value={req.id} />
            <div className="flex items-end gap-2">
              <div>
                <label className="label">How many</label>
                <input name="count" type="number" min={1} max={500} defaultValue={remaining} className="input w-24" />
              </div>
              <label className="flex items-center gap-1.5 pb-1.5 text-sm">
                <input type="checkbox" name="match" defaultChecked={!!(req.niche || req.area)} /> Match niche/area
              </label>
            </div>
            <input name="note" placeholder="Note to the rep (optional)" className="input" />
            <Submit className="btn w-full">Assign leads</Submit>
          </ActionForm>
        )}

        {open && req.status !== 'pending' && (
          <form action={markDelivered} className="card">
            <input type="hidden" name="id" value={req.id} />
            <p className="text-sm text-zinc-600">Sent everything another way?</p>
            <button className="btn mt-2 w-full">Mark as delivered</button>
          </form>
        )}
      </aside>
    </div>
  );
}
