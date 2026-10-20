import { asc, desc, eq, isNull, sql } from 'drizzle-orm';
import Link from 'next/link';
import { deleteSale, setCommissionPaid, updateSale } from '@/app/admin/actions';
import { ActionForm, ConfirmButton, Submit } from '@/components/action-form';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { sales, SALE_STATUSES, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { fmtDate, money, SALE_STATUS_CLASS, SALE_STATUS_LABEL } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminSales({ searchParams }: PageProps<'/admin/sales'>) {
  await requireAdmin();
  const repId = Number((await searchParams).rep) || null;
  const db = await getDb();
  const [rows, owedByRep, reps] = await Promise.all([
    db
      .select({ s: sales, rep: users.name })
      .from(sales)
      .innerJoin(users, eq(users.id, sales.repId))
      .where(repId ? eq(sales.repId, repId) : undefined)
      .orderBy(desc(sales.closedAt))
      .limit(500),
    db
      .select({ repId: sales.repId, name: users.name, owed: sql<number>`sum(${sales.commissionCents})::int`, n: sql<number>`count(*)::int` })
      .from(sales)
      .innerJoin(users, eq(users.id, sales.repId))
      .where(sql`${isNull(sales.commissionPaidAt)} and ${sales.status} <> 'refunded'`)
      .groupBy(sales.repId, users.name)
      .orderBy(asc(users.name)),
    db.select({ id: users.id, name: users.name }).from(users).orderBy(asc(users.name)),
  ]);

  return (
    <>
      <PageHeader title="Sales & payouts" sub="Company profit = price − rep commission − build cost.">
        <form className="flex gap-2">
          <select name="rep" defaultValue={repId ?? ''} className="input w-44">
            <option value="">All reps</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button className="btn">Filter</button>
        </form>
      </PageHeader>

      <div className="card mb-4">
        <p className="h2">Commission owed</p>
        {owedByRep.length ? (
          <ul className="mt-2 divide-y divide-zinc-100">
            {owedByRep.map((o) => (
              <li key={o.repId} className="flex items-center gap-3 py-2 text-sm">
                <span className="font-medium">{o.name}</span>
                <span className="text-zinc-500">{o.n} sale{o.n === 1 ? '' : 's'}</span>
                <span className="ml-auto font-semibold tabular-nums text-amber-600">{money(o.owed)}</span>
                <form action={setCommissionPaid}>
                  <input type="hidden" name="repId" value={o.repId} />
                  <input type="hidden" name="paid" value="1" />
                  <ConfirmButton message={`Mark ${money(o.owed)} as paid to ${o.name}?`}>Mark all paid</ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>All commissions are paid up.</Empty>
        )}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Closed</th>
              <th>Rep</th>
              <th>Client / package</th>
              <th className="text-right">Price</th>
              <th className="text-right">Commission</th>
              <th className="text-right">Build cost</th>
              <th className="text-right">Profit</th>
              <th>Client payment</th>
              <th>Payout</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, rep }) => {
              const profit = s.status === 'refunded' ? 0 : s.priceCents - s.commissionCents - s.buildCostCents;
              return (
                <tr key={s.id} className={s.status === 'refunded' ? 'opacity-50' : ''}>
                  <td className="whitespace-nowrap text-zinc-500">{fmtDate(s.closedAt)}</td>
                  <td>
                    <Link href={`/admin/reps/${s.repId}`} className="hover:underline">{rep}</Link>
                  </td>
                  <td>
                    <p className="font-medium">{s.clientName}</p>
                    <p className="text-xs text-zinc-500">
                      {s.packageName}
                      {s.monthlyCents ? ` · ${money(s.monthlyCents)}/mo` : ''}
                    </p>
                  </td>
                  <td className="text-right tabular-nums">{money(s.priceCents)}</td>
                  <td className="text-right tabular-nums">
                    {money(s.commissionCents)}
                    <p className="text-xs text-zinc-500">{s.commissionPct}%</p>
                  </td>
                  <td className="text-right tabular-nums">{money(s.buildCostCents)}</td>
                  <td className="text-right font-medium tabular-nums text-green-700">{money(profit)}</td>
                  <td>
                    <Badge className={SALE_STATUS_CLASS[s.status]}>{SALE_STATUS_LABEL[s.status]}</Badge>
                    {s.status === 'deposit' && <p className="text-xs text-zinc-500">{money(s.collectedCents)} in</p>}
                  </td>
                  <td>
                    {s.status !== 'refunded' && (
                      <form action={setCommissionPaid}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="paid" value={s.commissionPaidAt ? '0' : '1'} />
                        <button className={`badge ${s.commissionPaidAt ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`} title="Click to toggle">
                          {s.commissionPaidAt ? `Paid ${fmtDate(s.commissionPaidAt)}` : 'Owed'}
                        </button>
                      </form>
                    )}
                  </td>
                  <td>
                    <details>
                      <summary className="cursor-pointer text-xs text-brand-600">Edit</summary>
                      <ActionForm action={updateSale} className="mt-2 grid w-64 gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <select name="status" defaultValue={s.status} className="input">
                          {SALE_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {SALE_STATUS_LABEL[st]}
                            </option>
                          ))}
                        </select>
                        <label className="label">Price ($)<input name="price" defaultValue={s.priceCents / 100} className="input" /></label>
                        <label className="label">Collected ($)<input name="collected" defaultValue={s.collectedCents / 100} className="input" /></label>
                        <label className="label">Commission %<input name="commissionPct" defaultValue={s.commissionPct} className="input" /></label>
                        <label className="label">Build cost ($)<input name="buildCost" defaultValue={s.buildCostCents / 100} className="input" /></label>
                        <label className="label">Monthly ($)<input name="monthly" defaultValue={s.monthlyCents / 100} className="input" /></label>
                        <Submit className="btn btn-primary btn-sm">Save</Submit>
                      </ActionForm>
                      <form action={deleteSale} className="mt-2">
                        <input type="hidden" name="id" value={s.id} />
                        <ConfirmButton message="Delete this sale permanently?" className="text-xs text-red-600 hover:underline">
                          Delete sale
                        </ConfirmButton>
                      </form>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <Empty>No sales yet.</Empty>}
      </div>
    </>
  );
}
