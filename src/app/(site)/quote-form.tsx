'use client';

import { useActionState } from 'react';
import { requestQuote, type QuoteState } from './actions';

export function QuoteForm({ refId, packages }: { refId?: string; packages: string[] }) {
  const [state, action, pending] = useActionState<QuoteState, FormData>(requestQuote, null);
  if (state && 'ok' in state) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-zinc-900 shadow-2xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">✓</span>
        <h3 className="mt-4 font-display text-2xl font-bold">Got it — thank you!</h3>
        <p className="mt-1 text-sm text-zinc-600">A website specialist will reach out within one business day.</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4 rounded-2xl bg-white p-6 text-zinc-900 shadow-2xl sm:grid-cols-2 sm:p-8">
      <div className="sm:col-span-2">
        <h3 className="font-display text-xl font-bold">Request your free quote</h3>
        <p className="mt-1 text-sm text-zinc-500">Takes about a minute. No obligation.</p>
      </div>
      {refId && <input type="hidden" name="ref" value={refId} />}
      <input name="company_fax" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div>
        <label className="label">Your name *</label>
        <input name="name" required className="input py-2.5" />
      </div>
      <div>
        <label className="label">Business name *</label>
        <input name="business" required className="input py-2.5" />
      </div>
      <div>
        <label className="label">Phone</label>
        <input name="phone" type="tel" className="input py-2.5" />
      </div>
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" className="input py-2.5" />
      </div>
      <div>
        <label className="label">City</label>
        <input name="city" className="input py-2.5" />
      </div>
      <div>
        <label className="label">Type of business</label>
        <input name="niche" placeholder="e.g. plumber, salon, restaurant" className="input py-2.5" />
      </div>
      <div>
        <label className="label">Current website (if any)</label>
        <input name="website" className="input py-2.5" />
      </div>
      {packages.length > 0 && (
        <div>
          <label className="label">Package</label>
          <select name="package" className="input py-2.5">
            <option value="">Not sure yet</option>
            {packages.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      )}
      <div className={packages.length > 0 ? 'sm:col-span-2' : ''}>
        <label className="label">Anything else?</label>
        <textarea name="message" rows={3} className="input py-2.5" />
      </div>
      {state && 'error' in state && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      <button className="rounded-lg bg-brand-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 disabled:opacity-60 sm:col-span-2" disabled={pending}>
        {pending ? 'Sending…' : 'Get my free quote →'}
      </button>
    </form>
  );
}
