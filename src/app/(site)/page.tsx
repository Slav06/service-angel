import { asc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { getDb } from '@/db';
import { packages } from '@/db/schema';
import { Logo } from '@/components/logo';
import { BRAND } from '@/lib/brand';
import { money } from '@/lib/format';
import { QuoteForm } from './quote-form';

export const dynamic = 'force-dynamic';

const STEPS = [
  { t: 'Free consultation', d: 'A quick call to learn about your business, your customers and your goals.' },
  { t: 'Design & build', d: 'We design, write and build your site — you review and request changes.' },
  { t: 'Launch', d: 'We connect your domain, set up Google, and make sure customers can find you.' },
  { t: 'Grow', d: 'Ongoing hosting, updates and support so your site keeps working for you.' },
];

const WHY = [
  { i: '⚡', t: 'Live in days, not months', d: 'Most sites launch within 1–2 weeks of your consultation.' },
  { i: '📱', t: 'Built for phones', d: 'Most of your customers search on mobile. Every site we build is mobile-first.' },
  { i: '📍', t: 'Found on Google', d: 'Local SEO and Google Business Profile setup are part of the build.' },
  { i: '🤝', t: 'A real person to call', d: 'One point of contact from first call to launch and beyond.' },
];

const FAQ = [
  { q: 'Do I need to provide the content?', a: 'No. We write the copy for you based on your consultation, and you can edit anything before launch.' },
  { q: 'Do I own my website?', a: 'Yes. Your domain and content are yours.' },
  { q: 'What does the monthly fee cover?', a: 'Hosting, SSL security, backups, software updates and small content changes.' },
  { q: 'Can you redo my existing website?', a: 'Absolutely — many of our clients come to us with an outdated site that needs a refresh.' },
];

export default async function Home({ searchParams }: PageProps<'/'>) {
  const { ref } = await searchParams;
  const db = await getDb();
  const pkgs = await db.select().from(packages).where(eq(packages.active, true)).orderBy(asc(packages.sort));

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Logo />
          <div className="ml-auto hidden gap-6 text-sm text-zinc-600 sm:flex">
            <a href="#pricing" className="hover:text-zinc-900">Pricing</a>
            <a href="#process" className="hover:text-zinc-900">How it works</a>
            <a href="#faq" className="hover:text-zinc-900">FAQ</a>
          </div>
          <a href="#quote" className="btn btn-primary ml-auto sm:ml-0">Free quote</a>
        </nav>
      </header>

      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">Websites for local businesses</p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">A website that brings you customers — done for you.</h1>
            <p className="mt-5 max-w-lg text-lg text-brand-100">
              {BRAND.name} designs, writes, and launches professional websites for small businesses. No tech headaches, no
              surprises — just a site that works.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#quote" className="rounded-md bg-white px-5 py-3 font-semibold text-brand-700 hover:bg-brand-50">
                Get a free quote
              </a>
              <a href="#pricing" className="rounded-md border border-white/40 px-5 py-3 font-semibold hover:bg-white/10">
                See pricing
              </a>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="rotate-1 rounded-xl bg-white p-3 shadow-2xl">
              <div className="mb-2 flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <div className="space-y-3 rounded-lg bg-zinc-50 p-5">
                <div className="h-5 w-1/2 rounded bg-brand-600/80" />
                <div className="h-3 w-3/4 rounded bg-zinc-300" />
                <div className="h-3 w-2/3 rounded bg-zinc-300" />
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="h-16 rounded bg-brand-100" />
                  <div className="h-16 rounded bg-amber-100" />
                  <div className="h-16 rounded bg-emerald-100" />
                </div>
                <div className="h-8 w-32 rounded bg-brand-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {WHY.map((w) => (
          <div key={w.t}>
            <p className="text-2xl">{w.i}</p>
            <h3 className="mt-2 font-semibold">{w.t}</h3>
            <p className="mt-1 text-sm text-zinc-600">{w.d}</p>
          </div>
        ))}
      </section>

      <section id="pricing" className="bg-zinc-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">Simple, upfront pricing</h2>
          <p className="mt-2 text-center text-zinc-600">One-time build fee plus a small monthly plan for hosting & care.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pkgs.map((p) => (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 ${p.featured ? 'border-brand-600 shadow-xl ring-1 ring-brand-600' : 'border-zinc-200'}`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-zinc-600">{p.tagline}</p>
                <p className="mt-5">
                  <span className="text-4xl font-bold">{money(p.priceCents)}</span>
                  <span className="text-zinc-500"> one-time</span>
                </p>
                {p.monthlyCents > 0 && <p className="text-sm text-zinc-500">+ {money(p.monthlyCents)}/mo hosting & care</p>}
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brand-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="#quote" className={`btn mt-6 py-2.5 ${p.featured ? 'btn-primary' : ''}`}>
                  Get started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold">How it works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.t} className="rounded-xl border border-zinc-200 p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-zinc-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="bg-zinc-50 py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center text-3xl font-bold">Questions</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-lg border border-zinc-200 bg-white p-4">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-2 text-sm text-zinc-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="quote" className="bg-gradient-to-br from-brand-900 to-brand-700 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-bold">Get your free quote</h2>
            <p className="mt-3 text-brand-100">Tell us a little about your business and we’ll get back to you within one business day.</p>
            {BRAND.phone && (
              <p className="mt-6 text-lg">
                Or call us: <a href={`tel:${BRAND.phone}`} className="font-semibold underline">{BRAND.phone}</a>
              </p>
            )}
          </div>
          <QuoteForm refId={typeof ref === 'string' ? ref : undefined} packages={pkgs.map((p) => p.name)} />
        </div>
      </section>

      <footer className="border-t border-zinc-100 py-8 text-sm text-zinc-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4">
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          {BRAND.email && <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>}
          <Link href="/login" className="ml-auto hover:text-zinc-900">Team login</Link>
        </div>
      </footer>
    </div>
  );
}
