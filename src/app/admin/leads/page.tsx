import { and, asc, count, desc, eq, ilike, isNull, or, type SQL } from 'drizzle-orm';
import Link from 'next/link';
import { assignLeads, deleteLeads, importLeads } from '@/app/admin/actions';
import { ActionForm, ConfirmButton, Submit } from '@/components/action-form';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { leads, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { ago, STAGE_CLASS, STAGE_LABEL } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminLeads({ searchParams }: PageProps<'/admin/leads'>) {
  await requireAdmin();
  const sp = await searchParams;
  const view = typeof sp.view === 'string' ? sp.view : sp.rep ? 'rep' : 'pool';
  const repId = Number(sp.rep) || null;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const db = await getDb();

  const conds: SQL[] = [];
  if (view === 'pool') conds.push(isNull(leads.repId));
  if (view === 'inbound') conds.push(or(eq(leads.source, 'website'), eq(leads.source, 'referral'))!);
  if (view === 'rep' && repId) conds.push(eq(leads.repId, repId));
  if (q) conds.push(or(ilike(leads.business, `%${q}%`), ilike(leads.city, `%${q}%`), ilike(leads.niche, `%${q}%`), ilike(leads.phone, `%${q}%`))!);

  const [reps, rows, [{ n: poolSize }]] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.active, true)).orderBy(asc(users.name)),
    db
      .select({ lead: leads, repName: users.name })
      .from(leads)
      .leftJoin(users, eq(users.id, leads.repId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(leads.createdAt))
      .limit(500),
    db.select({ n: count() }).from(leads).where(isNull(leads.repId)),
  ]);

  const tab = (v: string, label: string) => (
    <Link
      key={v}
      href={`/admin/leads?view=${v}`}
      className={`rounded-md px-2.5 py-1 text-xs font-medium ${view === v ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-200'}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader title="Leads" sub={`${poolSize} unassigned lead${poolSize === 1 ? '' : 's'} in the pool`} />

      <details className="card mb-4">
        <summary className="cursor-pointer font-medium">Import leads (paste from a spreadsheet or CSV)</summary>
        <ActionForm action={importLeads} reset className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <textarea
              name="csv"
              rows={8}
              required
              className="input font-mono text-xs"
              placeholder={'business,contact,phone,email,city,niche,website\nJoe’s Plumbing,Joe Smith,305-555-0100,joe@example.com,Miami,plumber,'}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Copy rows straight from Google Sheets/Excel. A header row (business, contact, phone, email, city, niche, website) is detected
              automatically; without one, columns are read in that order.
            </p>
          </div>
          <div>
            <label className="label">Niche for rows without one</label>
            <input name="niche" className="input" />
          </div>
          <div>
            <label className="label">City for rows without one</label>
            <input name="city" className="input" />
          </div>
          <div>
            <label className="label">Assign to</label>
            <select name="repId" className="input">
              <option value="">Leave in pool</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <Submit>Import</Submit>
          </div>
        </ActionForm>
      </details>

      <div className="mb-3 flex flex-wrap items-center gap-1">
        {tab('pool', 'Unassigned pool')}
        {tab('inbound', 'Website & referral')}
        {tab('all', 'All leads')}
        <form className="ml-auto flex gap-2">
          <select name="rep" defaultValue={repId ?? ''} className="input w-40">
            <option value="">Any rep</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <input name="q" defaultValue={q} placeholder="Search…" className="input w-40" />
          <button className="btn">Go</button>
        </form>
      </div>

      <form action={assignLeads} className="card overflow-x-auto p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 p-3">
          <span className="text-sm text-zinc-600">With selected:</span>
          <select name="repId" className="input w-48">
            <option value="">Unassign (back to pool)</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                Assign to {r.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary">Apply</button>
          <span className="ml-auto" />
          <ConfirmButton message="Delete the selected leads? This can’t be undone." className="btn btn-sm text-red-600" formAction={deleteLeads}>
            Delete selected
          </ConfirmButton>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th className="w-8" />
              <th>Business</th>
              <th>Contact</th>
              <th>City / niche</th>
              <th>Source</th>
              <th>Rep</th>
              <th>Stage</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ lead: l, repName }) => (
              <tr key={l.id} className="hover:bg-zinc-50">
                <td>
                  <input type="checkbox" name="leadIds" value={l.id} />
                </td>
                <td>
                  <p className="font-medium">{l.business}</p>
                  {l.message && <p className="max-w-xs truncate text-xs text-zinc-500" title={l.message}>{l.message}</p>}
                </td>
                <td className="text-zinc-600">
                  {l.contactName}
                  {l.phone && <p className="text-xs">{l.phone}</p>}
                  {l.email && <p className="text-xs">{l.email}</p>}
                </td>
                <td className="text-zinc-600">{[l.city, l.niche].filter(Boolean).join(' · ')}</td>
                <td>
                  <Badge className={l.source === 'website' || l.source === 'referral' ? 'bg-pink-100 text-pink-700' : 'bg-zinc-100 text-zinc-600'}>
                    {l.source}
                  </Badge>
                </td>
                <td>{repName ?? <span className="text-zinc-400">Pool</span>}</td>
                <td>
                  <Badge className={STAGE_CLASS[l.stage]}>{STAGE_LABEL[l.stage]}</Badge>
                </td>
                <td className="text-zinc-500">{ago(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>No leads in this view.</Empty>}
      </form>
    </>
  );
}
