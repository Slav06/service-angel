import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { getUser } from '@/lib/auth';
import { LoginForm } from './forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in', robots: { index: false } };

export default async function Login({ searchParams }: PageProps<'/login'>) {
  if (await getUser()) redirect('/portal');
  const { error } = await searchParams;
  return (
    <AuthShell>
      <LoginForm notice={typeof error === 'string' ? error : undefined} />
    </AuthShell>
  );
}
