import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RepDashboard } from '@/components/rep-dashboard';
import { PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { isPeriod } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function RepView({ params, searchParams }: PageProps<'/admin/reps/[id]'>) {
  await requireAdmin();
  const repId = Number((await params).id);
  const { p } = await searchParams;
  const db = await getDb();
  const [rep] = Number.isInteger(repId) ? await db.select().from(users).where(eq(users.id, repId)) : [];
  if (!rep) notFound();
  return (
    <>
      <PageHeader title={rep.name} sub={`${rep.commissionPct}% commission · ${rep.active ? 'active' : 'turned off'}`}>
        <div className="flex gap-2">
          <Link href={`/admin/leads?rep=${rep.id}`} className="btn">Their leads</Link>
          <Link href={`/admin/sales?rep=${rep.id}`} className="btn">Their sales</Link>
          <Link href="/admin/reps" className="btn">Edit settings</Link>
        </div>
      </PageHeader>
      <RepDashboard rep={rep} period={isPeriod(p) ? p : 'month'} base={`/admin/reps/${rep.id}`} viewer="admin" />
    </>
  );
}
