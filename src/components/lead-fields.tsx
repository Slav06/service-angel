import type { Lead } from '@/db/schema';

export function LeadFields({ lead }: { lead?: Lead }) {
  const f = (name: keyof Lead, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label">{label}</label>
      <input name={name} defaultValue={(lead?.[name] as string) ?? ''} className="input" {...props} />
    </div>
  );
  return (
    <>
      {f('business', 'Business name *', { required: true })}
      {f('contactName', 'Contact name')}
      {f('phone', 'Phone', { type: 'tel' })}
      {f('email', 'Email', { type: 'email' })}
      {f('website', 'Current website')}
      {f('city', 'City')}
      {f('niche', 'Type of business')}
    </>
  );
}
