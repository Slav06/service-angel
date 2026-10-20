import { updateProfile } from '@/app/portal/actions';
import { ActionForm, Submit } from '@/components/action-form';
import { PageHeader, Stat } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { KEY_RULE } from '@/lib/auth-key';
import { money } from '@/lib/format';
import { origin } from '@/lib/origin';

export const dynamic = 'force-dynamic';

export default async function Profile() {
  const user = await requireUser();
  const refLink = `${await origin()}/?ref=${user.id}#quote`;
  return (
    <>
      <PageHeader title="Profile" />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card">
            <p className="h2">Your referral link</p>
            <p className="mt-1 text-sm text-zinc-600">
              Send this to prospects. Anyone who requests a quote through it lands straight in <b>your</b> leads.
            </p>
            <input readOnly value={refLink} className="input mt-3 font-mono text-xs" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Commission" value={`${user.commissionPct}%`} />
            <Stat label="Monthly goal" value={money(user.monthlyGoalCents)} />
            <Stat label="Daily calls" value={user.dailyCallGoal} />
          </div>
          <p className="text-xs text-zinc-500">Your commission rate and goals are set by the owner.</p>
        </div>
        <ActionForm action={updateProfile} className="card h-fit space-y-3">
          <p className="h2">Contact & login</p>
          <div>
            <label className="label">Phone</label>
            <input name="phone" defaultValue={user.phone ?? ''} className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" defaultValue={user.email ?? ''} className="input" />
          </div>
          <div>
            <label className="label">New key (leave blank to keep your current one)</label>
            <input name="newKey" pattern="[a-zA-Z]{3,20}[0-9]{2}" title={KEY_RULE} placeholder="e.g. tiger42" className="input font-mono" />
          </div>
          <Submit>Save</Submit>
        </ActionForm>
      </div>
    </>
  );
}
