import { count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { leadRequests, leads, notifications, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { ago, REQUEST_STATUS_CLASS, REQUEST_STATUS_LABEL } from '@/lib/format';
import { describeRequest } from '@/lib/requests';

export const dynamic = 'force-dynamic';

export default async function AdminRequests() {
  const admin = await requireAdmin();
  const db = await getDb();
  const unread = sql<number>`(select count(*)::int from ${notifications} where ${notifications.userId} = ${admin.id} and ${notifications.readAt} is null and ${notifications.href} = '/admin/requests/' || ${leadRequests.id})`;
  const [open, closed, [{ n: pool }]] = await Promise.all([
    db
      .select({ r: leadRequests, rep: users.name, unread })
      .from(leadRequests)
      .innerJoin(users, eq(users.id, leadRequests.repId))
      .where(inArray(leadRequests.status, ['pending', 'accepted', 'partial']))
      .orderBy(sql`${leadRequests.status} = 'pending' desc`, sql`${leadRequests.urgency} = 'urgent' desc`, desc(leadRequests.lastMessageAt)),
    db
      .select({ r: leadRequests, rep: users.name, unread })
      .from(leadRequests)
      .innerJoin(users, eq(users.id, leadRequests.repId))
      .where(inArray(leadRequests.status, ['fulfilled', 'denied']))
      .orderBy(desc(leadRequests.lastMessageAt))
      .limit(50),
    db.select({ n: count() }).from(leads).where(isNull(leads.repId)),
  ]);

  const Row = ({ r, rep, unread }: (typeof open)[number]) => (
    <Link href={`/admin/requests/${r.id}`} className="card flex flex-wrap items-center gap-3 transition hover:border-brand-300 hover:shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">{rep.slice(0, 1)}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {rep} <span className="font-normal text-zinc-500">wants</span> {describeRequest(r)}
          {r.urgency === 'urgent' && <Badge className="ml-2 bg-red-100 text-red-700">Urgent</Badge>}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Asked {ago(r.createdAt)} · last activity {ago(r.lastMessageAt)}
          {r.deliveredCount > 0 && ` · ${r.deliveredCount} delivered`}
        </p>
      </div>
      {unread > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">{unread} new</span>}
      <Badge className={REQUEST_STATUS_CLASS[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
    </Link>
  );

  return (
    <>
      <PageHeader title="Lead requests" sub={`Open a request to accept it, chat with the rep, and send them leads. ${pool} unassigned lead${pool === 1 ? '' : 's'} in your pool.`} />
      <h2 className="h2 mb-2">Open</h2>
      <div className="space-y-2">
        {open.map((row) => (
          <Row key={row.r.id} {...row} />
        ))}
        {!open.length && (
          <div className="card">
            <Empty>No open requests. 🎉</Empty>
          </div>
        )}
      </div>
      <h2 className="h2 mt-8 mb-2">Closed</h2>
      <div className="space-y-2">
        {closed.map((row) => (
          <Row key={row.r.id} {...row} />
        ))}
        {!closed.length && <p className="text-sm text-zinc-500">Nothing yet.</p>}
      </div>
    </>
  );
}
