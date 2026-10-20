import Link from 'next/link';
import { logout } from '@/app/auth-actions';
import type { User } from '@/db/schema';
import { Logo } from './logo';

export type NavItem = { href: string; label: string; badge?: number };

export function AppShell({ user, nav, switchTo, children }: { user: User; nav: NavItem[]; switchTo?: NavItem; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-zinc-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-4 py-3 lg:block lg:py-5">
          <Link href="/" className="text-sm">
            <Logo />
          </Link>
          <form action={logout} className="ml-auto lg:hidden">
            <button className="text-xs text-zinc-500 hover:underline">Sign out</button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:px-3">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {n.label}
              {!!n.badge && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">{n.badge}</span>}
            </Link>
          ))}
          {switchTo && (
            <Link
              href={switchTo.href}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 lg:mt-4"
            >
              {switchTo.label} →
            </Link>
          )}
        </nav>
        <div className="hidden px-6 pt-6 text-xs text-zinc-500 lg:block">
          <p className="font-medium text-zinc-800">{user.name}</p>
          <p>{user.role === 'admin' ? 'Owner / admin' : 'Sales rep'}</p>
          <form action={logout} className="mt-2">
            <button className="hover:underline">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
