'use client';

import { useState } from 'react';
import { recordSale } from '@/app/portal/actions';
import { ActionForm, Submit } from './action-form';

type Pkg = { id: number; name: string; priceCents: number; monthlyCents: number };
const dollars = (c: number) => String(c / 100);
const fmt = (n: number) => {
  const digits = Number.isInteger(n) ? 0 : 2;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits });
};

export function SaleForm({
  packages,
  leads,
  leadId,
  commissionPct,
}: {
  packages: Pkg[];
  leads: { id: number; business: string }[];
  leadId?: number;
  commissionPct: number;
}) {
  const [pkgId, setPkgId] = useState(String(packages[0]?.id ?? ''));
  const pkg = packages.find((p) => String(p.id) === pkgId);
  const [monthly, setMonthly] = useState(pkg ? dollars(pkg.monthlyCents) : '500');
  const [setup, setSetup] = useState(pkg ? dollars(pkg.priceCents) : '0');
  const perMonth = ((parseFloat(monthly.replace(/[$,]/g, '')) || 0) * commissionPct) / 100;

  return (
    <ActionForm action={recordSale} className="card grid max-w-2xl gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Which lead? (optional)</label>
        <select name="leadId" defaultValue={leadId ?? ''} className="input">
          <option value="">— Not from my lead list —</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.business}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Client / business name (leave blank to use the lead’s name)</label>
        <input name="clientName" className="input" />
      </div>
      {packages.length > 1 ? (
        <div className="sm:col-span-2">
          <label className="label">Plan</label>
          <select
            name="packageId"
            value={pkgId}
            onChange={(e) => {
              setPkgId(e.target.value);
              const p = packages.find((x) => String(x.id) === e.target.value);
              if (p) {
                setMonthly(dollars(p.monthlyCents));
                setSetup(dollars(p.priceCents));
              }
            }}
            className="input"
          >
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="packageId" value={pkgId} />
      )}
      <div>
        <label className="label">Monthly price ($/mo)</label>
        <input name="monthly" value={monthly} onChange={(e) => setMonthly(e.target.value)} inputMode="decimal" required className="input" />
      </div>
      <div>
        <label className="label">One-time setup fee ($)</label>
        <input name="setup" value={setup} onChange={(e) => setSetup(e.target.value)} inputMode="decimal" className="input" />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="firstPaid" defaultChecked /> The client paid their first month (due at signup)
      </label>
      <div className="sm:col-span-2">
        <label className="label">Notes</label>
        <textarea name="notes" rows={2} className="input" />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Submit>Record sale</Submit>
        <p className="text-sm text-zinc-600">
          You earn <b className="text-green-700">{fmt(perMonth)}/mo</b> ({commissionPct}%) for every month this client pays.
        </p>
      </div>
    </ActionForm>
  );
}
