import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { getUser } from '@/lib/auth';
import { homeFor } from '@/lib/auth-home';
import { LoginForm } from './forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in', robots: { index: false } };

export default async function Login({ searchParams }: PageProps<'/login'>) {
  const user = await getUser();
  if (user) redirect(homeFor(user));
  const { error } = await searchParams;
  return (
    <AuthShell>
      <LoginForm notice={typeof error === 'string' ? error : undefined} />
    </AuthShell>
  );
}
