import { asc, eq } from 'drizzle-orm';
import Image from 'next/image';
import Link from 'next/link';
import { getDb } from '@/db';
import { packages } from '@/db/schema';
import { Logo } from '@/components/logo';
import { Icon, type IconName } from '@/components/site/icons';
import { BrowserFrame, DEMOS, PhoneShot, ScrollPreview } from '@/components/site/mockups';
import { BRAND } from '@/lib/brand';
import { money } from '@/lib/format';
import { QuoteForm } from './quote-form';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '#work', label: 'Our work' },
  { href: '#included', label: 'What’s included' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#process', label: 'Process' },
  { href: '#faq', label: 'FAQ' },
];

const INDUSTRIES: { icon: IconName; label: string }[] = [
  { icon: 'wrench', label: 'Contractors & trades' },
  { icon: 'utensils', label: 'Restaurants' },
  { icon: 'scissors', label: 'Salons & spas' },
  { icon: 'tooth', label: 'Dental & medical' },
  { icon: 'car', label: 'Auto shops' },
  { icon: 'sparkles', label: 'Cleaning services' },
  { icon: 'dumbbell', label: 'Fitness studios' },
  { icon: 'home', label: 'Real estate' },
  { icon: 'scale', label: 'Law firms' },
  { icon: 'leaf', label: 'Landscaping' },
];

const PILLARS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'search',
    title: 'Get found on Google',
    body: 'Local SEO and your Google Business Profile are set up from day one, so people searching nearby actually find you.',
  },
  {
    icon: 'chat',
    title: 'Turn visitors into calls',
    body: 'Clear messaging, tap-to-call buttons and quote forms on every page — designed to make contacting you effortless.',
  },
  {
    icon: 'shield',
    title: 'Never think about it again',
    body: 'Hosting, security, backups and updates are handled for you. Need a change? Just ask — it’s included.',
  },
];

const INCLUDED: { icon: IconName; title: string; body: string }[] = [
  { icon: 'pen', title: 'Custom design', body: 'Built around your brand and your customers — no cookie-cutter templates.' },
  { icon: 'chat', title: 'Professional copywriting', body: 'We write the words for you, based on a short conversation about your business.' },
  { icon: 'phoneDevice', title: 'Mobile-first', body: 'Looks and works great on every phone, tablet and desktop.' },
  { icon: 'zap', title: 'Fast loading', body: 'Optimized pages that load quickly — good for visitors and for Google.' },
  { icon: 'pin', title: 'Local SEO setup', body: 'Search basics plus your Google Business Profile, done right.' },
  { icon: 'mail', title: 'Lead forms', body: 'Contact and quote request forms that send straight to your inbox.' },
  { icon: 'shield', title: 'Hosting & SSL', body: 'Secure, reliable hosting with backups. No extra bills.' },
  { icon: 'refresh', title: 'Monthly updates', body: 'New photos, prices, hours or services — send it over and we update it.' },
];

const COMPARE = [
  { label: 'Setup / design fee', diy: '$0 — you do the work', agency: 'Thousands of dollars', us: '$0 — just your first month' },
  { label: 'Who builds it', diy: 'You', agency: 'A design team', us: 'A design team' },
  { label: 'Copywriting', diy: 'You write it', agency: 'Often extra', us: 'Included' },
  { label: 'Hosting & security', diy: 'Add-on plans', agency: 'Often extra', us: 'Included' },
  { label: 'Ongoing updates', diy: 'Your time', agency: 'Billed hourly', us: 'Included' },
  { label: 'Local SEO setup', diy: 'DIY', agency: 'Often extra', us: 'Included' },
  { label: 'Contract', diy: 'Monthly or yearly plans', agency: 'Project contract', us: 'None — month-to-month' },
];

const STEPS: { icon: IconName; title: string; when: string; body: string }[] = [
  { icon: 'phone', title: 'Free consultation', when: 'Day 1', body: 'A quick call to learn about your business, your customers and your goals.' },
  { icon: 'pen', title: 'Design & build', when: 'Week 1', body: 'We design, write and build your site. You review it and request changes.' },
  { icon: 'rocket', title: 'Launch', when: 'Week 2', body: 'We connect your domain, set up Google, and make sure customers can find you.' },
  { icon: 'chart', title: 'Grow', when: 'Ongoing', body: 'Hosting, updates and support every month, so your site keeps working for you.' },
];

const FAQ = [
  { q: 'What do I pay to get started?', a: 'Just your first month, paid when you sign up. There’s no separate setup or design fee — your monthly plan covers the design and build of your site, plus hosting, updates and support.' },
  { q: 'Do I need to write the content or take photos?', a: 'No. We write the copy for you based on your consultation, and can work with photos you already have. You review everything before launch.' },
  { q: 'How long until my website is live?', a: 'Most sites launch within about two weeks of the consultation, depending on how quickly we get your feedback.' },
  { q: 'Can I request changes after launch?', a: 'Yes. Updates to your content — new services, prices, hours, photos — are included in your plan. Just send them over.' },
  { q: 'Is there a contract?', a: 'No. Your plan is month-to-month — stay because it’s working for you, not because you’re locked in.' },
  {
    q: 'How do I cancel?',
    a: `Email us at ${BRAND.email} any time before your next billing date and you won’t be charged again. Your site stays live until the end of the month you’ve already paid for.`,
  },
  {
    q: 'What happens to my domain and content if I cancel?',
    a: 'They’re yours to keep. While you’re with us we register and manage your domain under Service Angel; if you cancel, we transfer it to you free of charge, along with your text and photos. The site’s design and hosting end with your plan.',
  },
  { q: 'I already have a website. Can you redo it?', a: 'Absolutely. Many clients come to us with an outdated or slow site that needs a fresh, modern rebuild.' },
];

function SectionHeading({ eyebrow, title, sub, center = true }: { eyebrow: string; title: string; sub?: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-lg leading-relaxed text-zinc-600">{sub}</p>}
    </div>
  );
}

export default async function Home({ searchParams }: PageProps<'/'>) {
  const { ref } = await searchParams;
  const db = await getDb();
  const pkgs = await db.select().from(packages).where(eq(packages.active, true)).orderBy(asc(packages.sort));
  const plan = pkgs[0];
  const monthly = plan?.monthlyCents ? money(plan.monthlyCents) : null;

  return (
    <div className="bg-white text-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-3.5 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-zinc-600 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="transition hover:text-zinc-900">
                {n.label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/login" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 sm:flex">
              <Icon name="users" className="h-4 w-4" />
              Team login
            </Link>
            {BRAND.phone ? (
              <a href={`tel:${BRAND.phone}`} className="hidden items-center gap-1.5 text-sm font-semibold text-zinc-700 md:flex">
                <Icon name="phone" className="h-4 w-4" />
                {BRAND.phone}
              </a>
            ) : (
              BRAND.email && (
                <a href={`mailto:${BRAND.email}`} title={BRAND.email} className="hidden items-center gap-1.5 text-sm font-semibold text-zinc-700 md:flex">
                  <Icon name="mail" className="h-4 w-4" />
                  Email us
                </a>
              )
            )}
            <a href="#quote" className="hidden rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:inline-block">
              Get a free quote
            </a>
            <details className="group relative lg:hidden">
              <summary className="flex cursor-pointer list-none items-center rounded-md p-2 text-zinc-700 hover:bg-zinc-100 [&::-webkit-details-marker]:hidden">
                <Icon name="menu" className="h-5 w-5 group-open:hidden" />
                <Icon name="x" className="hidden h-5 w-5 group-open:block" />
                <span className="sr-only">Menu</span>
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
                {NAV.map((n) => (
                  <a key={n.href} href={n.href} className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                    {n.label}
                  </a>
                ))}
                {BRAND.email && (
                  <a href={`mailto:${BRAND.email}`} className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                    Email us
                  </a>
                )}
                <a href="#quote" className="mt-1 block rounded-md bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white">
                  Get a free quote
                </a>
                <Link href="/login" className="mt-1 block rounded-md px-3 py-2 text-center text-sm font-medium text-zinc-600 hover:bg-zinc-50">
                  Team login
                </Link>
              </div>
            </details>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="absolute -top-40 right-0 h-[32rem] w-[32rem] rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pt-16 pb-24 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-24 lg:pb-32">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-brand-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Now booking new website projects
            </p>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              A website that brings you{' '}
              <span className="bg-gradient-to-r from-sky-300 via-brand-100 to-amber-200 bg-clip-text text-transparent">more customers</span>
              <br className="hidden sm:block" /> — done for you.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-100/90">
              {BRAND.name} designs, writes, launches and maintains professional websites for local businesses
              {monthly ? ` — all for ${monthly} a month, with no setup or design fee.` : '.'}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#quote" className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3.5 font-semibold text-brand-900 shadow-lg shadow-brand-900/30 transition hover:bg-brand-50">
                Get my free quote
                <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </a>
              <a href="#work" className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-6 py-3.5 font-semibold transition hover:bg-white/10">
                See sample designs
              </a>
            </div>
            <ul className="mt-10 grid max-w-lg gap-3 text-sm text-brand-100 sm:grid-cols-2">
              {['No setup fee', 'No contract — cancel anytime', 'Hosting & updates included', 'Live in about 2 weeks'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:mx-0">
            <BrowserFrame url="northlinebuilders.com" className="relative z-10 -rotate-1">
              <Image src="/demo/shots/northline-hero.webp" alt="Sample contractor website by Service Angel" width={1100} height={688} priority sizes="(min-width: 1024px) 40vw, 90vw" className="w-full" />
            </BrowserFrame>
            <div className="animate-float absolute -right-3 -bottom-12 z-20 hidden sm:block lg:-right-8">
              <PhoneShot src="/demo/shots/lumen-mobile.webp" alt="Sample spa website on a phone" />
            </div>
            <div className="animate-float-slow absolute -top-6 -left-4 z-20 hidden items-center gap-3 rounded-xl bg-white px-4 py-3 text-zinc-900 shadow-xl sm:flex lg:-left-10">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon name="mail" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold">New quote request</p>
                <p className="text-[11px] text-zinc-500">from your website · just now</p>
              </div>
            </div>
            <div className="animate-float absolute -bottom-8 left-6 z-20 hidden items-center gap-3 rounded-xl bg-white px-4 py-3 text-zinc-900 shadow-xl md:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <Icon name="phone" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold">Tap-to-call</p>
                <p className="text-[11px] text-zinc-500">on every page, every device</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="border-b border-zinc-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-center text-sm font-semibold text-zinc-500">Websites built for local businesses like yours</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2.5">
            {INDUSTRIES.map((i) => (
              <li key={i.label} className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700">
                <Icon name={i.icon} className="h-4 w-4 text-brand-600" />
                {i.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-dots py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Why it matters"
            title="Your website should be your best salesperson"
            sub="Most customers look you up online before they call. We make sure what they find wins them over."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/30">
                  <Icon name={p.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-6 font-display text-xl font-bold">{p.title}</h3>
                <p className="mt-3 leading-relaxed text-zinc-600">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Work */}
      <section id="work" className="scroll-mt-20 bg-zinc-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Sample designs"
            title="Every business gets its own look"
            sub="No templates with your logo swapped in. Explore a few full demo sites — hover a preview to scroll it, or open the live demo."
          />
          <div className="mt-16 space-y-24">
            {DEMOS.map((d, i) => (
              <div key={d.slug} className="grid items-center gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
                <a href={`/demo/${d.slug}`} className={`group relative block ${i % 2 ? 'lg:order-2' : ''}`}>
                  <div className={`absolute -inset-4 rounded-3xl bg-gradient-to-br ${['from-amber-200/60 to-stone-200/40', 'from-rose-200/60 to-amber-100/40', 'from-emerald-100/70 to-rose-100/50'][i % 3]} blur-2xl`} />
                  <BrowserFrame url={d.url} className="relative transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_40px_80px_-20px_rgba(15,31,92,0.4)]">
                    <ScrollPreview src={`/demo/shots/${d.slug}.webp`} alt={`${d.name} demo website`} />
                  </BrowserFrame>
                </a>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{d.industry}</p>
                  <h3 className="mt-2 font-display text-3xl font-bold tracking-tight">{d.name}</h3>
                  <p className="mt-4 text-lg leading-relaxed text-zinc-600">{d.pitch}</p>
                  <ul className="mt-6 grid grid-cols-2 gap-3">
                    {d.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                          <Icon name="check" className="h-3 w-3" />
                        </span>
                        {h}
                      </li>
                    ))}
                  </ul>
                  <a href={`/demo/${d.slug}`} className="group mt-8 inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-3 font-semibold transition hover:border-brand-600 hover:text-brand-700">
                    View live demo <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-16 text-center text-xs text-zinc-400">Demo sites for fictional businesses, shown to illustrate our work.</p>
        </div>
      </section>

      {/* Included */}
      <section id="included" className="scroll-mt-20 py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              center={false}
              eyebrow="Everything included"
              title="One plan. Everything your business needs online."
              sub="No add-ons, no surprise invoices, no learning a website builder. We handle it all — you run your business."
            />
            <a href="#pricing" className="mt-8 inline-flex items-center gap-2 font-semibold text-brand-600 hover:text-brand-700">
              See pricing <Icon name="arrow" className="h-4 w-4" />
            </a>
          </div>
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {INCLUDED.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="bg-zinc-50 py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionHeading eyebrow="Compare" title="The easiest way to get a great website" />
          <div className="mt-12 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="px-5 py-4 text-left font-medium text-zinc-500" />
                  <th className="px-5 py-4 text-left font-semibold text-zinc-700">DIY website builder</th>
                  <th className="px-5 py-4 text-left font-semibold text-zinc-700">Traditional agency</th>
                  <th className="bg-brand-600 px-5 py-4 text-left font-semibold text-white">{BRAND.name}</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r, i) => (
                  <tr key={r.label} className={i < COMPARE.length - 1 ? 'border-b border-zinc-100' : ''}>
                    <td className="px-5 py-4 font-medium text-zinc-900">{r.label}</td>
                    <td className="px-5 py-4 text-zinc-600">{r.diy}</td>
                    <td className="px-5 py-4 text-zinc-600">{r.agency}</td>
                    <td className="bg-brand-50 px-5 py-4 font-semibold text-brand-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="check" className="h-4 w-4" />
                        {r.us}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow="Pricing" title="Simple, honest pricing" sub="One monthly price. Design, hosting, updates and support all included." />
          <div className={`mx-auto mt-14 grid gap-8 ${pkgs.length === 1 ? 'max-w-4xl' : pkgs.length === 2 ? 'max-w-4xl md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {pkgs.map((p) =>
              pkgs.length === 1 ? (
                <div key={p.id} className="grid overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl md:grid-cols-[1fr_1.15fr]">
                  <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 to-brand-700 p-10 text-white">
                    <div className="bg-grid absolute inset-0 opacity-60" />
                    <div className="relative">
                      <p className="text-sm font-semibold uppercase tracking-wider text-brand-100">{p.name}</p>
                      <p className="mt-6 flex items-end gap-1">
                        <span className="font-display text-6xl font-extrabold">{money(p.monthlyCents || p.priceCents)}</span>
                        {p.monthlyCents > 0 && <span className="mb-2 text-brand-100">/month</span>}
                      </p>
                      <p className="mt-2 text-brand-100">{p.monthlyCents > 0 && (p.priceCents > 0 ? `+ ${money(p.priceCents)} one-time setup` : 'First month due at signup. No setup fee. No contract — cancel anytime.')}</p>
                      <p className="mt-6 leading-relaxed text-brand-100/90">{p.tagline}</p>
                      <a href="#quote" className="mt-8 flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 font-semibold text-brand-900 transition hover:bg-brand-50">
                        Get started <Icon name="arrow" className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                  <div className="p-10">
                    <p className="font-semibold">Everything included:</p>
                    <ul className="mt-5 space-y-3.5">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-3 text-zinc-700">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                            <Icon name="check" className="h-3 w-3" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-3xl border bg-white p-8 ${p.featured ? 'border-brand-600 shadow-xl ring-1 ring-brand-600' : 'border-zinc-200 shadow-sm'}`}
                >
                  {p.featured && (
                    <span className="absolute -top-3 left-8 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">Most popular</span>
                  )}
                  <h3 className="font-display text-xl font-bold">{p.name}</h3>
                  <p className="mt-2 text-sm text-zinc-600">{p.tagline}</p>
                  <p className="mt-6 flex items-end gap-1">
                    <span className="font-display text-5xl font-extrabold">{money(p.monthlyCents || p.priceCents)}</span>
                    <span className="mb-1.5 text-zinc-500">{p.monthlyCents > 0 ? '/month' : 'one-time'}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href="#quote" className={`mt-8 rounded-lg px-4 py-3 text-center font-semibold ${p.featured ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-zinc-300 hover:bg-zinc-50'}`}>
                    Get started
                  </a>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="scroll-mt-20 bg-zinc-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow="How it works" title="From first call to launch in about two weeks" />
          <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
            <div className="absolute top-6 right-[12.5%] left-[12.5%] hidden h-px bg-gradient-to-r from-brand-200 via-brand-400 to-brand-200 md:block" />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative text-center">
                <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-md ring-4 ring-zinc-50">
                  <Icon name={s.icon} className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{i + 1}</span>
                </span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-brand-600">{s.when}</p>
                <h3 className="mt-1 font-display text-lg font-bold">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeading center={false} eyebrow="FAQ" title="Questions? We’ve got answers." sub={
                <>
                  Can’t find what you’re looking for? Request a free quote, or email us at{' '}
                  <a href={`mailto:${BRAND.email}`} className="font-semibold text-brand-700 hover:underline">
                    {BRAND.email}
                  </a>
                  .
                </>
              }
            />
          </div>
          <div className="divide-y divide-zinc-200 border-y border-zinc-200">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition group-open:rotate-45">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 pr-10 leading-relaxed text-zinc-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section id="quote" className="relative scroll-mt-16 overflow-hidden bg-brand-900 py-24 text-white">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="absolute top-0 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-100">Free quote</p>
            <h2 className="mt-2 font-display text-4xl font-bold tracking-tight">Let’s build your new website.</h2>
            <p className="mt-4 text-lg text-brand-100/90">Tell us a little about your business. A website specialist will reach out within one business day.</p>
            <ol className="mt-10 space-y-5">
              {['We review your business and current site', 'A specialist calls you to talk goals & ideas', 'You get a clear plan — no pressure, no obligation'].map((t, i) => (
                <li key={t} className="flex items-center gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold ring-1 ring-white/20">{i + 1}</span>
                  <span className="text-brand-50">{t}</span>
                </li>
              ))}
            </ol>
            {(BRAND.phone || BRAND.email) && (
              <div className="mt-10 flex flex-wrap gap-6 text-sm">
                {BRAND.phone && (
                  <a href={`tel:${BRAND.phone}`} className="flex items-center gap-2 font-semibold hover:underline">
                    <Icon name="phone" className="h-4 w-4" /> {BRAND.phone}
                  </a>
                )}
                {BRAND.email && (
                  <a href={`mailto:${BRAND.email}`} className="flex items-center gap-2 font-semibold hover:underline">
                    <Icon name="mail" className="h-4 w-4" /> {BRAND.email}
                  </a>
                )}
              </div>
            )}
          </div>
          <QuoteForm refId={typeof ref === 'string' ? ref : undefined} packages={pkgs.length > 1 ? pkgs.map((p) => p.name) : []} />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 text-zinc-400">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">{BRAND.tagline} Designed, written, launched and maintained for you.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="transition hover:text-white">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Get in touch</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="#quote" className="transition hover:text-white">Request a free quote</a>
              </li>
              {BRAND.phone && (
                <li>
                  <a href={`tel:${BRAND.phone}`} className="transition hover:text-white">{BRAND.phone}</a>
                </li>
              )}
              {BRAND.email && (
                <li>
                  <a href={`mailto:${BRAND.email}`} className="transition hover:text-white">{BRAND.email}</a>
                </li>
              )}
              <li>
                <Link href="/login" className="transition hover:text-white">Team login</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs sm:px-6">
            <p>
              © {new Date().getFullYear()} {BRAND.legalName} · {BRAND.location}. All rights reserved.
            </p>
            <p className="flex gap-5">
              <Link href="/privacy" className="transition hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="transition hover:text-white">
                Terms of Service
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
