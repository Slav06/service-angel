import { asc, desc, eq, isNull, sql } from 'drizzle-orm';
import Link from 'next/link';
import { addMonthForAll, addPayment, deletePayment, deleteSale, setClientStatus, setCommissionPaid, updateSale } from '@/app/admin/actions';
import { ActionForm, ConfirmButton, Submit } from '@/components/action-form';
import { Badge, Empty, PageHeader, Stat } from '@/components/ui';
import { getDb } from '@/db';
import { payments, sales, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { monthKey, monthLabel } from '@/lib/billing';
import { fmtDate, money, SALE_STATUS_CLASS, SALE_STATUS_LABEL } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminClients({ searchParams }: PageProps<'/admin/sales'>) {
  await requireAdmin();
  const repId = Number((await searchParams).rep) || null;
  const db = await getDb();
  const thisMonth = monthKey();
  const repWhere = repId ? eq(sales.repId, repId) : undefined;
  const [clients, recent, owedByRep, reps] = await Promise.all([
    db
      .select({
        s: sales,
        rep: users.name,
        months: sql<number>`(select count(*)::int from ${payments} where ${payments.saleId} = ${sales.id} and ${payments.kind} = 'monthly')`,
        collected: sql<number>`(select coalesce(sum(${payments.amountCents}), 0)::int from ${payments} where ${payments.saleId} = ${sales.id})`,
        paidThisMonth: sql<boolean>`exists (select 1 from ${payments} where ${payments.saleId} = ${sales.id} and ${payments.forMonth} = ${thisMonth} and ${payments.kind} = 'monthly')`,
      })
      .from(sales)
      .innerJoin(users, eq(users.id, sales.repId))
      .where(repWhere)
      .orderBy(sql`case ${sales.status} when 'pending' then 0 when 'active' then 1 else 2 end`, desc(sales.closedAt)),
    db
      .select({ p: payments, client: sales.clientName, rep: users.name })
      .from(payments)
      .innerJoin(sales, eq(sales.id, payments.saleId))
      .innerJoin(users, eq(users.id, payments.repId))
      .where(repId ? eq(payments.repId, repId) : undefined)
      .orderBy(desc(payments.paidAt))
      .limit(100),
    db
      .select({ repId: payments.repId, name: users.name, owed: sql<number>`sum(${payments.commissionCents})::int`, n: sql<number>`count(*)::int` })
      .from(payments)
      .innerJoin(users, eq(users.id, payments.repId))
      .where(isNull(payments.commissionPaidAt))
      .groupBy(payments.repId, users.name)
      .orderBy(asc(users.name)),
    db.select({ id: users.id, name: users.name }).from(users).orderBy(asc(users.name)),
  ]);
  const active = clients.filter((c) => c.s.status === 'active');
  const unpaid = active.filter((c) => !c.paidThisMonth);
  const mrr = active.reduce((a, c) => a + c.s.monthlyCents, 0);

  return (
    <>
      <PageHeader title="Clients & payouts" sub="Record each client’s monthly payment here — reps earn their % on every payment.">
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

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active clients" value={active.length} tone="brand" />
        <Stat label="Monthly recurring revenue" value={`${money(mrr)}/mo`} tone="good" />
        <Stat label={`Unpaid for ${monthLabel(thisMonth)}`} value={unpaid.length} sub={money(unpaid.reduce((a, c) => a + c.s.monthlyCents, 0))} />
        <Stat label="Awaiting 1st payment" value={clients.filter((c) => c.s.status === 'pending').length} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ActionForm action={addMonthForAll} className="card space-y-3">
          <p className="h2">Record a month for every active client</p>
          <p className="text-sm text-zinc-600">
            Once your clients’ payments for a month have come in, record them all at once. Clients already recorded for that month are
            skipped. Clients awaiting their 1st payment are recorded one at a time below.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="label">Month</label>
              <input type="month" name="month" defaultValue={thisMonth.slice(0, 7)} className="input" />
            </div>
            <Submit>Record payments</Submit>
          </div>
        </ActionForm>

        <div className="card">
          <p className="h2">Commission owed to reps</p>
          {owedByRep.length ? (
            <ul className="mt-2 divide-y divide-zinc-100">
              {owedByRep.map((o) => (
                <li key={o.repId} className="flex items-center gap-3 py-2 text-sm">
                  <span className="font-medium">{o.name}</span>
                  <span className="text-zinc-500">{o.n} payment{o.n === 1 ? '' : 's'}</span>
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
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Signed</th>
              <th>Client</th>
              <th>Rep</th>
              <th className="text-right">Monthly</th>
              <th>Status</th>
              <th className="text-right">Months paid</th>
              <th className="text-right">Collected</th>
              <th>{monthLabel(thisMonth)}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {clients.map(({ s, rep, months, collected, paidThisMonth }) => (
              <tr key={s.id} className={s.status === 'cancelled' ? 'opacity-60' : ''}>
                <td className="whitespace-nowrap text-zinc-500">{fmtDate(s.closedAt)}</td>
                <td>
                  <p className="font-medium">{s.clientName}</p>
                  <p className="text-xs text-zinc-500">
                    {s.packageName} · {s.commissionPct}% to rep{s.priceCents ? ` · ${money(s.priceCents)} setup` : ''}
                  </p>
                </td>
                <td>
                  <Link href={`/admin/reps/${s.repId}`} className="hover:underline">{rep}</Link>
                </td>
                <td className="text-right tabular-nums">{money(s.monthlyCents)}</td>
                <td>
                  <Badge className={SALE_STATUS_CLASS[s.status]}>{SALE_STATUS_LABEL[s.status]}</Badge>
                </td>
                <td className="text-right tabular-nums">{months}</td>
                <td className="text-right tabular-nums">{money(collected)}</td>
                <td>
                  {paidThisMonth ? (
                    <Badge className="bg-green-100 text-green-800">✓ Paid</Badge>
                  ) : s.status !== 'cancelled' ? (
                    <ActionForm action={addPayment}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="month" value={thisMonth.slice(0, 7)} />
                      <Submit className="btn btn-sm">Mark paid</Submit>
                    </ActionForm>
                  ) : null}
                </td>
                <td>
                  <details>
                    <summary className="cursor-pointer text-xs text-brand-600">Manage</summary>
                    <div className="mt-2 w-64 space-y-3">
                      <ActionForm action={addPayment} className="grid gap-2 rounded-md bg-zinc-50 p-2">
                        <p className="text-xs font-medium">Record a different month</p>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="month" name="month" defaultValue={thisMonth.slice(0, 7)} className="input" />
                        <input name="amount" placeholder={`Amount (default ${money(s.monthlyCents)})`} className="input" />
                        <Submit className="btn btn-sm">Record payment</Submit>
                      </ActionForm>
                      <ActionForm action={updateSale} className="grid gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <label className="label">Client name<input name="clientName" defaultValue={s.clientName} className="input" /></label>
                        <label className="label">Monthly ($)<input name="monthly" defaultValue={s.monthlyCents / 100} className="input" /></label>
                        <label className="label">Setup fee ($)<input name="setup" defaultValue={s.priceCents / 100} className="input" /></label>
                        <label className="label">Rep commission %<input name="commissionPct" defaultValue={s.commissionPct} className="input" /></label>
                        <label className="label">Your cost to build ($)<input name="buildCost" defaultValue={s.buildCostCents / 100} className="input" /></label>
                        <Submit className="btn btn-primary btn-sm">Save</Submit>
                      </ActionForm>
                      <div className="flex gap-3">
                        <form action={setClientStatus}>
                          <input type="hidden" name="id" value={s.id} />
                          {s.status === 'cancelled' ? (
                            <button name="to" value="active" className="text-xs text-brand-600 hover:underline">Reactivate</button>
                          ) : (
                            <>
                              <input type="hidden" name="to" value="cancelled" />
                              <ConfirmButton message={`Cancel ${s.clientName}? The rep stops earning on them.`} className="text-xs text-amber-700 hover:underline">
                                Cancel client
                              </ConfirmButton>
                            </>
                          )}
                        </form>
                        <form action={deleteSale}>
                          <input type="hidden" name="id" value={s.id} />
                          <ConfirmButton message="Delete this client and all their payments? Use only for mistakes." className="text-xs text-red-600 hover:underline">
                            Delete
                          </ConfirmButton>
                        </form>
                      </div>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!clients.length && <Empty>No clients yet.</Empty>}
      </div>

      <h2 className="h2 mt-8 mb-2">Recent payments</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Recorded</th>
              <th>Client</th>
              <th>For</th>
              <th>Rep</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Commission</th>
              <th>Payout</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {recent.map(({ p, client, rep }) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap text-zinc-500">{fmtDate(p.paidAt)}</td>
                <td>{client}</td>
                <td className="text-zinc-600">{p.kind === 'setup' ? 'Setup fee' : monthLabel(p.forMonth)}</td>
                <td>{rep}</td>
                <td className="text-right tabular-nums">{money(p.amountCents)}</td>
                <td className="text-right tabular-nums">{money(p.commissionCents)}</td>
                <td>
                  <form action={setCommissionPaid}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="paid" value={p.commissionPaidAt ? '0' : '1'} />
                    <button className={`badge ${p.commissionPaidAt ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`} title="Click to toggle">
                      {p.commissionPaidAt ? `Paid ${fmtDate(p.commissionPaidAt)}` : 'Owed'}
                    </button>
                  </form>
                </td>
                <td>
                  <form action={deletePayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmButton message="Delete this payment (recorded by mistake)?" className="text-xs text-zinc-400 hover:text-red-600">
                      ✕
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!recent.length && <Empty>No payments recorded yet.</Empty>}
      </div>
    </>
  );
}
