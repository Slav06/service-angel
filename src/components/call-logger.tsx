'use client';

import { useState } from 'react';
import { logCall } from '@/app/portal/actions';
import { OUTCOMES, type Outcome } from '@/db/schema';
import { OUTCOME_LABEL } from '@/lib/format';
import { ActionForm, Submit } from './action-form';

// Fast call logging: pick the lead, tap the outcome, save.
export function CallLogger({ leads, leadId }: { leads?: { id: number; business: string }[]; leadId?: number }) {
  const [outcome, setOutcome] = useState<Outcome | ''>('');
  return (
    <ActionForm action={logCall} reset className="space-y-3">
      {leadId ? (
        <input type="hidden" name="leadId" value={leadId} />
      ) : (
        <div>
          <label className="label">Lead (optional)</label>
          <select name="leadId" className="input">
            <option value="">— Cold call / not in my list —</option>
            {leads?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.business}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label">How did it go?</label>
        <input type="hidden" name="outcome" value={outcome} />
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {OUTCOMES.filter((o) => o !== 'connected').map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOutcome(o)}
              className={`rounded-md border px-2 py-2 text-xs font-medium ${outcome === o ? 'border-brand-600 bg-brand-600 text-white' : 'border-zinc-300 hover:bg-zinc-50'}`}
            >
              {OUTCOME_LABEL[o]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Minutes on call</label>
          <input name="minutes" type="number" min={0} max={600} defaultValue={0} className="input" />
        </div>
        <div>
          <label className="label">Follow up on</label>
          <input name="followUp" type="date" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" rows={2} className="input" placeholder="What did they say?" />
      </div>
      <Submit className="btn btn-primary w-full">Log call</Submit>
    </ActionForm>
  );
}
