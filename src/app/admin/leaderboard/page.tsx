import { Leaderboard } from '@/components/leaderboard';
import { PageHeader, PeriodTabs } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { isPeriod } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function AdminLeaderboard({ searchParams }: PageProps<'/admin/leaderboard'>) {
  await requireAdmin();
  const { p } = await searchParams;
  const period = isPeriod(p) ? p : 'month';
  return (
    <>
      <PageHeader title="Leaderboard">
        <PeriodTabs current={period} base="/admin/leaderboard" />
      </PageHeader>
      <div className="card overflow-x-auto p-0">
        <Leaderboard period={period} />
      </div>
    </>
  );
}
