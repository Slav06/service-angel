import { desc, eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Badge, Empty, PageHeader, Stat } from '@/components/ui';
import { getDb } from '@/db';
import { payments, sales } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { monthLabel } from '@/lib/billing';
import { fmtDate, money, SALE_STATUS_CLASS, SALE_STATUS_LABEL } from '@/lib/format';
import { commissionOwed, statsFor } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function MyClients({ searchParams }: PageProps<'/portal/sales'>) {
  const user = await requireUser();
  const { added } = await searchParams;
  const db = await getDb();
  const [clients, recent, all, owed] = await Promise.all([
    db
      .select({
        s: sales,
        months: sql<number>`(select count(*)::int from ${payments} where ${payments.saleId} = ${sales.id} and ${payments.kind} = 'monthly')`,
        earned: sql<number>`(select coalesce(sum(${payments.commissionCents}), 0)::int from ${payments} where ${payments.saleId} = ${sales.id})`,
        lastPaid: sql<Date | null>`(select max(${payments.paidAt}) from ${payments} where ${payments.saleId} = ${sales.id})`,
      })
      .from(sales)
      .where(eq(sales.repId, user.id))
      .orderBy(desc(sales.closedAt)),
    db
      .select({ p: payments, client: sales.clientName })
      .from(payments)
      .innerJoin(sales, eq(sales.id, payments.saleId))
      .where(eq(payments.repId, user.id))
      .orderBy(desc(payments.paidAt))
      .limit(50),
    statsFor(user.id, 'all'),
    commissionOwed(user.id),
  ]);
  const monthlyIncome = Math.round(
    clients.filter((c) => c.s.status === 'active').reduce((a, c) => a + (c.s.monthlyCents * c.s.commissionPct) / 100, 0),
  );

  return (
    <>
      <PageHeader title="My clients" sub="You earn your commission on every monthly payment, for as long as the client stays.">
        <Link href="/portal/sales/new" className="btn btn-primary">+ Record sale</Link>
      </PageHeader>
      {added && <p className="card mb-4 border-green-200 bg-green-50 text-sm text-green-800">🎉 Sale recorded — great work!</p>}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Active clients" value={all.activeClients} sub={`${clients.length} signed all time`} tone="brand" />
        <Stat label="Your monthly income" value={`${money(monthlyIncome)}/mo`} sub="from active clients" tone="good" />
        <Stat label="Commission earned" value={money(all.commission)} sub="all time" />
        <Stat label="Owed to you" value={money(owed.owed)} />
        <Stat label="Paid out" value={money(owed.paid)} />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Signed</th>
              <th>Client</th>
              <th className="text-right">Monthly</th>
              <th>Status</th>
              <th className="text-right">Months paid</th>
              <th>Last payment</th>
              <th className="text-right">You’ve earned</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(({ s, months, earned, lastPaid }) => (
              <tr key={s.id} className={s.status === 'cancelled' ? 'opacity-60' : ''}>
                <td className="whitespace-nowrap text-zinc-500">{fmtDate(s.closedAt)}</td>
                <td className="font-medium">{s.clientName}</td>
                <td className="text-right tabular-nums">{money(s.monthlyCents)}/mo</td>
                <td>
                  <Badge className={SALE_STATUS_CLASS[s.status]}>{SALE_STATUS_LABEL[s.status]}</Badge>
                </td>
                <td className="text-right tabular-nums">{months}</td>
                <td className="text-zinc-500">{fmtDate(lastPaid ? new Date(lastPaid) : null)}</td>
                <td className="text-right font-medium tabular-nums text-green-700">{money(earned)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!clients.length && <Empty>No clients yet — your first one is coming!</Empty>}
      </div>

      <h2 className="h2 mt-8 mb-2">Payments & your commission</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Paid</th>
              <th>Client</th>
              <th>For</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Your commission</th>
              <th>Payout</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(({ p, client }) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap text-zinc-500">{fmtDate(p.paidAt)}</td>
                <td>{client}</td>
                <td className="text-zinc-600">{p.kind === 'setup' ? 'Setup fee' : monthLabel(p.forMonth)}</td>
                <td className="text-right tabular-nums">{money(p.amountCents)}</td>
                <td className="text-right font-medium tabular-nums text-green-700">{money(p.commissionCents)}</td>
                <td>
                  {p.commissionPaidAt ? (
                    <Badge className="bg-green-100 text-green-800">Paid {fmtDate(p.commissionPaidAt)}</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800">Owed</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!recent.length && <Empty>No payments yet. The owner records each client’s monthly payment.</Empty>}
      </div>
    </>
  );
}
