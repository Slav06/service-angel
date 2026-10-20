import { asc } from 'drizzle-orm';
import { savePackage } from '@/app/admin/actions';
import { ActionForm, Submit } from '@/components/action-form';
import { PageHeader } from '@/components/ui';
import { getDb } from '@/db';
import { packages, type Package } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

function PackageForm({ p }: { p?: Package }) {
  return (
    <ActionForm action={savePackage} className="card grid gap-3 sm:grid-cols-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="sm:col-span-2">
        <label className="label">Name</label>
        <input name="name" defaultValue={p?.name} required className="input" />
      </div>
      <div>
        <label className="label">Price ($)</label>
        <input name="price" defaultValue={p ? p.priceCents / 100 : ''} required className="input" />
      </div>
      <div>
        <label className="label">Monthly ($)</label>
        <input name="monthly" defaultValue={p ? p.monthlyCents / 100 : 0} className="input" />
      </div>
      <div>
        <label className="label">Build cost ($)</label>
        <input name="buildCost" defaultValue={p ? p.buildCostCents / 100 : 0} className="input" />
      </div>
      <div>
        <label className="label">Sort order</label>
        <input name="sort" type="number" defaultValue={p?.sort ?? 0} className="input" />
      </div>
      <div className="sm:col-span-6">
        <label className="label">Tagline</label>
        <input name="tagline" defaultValue={p?.tagline ?? ''} className="input" />
      </div>
      <div className="sm:col-span-4">
        <label className="label">Features (one per line)</label>
        <textarea name="features" rows={5} defaultValue={p?.features.join('\n')} className="input" />
      </div>
      <div className="space-y-2 text-sm sm:col-span-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Show on website & in sale form
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="featured" defaultChecked={p?.featured} /> “Most popular” badge
        </label>
        {p && (
          <p className="text-xs text-zinc-500">
            Margin before commission: {money(p.priceCents - p.buildCostCents)}
          </p>
        )}
        <Submit>{p ? 'Save' : 'Add package'}</Submit>
      </div>
    </ActionForm>
  );
}

export default async function Packages() {
  await requireAdmin();
  const db = await getDb();
  const rows = await db.select().from(packages).orderBy(asc(packages.sort), asc(packages.id));
  return (
    <>
      <PageHeader title="Packages & pricing" sub="What’s shown on the public website and offered in the rep sale form. Build cost is your cost to deliver — used for profit." />
      <div className="space-y-4">
        {rows.map((p) => (
          <PackageForm key={p.id} p={p} />
        ))}
        <h2 className="h2 pt-4">Add a package</h2>
        <PackageForm />
      </div>
    </>
  );
}
