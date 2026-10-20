import { addLead } from '@/app/portal/actions';
import { ActionForm, Submit } from '@/components/action-form';
import { LeadFields } from '@/components/lead-fields';
import { PageHeader } from '@/components/ui';

export default function NewLead() {
  return (
    <>
      <PageHeader title="Add a lead" sub="Found a prospect yourself? Add it here — it’s yours." />
      <ActionForm action={addLead} className="card grid max-w-2xl gap-3 sm:grid-cols-2">
        <LeadFields />
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea name="notes" rows={3} className="input" />
        </div>
        <div className="sm:col-span-2">
          <Submit>Add lead</Submit>
        </div>
      </ActionForm>
    </>
  );
}
