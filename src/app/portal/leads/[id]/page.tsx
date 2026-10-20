import { and, desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateLead } from '@/app/portal/actions';
import { ActionForm, Submit } from '@/components/action-form';
import { CallLogger } from '@/components/call-logger';
import { LeadFields } from '@/components/lead-fields';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { calls, leads, sales, STAGES } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { fmtDate, money, OUTCOME_CLASS, OUTCOME_LABEL, STAGE_CLASS, STAGE_LABEL } from '@/lib/format';

export const dynamic = 'force-dynamic';

const dateValue = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export default async function LeadDetail({ params }: PageProps<'/portal/leads/[id]'>) {
  const user = await requireUser();
  const leadId = Number((await params).id);
  const db = await getDb();
  const [lead] = Number.isInteger(leadId)
    ? await db.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.repId, user.id)))
    : [];
  if (!lead) notFound();
  const [history, leadSales] = await Promise.all([
    db.select().from(calls).where(eq(calls.leadId, lead.id)).orderBy(desc(calls.at)),
    db.select().from(sales).where(eq(sales.leadId, lead.id)),
  ]);

  return (
    <>
      <PageHeader
        title={lead.business}
        sub={
          <>
            <Badge className={STAGE_CLASS[lead.stage]}>{STAGE_LABEL[lead.stage]}</Badge>{' '}
            {[lead.contactName, lead.city, lead.niche].filter(Boolean).join(' · ')}
          </>
        }
      >
        <div className="flex gap-2">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="btn btn-primary">
              📞 Call {lead.phone}
            </a>
          )}
          {lead.stage !== 'won' && (
            <Link href={`/portal/sales/new?lead=${lead.id}`} className="btn">
              Record sale
            </Link>
          )}
        </div>
      </PageHeader>

      {lead.message && (
        <div className="card mb-4 border-pink-200 bg-pink-50 text-sm">
          <p className="mb-1 font-medium text-pink-800">Message from their quote request</p>
          <p className="whitespace-pre-wrap text-zinc-700">{lead.message}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card">
            <p className="h2 mb-3">Log a call with {lead.business}</p>
            <CallLogger leadId={lead.id} />
          </div>
          <div className="card">
            <p className="h2">Call history ({history.length})</p>
            {history.length ? (
              <ul className="mt-2 divide-y divide-zinc-100">
                {history.map((c) => (
                  <li key={c.id} className="py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className={OUTCOME_CLASS[c.outcome]}>{OUTCOME_LABEL[c.outcome]}</Badge>
                      <span className="text-xs text-zinc-500">{fmtDate(c.at, true)}{c.minutes ? ` · ${c.minutes} min` : ''}</span>
                    </div>
                    {c.notes && <p className="mt-1 text-zinc-700">{c.notes}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No calls yet.</Empty>
            )}
          </div>
          {leadSales.length > 0 && (
            <div className="card">
              <p className="h2">Sales</p>
              {leadSales.map((s) => (
                <p key={s.id} className="mt-2 text-sm">
                  {s.packageName} — <b>{money(s.monthlyCents)}/mo</b>, signed {fmtDate(s.closedAt)}
                </p>
              ))}
            </div>
          )}
        </div>

        <ActionForm action={updateLead} className="card grid h-fit gap-3 sm:grid-cols-2">
          <p className="h2 sm:col-span-2">Details</p>
          <input type="hidden" name="id" value={lead.id} />
          <LeadFields lead={lead} />
          <div>
            <label className="label">Stage</label>
            <select name="stage" defaultValue={lead.stage} className="input">
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Next follow-up</label>
            <input name="followUp" type="date" defaultValue={dateValue(lead.nextFollowUpAt)} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea name="notes" rows={5} defaultValue={lead.notes ?? ''} className="input" />
          </div>
          <div className="sm:col-span-2">
            <Submit>Save</Submit>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
