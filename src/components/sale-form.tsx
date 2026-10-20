'use client';

import { useState } from 'react';
import { recordSale } from '@/app/portal/actions';
import { ActionForm, Submit } from './action-form';

type Pkg = { id: number; name: string; priceCents: number; monthlyCents: number };
const dollars = (c: number) => String(c / 100);

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
  const [pkgId, setPkgId] = useState(String(packages.find((p) => p.name === 'Business')?.id ?? packages[0]?.id ?? ''));
  const pkg = packages.find((p) => String(p.id) === pkgId);
  const [price, setPrice] = useState(pkg ? dollars(pkg.priceCents) : '');
  const [monthly, setMonthly] = useState(pkg ? dollars(pkg.monthlyCents) : '0');
  const [status, setStatus] = useState('unpaid');
  const priceNum = parseFloat(price.replace(/[$,]/g, '')) || 0;

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
      <div>
        <label className="label">Package</label>
        <select
          name="packageId"
          value={pkgId}
          onChange={(e) => {
            setPkgId(e.target.value);
            const p = packages.find((x) => String(x.id) === e.target.value);
            if (p) {
              setPrice(dollars(p.priceCents));
              setMonthly(dollars(p.monthlyCents));
            }
          }}
          className="input"
        >
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="">Custom</option>
        </select>
      </div>
      {!pkgId && (
        <div>
          <label className="label">Custom package name</label>
          <input name="customName" className="input" />
        </div>
      )}
      <div>
        <label className="label">Sale price ($)</label>
        <input name="price" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" required className="input" />
      </div>
      <div>
        <label className="label">Monthly plan ($/mo)</label>
        <input name="monthly" value={monthly} onChange={(e) => setMonthly(e.target.value)} inputMode="decimal" className="input" />
      </div>
      <div>
        <label className="label">Payment status</label>
        <select name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="input">
          <option value="unpaid">Awaiting payment</option>
          <option value="deposit">Deposit paid</option>
          <option value="paid">Paid in full</option>
        </select>
      </div>
      {status === 'deposit' && (
        <div>
          <label className="label">Amount collected ($)</label>
          <input name="collected" inputMode="decimal" className="input" />
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="label">Notes</label>
        <textarea name="notes" rows={2} className="input" />
      </div>
      <div className="flex items-center gap-4 sm:col-span-2">
        <Submit>Record sale</Submit>
        <p className="text-sm text-zinc-600">
          Your commission: <b className="text-green-700">${((priceNum * commissionPct) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}</b> ({commissionPct}%)
        </p>
      </div>
    </ActionForm>
  );
}
