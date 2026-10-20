import Link from 'next/link';
import { RepDashboard } from '@/components/rep-dashboard';
import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { isPeriod } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }: PageProps<'/portal'>) {
  const user = await requireUser();
  const { p } = await searchParams;
  return (
    <>
      <PageHeader title={`Hi, ${user.name.split(' ')[0]} 👋`} sub="Your numbers, live.">
        <div className="flex gap-2">
          <Link href="/portal/calls" className="btn btn-primary">Log a call</Link>
          <Link href="/portal/sales/new" className="btn">Record a sale</Link>
        </div>
      </PageHeader>
      <RepDashboard rep={user} period={isPeriod(p) ? p : 'month'} base="/portal" viewer="self" />
    </>
  );
}
