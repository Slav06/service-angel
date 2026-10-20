import { Leaderboard } from '@/components/leaderboard';
import { PageHeader, PeriodTabs } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { isPeriod } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage({ searchParams }: PageProps<'/portal/leaderboard'>) {
  const user = await requireUser();
  const { p } = await searchParams;
  const period = isPeriod(p) ? p : 'month';
  return (
    <>
      <PageHeader title="Leaderboard" sub="Ranked by revenue, then deals, then calls.">
        <PeriodTabs current={period} base="/portal/leaderboard" />
      </PageHeader>
      <div className="card overflow-x-auto p-0">
        <Leaderboard period={period} highlight={user.id} />
      </div>
    </>
  );
}
