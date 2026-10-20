import { redirect } from 'next/navigation';
import { RegisterForm } from '@/app/login/forms';
import { AuthShell } from '@/components/auth-shell';
import { getUser } from '@/lib/auth';
import { homeFor } from '@/lib/auth-home';
import { generateKey } from '@/lib/auth-key';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Join the team', robots: { index: false } };

export default async function Join() {
  const user = await getUser();
  if (user) redirect(homeFor(user));
  return (
    <AuthShell>
      <RegisterForm suggestion={generateKey()} />
    </AuthShell>
  );
}
