import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { Badge, Empty, PageHeader, Stat } from '@/components/ui';
import { getDb } from '@/db';
import { sales } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { fmtDate, money, SALE_STATUS_CLASS, SALE_STATUS_LABEL } from '@/lib/format';
import { commissionOwed, statsFor } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function MySales({ searchParams }: PageProps<'/portal/sales'>) {
  const user = await requireUser();
  const { added } = await searchParams;
  const db = await getDb();
  const [rows, all, owed] = await Promise.all([
    db.select().from(sales).where(eq(sales.repId, user.id)).orderBy(desc(sales.closedAt)),
    statsFor(user.id, 'all'),
    commissionOwed(user.id),
  ]);
  return (
    <>
      <PageHeader title="My sales">
        <Link href="/portal/sales/new" className="btn btn-primary">+ Record sale</Link>
      </PageHeader>
      {added && <p className="card mb-4 border-green-200 bg-green-50 text-sm text-green-800">🎉 Sale recorded — great work!</p>}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lifetime revenue" value={money(all.revenue)} sub={`${all.deals} deals`} tone="brand" />
        <Stat label="Lifetime commission" value={money(all.commission)} tone="good" />
        <Stat label="Commission owed to you" value={money(owed.owed)} />
        <Stat label="Commission paid out" value={money(owed.paid)} />
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Closed</th>
              <th>Client</th>
              <th>Package</th>
              <th className="text-right">Price</th>
              <th className="text-right">Monthly</th>
              <th>Client payment</th>
              <th className="text-right">Commission</th>
              <th>Payout</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className={s.status === 'refunded' ? 'opacity-50' : ''}>
                <td className="whitespace-nowrap text-zinc-500">{fmtDate(s.closedAt)}</td>
                <td className="font-medium">{s.clientName}</td>
                <td>{s.packageName}</td>
                <td className="text-right tabular-nums">{money(s.priceCents)}</td>
                <td className="text-right tabular-nums">{s.monthlyCents ? `${money(s.monthlyCents)}/mo` : '—'}</td>
                <td>
                  <Badge className={SALE_STATUS_CLASS[s.status]}>{SALE_STATUS_LABEL[s.status]}</Badge>
                </td>
                <td className="text-right font-medium tabular-nums text-green-700">{money(s.commissionCents)}</td>
                <td>
                  {s.status === 'refunded' ? (
                    <span className="text-xs text-zinc-500">Void</span>
                  ) : s.commissionPaidAt ? (
                    <Badge className="bg-green-100 text-green-800">Paid {fmtDate(s.commissionPaidAt)}</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800">Owed</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>No sales yet — your first one is coming!</Empty>}
      </div>
    </>
  );
}
