import Link from 'next/link';
import { Logo } from '@/components/logo';
import { BRAND } from '@/lib/brand';

export const LEGAL_UPDATED = 'October 21, 2026';

// Shared shell for the privacy policy and terms of service.
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
            ← Back to site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-8 space-y-4 leading-relaxed text-zinc-700 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-zinc-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline">
          {children}
        </div>
        <p className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-500">
          {BRAND.legalName} · {BRAND.location} · <a href={`mailto:${BRAND.email}`} className="text-brand-700 underline">{BRAND.email}</a>
        </p>
      </main>
    </div>
  );
}
