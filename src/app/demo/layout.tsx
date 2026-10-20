import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export const metadata = { robots: { index: false, follow: false } };

// Sample sites showing what we build. The ribbon makes clear they're demos and links back.
export default function DemoLayout({ children }: LayoutProps<'/demo'>) {
  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-zinc-950 px-4 py-2 text-xs text-zinc-300">
        <span>
          Demo site by <b className="text-white">{BRAND.name}</b>
          <span className="hidden sm:inline"> — the business shown is fictional</span>
        </span>
        <Link href="/#quote" className="rounded-full bg-white px-3 py-1 font-semibold text-zinc-900 hover:bg-zinc-200">
          Get a site like this →
        </Link>
      </div>
      {children}
    </>
  );
}
