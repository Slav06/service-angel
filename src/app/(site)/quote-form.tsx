'use client';

import { useActionState } from 'react';
import { requestQuote, type QuoteState } from './actions';

export function QuoteForm({ refId, packages }: { refId?: string; packages: string[] }) {
  const [state, action, pending] = useActionState<QuoteState, FormData>(requestQuote, null);
  if (state && 'ok' in state) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-zinc-900 shadow-xl">
        <p className="text-3xl">🎉</p>
        <h3 className="mt-2 text-lg font-semibold">Got it — thank you!</h3>
        <p className="mt-1 text-sm text-zinc-600">A website specialist will reach out within one business day.</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-3 rounded-xl bg-white p-6 text-zinc-900 shadow-xl sm:grid-cols-2">
      {refId && <input type="hidden" name="ref" value={refId} />}
      <input name="company_fax" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div>
        <label className="label">Your name *</label>
        <input name="name" required className="input" />
      </div>
      <div>
        <label className="label">Business name *</label>
        <input name="business" required className="input" />
      </div>
      <div>
        <label className="label">Phone</label>
        <input name="phone" type="tel" className="input" />
      </div>
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" className="input" />
      </div>
      <div>
        <label className="label">City</label>
        <input name="city" className="input" />
      </div>
      <div>
        <label className="label">Type of business</label>
        <input name="niche" placeholder="e.g. plumber, salon, restaurant" className="input" />
      </div>
      <div>
        <label className="label">Current website (if any)</label>
        <input name="website" className="input" />
      </div>
      {packages.length > 0 && (
        <div>
          <label className="label">Package</label>
          <select name="package" className="input">
            <option value="">Not sure yet</option>
            {packages.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      )}
      <div className={packages.length > 0 ? 'sm:col-span-2' : ''}>
        <label className="label">Anything else?</label>
        <textarea name="message" rows={3} className="input" />
      </div>
      {state && 'error' in state && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      <button className="btn btn-primary py-2.5 text-base sm:col-span-2" disabled={pending}>
        {pending ? 'Sending…' : 'Get my free quote'}
      </button>
    </form>
  );
}
