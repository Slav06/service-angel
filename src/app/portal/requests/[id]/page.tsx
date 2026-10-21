import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { after } from 'next/server';
import { notFound } from 'next/navigation';
import { cancelRequest, replyToRequest } from '@/app/portal/actions';
import { ConfirmButton } from '@/components/action-form';
import { Composer } from '@/components/composer';
import { FinderProgress } from '@/components/finder-progress';
import { RequestSteps } from '@/components/request-steps';
import { Thread } from '@/components/thread';
import { Badge } from '@/components/ui';
import { getDb } from '@/db';
import { leadRequests } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { REQUEST_STATUS_CLASS, REQUEST_STATUS_LABEL } from '@/lib/format';
import { isStale, kickFinder } from '@/lib/lead-finder';
import { markReadFor } from '@/lib/notify';
import { origin } from '@/lib/origin';
import { describeRequest, loadThread, requestHref } from '@/lib/requests';

export const dynamic = 'force-dynamic';

export default async function RepRequest({ params }: PageProps<'/portal/requests/[id]'>) {
  const user = await requireUser();
  const db = await getDb();
  const [req] = await db
    .select()
    .from(leadRequests)
    .where(and(eq(leadRequests.id, Number((await params).id) || 0), eq(leadRequests.repId, user.id)));
  if (!req) notFound();
  // A finder run that died (e.g. a deploy mid-run) picks up again when someone looks at it.
  if (isStale(req)) {
    const base = await origin();
    after(() => kickFinder(base, req.id));
  }
  await markReadFor(user.id, requestHref('rep', req.id));
  const items = await loadThread(req.id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/portal/requests" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← All requests
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{describeRequest(req)}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={REQUEST_STATUS_CLASS[req.status]}>{REQUEST_STATUS_LABEL[req.status]}</Badge>
            {req.deliveredCount > 0 && <span className="text-sm text-zinc-500">{req.deliveredCount} leads added to your list</span>}
          </div>
        </div>
        <RequestSteps status={req.status} />
      </div>

      <FinderProgress req={req} />

      {req.deliveredCount > 0 && (
        <Link href="/portal/leads?stage=new" className="card mt-4 flex items-center justify-between border-green-200 bg-green-50 text-sm text-green-800 hover:bg-green-100">
          <span>
            <b>{req.deliveredCount} new leads</b> from this request are in your lead list.
          </span>
          <span className="font-semibold">Start calling →</span>
        </Link>
      )}

      <div className="card mt-4 bg-zinc-50/60">
        <Thread items={items} me={user} />
      </div>

      <div className="card mt-4">
        <Composer action={replyToRequest} requestId={req.id} placeholder="Write a message to the owner…" />
      </div>

      {req.status === 'pending' && (
        <form action={cancelRequest} className="mt-4 text-right">
          <input type="hidden" name="id" value={req.id} />
          <ConfirmButton message="Cancel this request?" className="text-sm text-zinc-500 hover:text-red-600">
            Cancel this request
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
