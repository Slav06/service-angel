import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import Link from 'next/link';
import { CallButton } from '@/components/call-button';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { leads, STAGES } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { ago, dueCutoff, fmtDate, isStage, STAGE_CLASS, STAGE_LABEL } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MyLeads({ searchParams }: PageProps<'/portal/leads'>) {
  const user = await requireUser();
  const { stage, q } = await searchParams;
  const db = await getDb();
  const conds = [eq(leads.repId, user.id)];
  if (isStage(stage)) conds.push(eq(leads.stage, stage));
  else if (stage !== 'all') conds.push(sql`${leads.stage} not in ('won', 'lost')`);
  if (typeof q === 'string' && q.trim()) {
    const like = `%${q.trim()}%`;
    conds.push(or(ilike(leads.business, like), ilike(leads.contactName, like), ilike(leads.phone, like), ilike(leads.city, like))!);
  }
  const rows = await db
    .select()
    .from(leads)
    .where(and(...conds))
    .orderBy(sql`${leads.nextFollowUpAt} asc nulls last`, asc(sql`case when ${leads.stage} = 'new' then 0 else 1 end`), desc(leads.assignedAt))
    .limit(500);
  const cutoff = dueCutoff().getTime();
  const tab = (s: string, label: string) => (
    <Link
      key={s}
      href={`/portal/leads?stage=${s}`}
      className={`rounded-md px-2.5 py-1 text-xs font-medium ${(stage ?? 'open') === s ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-200'}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader title="My leads" sub="Follow-ups due first, then fresh leads.">
        <div className="flex gap-2">
          <Link href="/portal/requests" className="btn">Request more leads</Link>
          <Link href="/portal/leads/new" className="btn btn-primary">+ Add lead</Link>
        </div>
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-1">
        {tab('open', 'Open')}
        {STAGES.map((s) => tab(s, STAGE_LABEL[s]))}
        {tab('all', 'All')}
        <form className="ml-auto">
          {typeof stage === 'string' && <input type="hidden" name="stage" value={stage} />}
          <input name="q" defaultValue={typeof q === 'string' ? q : ''} placeholder="Search…" className="input w-48" />
        </form>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>City / niche</th>
              <th>Stage</th>
              <th>Follow up</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const overdue = l.nextFollowUpAt && l.nextFollowUpAt.getTime() < cutoff && !['won', 'lost'].includes(l.stage);
              return (
                <tr key={l.id} className="hover:bg-zinc-50">
                  <td>
                    <Link href={`/portal/leads/${l.id}`} className="font-medium text-brand-700 hover:underline">
                      {l.business}
                    </Link>
                    {l.source === 'website' || l.source === 'referral' ? (
                      <Badge className="ml-1.5 bg-pink-100 text-pink-700">{l.source === 'referral' ? 'Your referral' : 'Inbound'}</Badge>
                    ) : l.source === 'finder' ? (
                      <Badge className="ml-1.5 bg-brand-50 text-brand-700">✨ Claude</Badge>
                    ) : null}
                  </td>
                  <td>{l.contactName}</td>
                  <td className="whitespace-nowrap">{l.phone && <CallButton phone={l.phone} name={l.business} className="hover:underline" />}</td>
                  <td className="text-zinc-600">{[l.city, l.niche].filter(Boolean).join(' · ')}</td>
                  <td>
                    <Badge className={STAGE_CLASS[l.stage]}>{STAGE_LABEL[l.stage]}</Badge>
                  </td>
                  <td className={overdue ? 'font-medium text-red-600' : 'text-zinc-600'}>{fmtDate(l.nextFollowUpAt)}</td>
                  <td className="text-zinc-500">{ago(l.assignedAt ?? l.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <Empty>No leads here. Request some from the owner or add your own.</Empty>}
      </div>
    </>
  );
}
