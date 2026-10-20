// Illustrative website mockups built in HTML/CSS — sample designs, not real client sites.

export type MockTheme = {
  brand: string;
  industry: string;
  tagline: string;
  headline: string;
  cta: string;
  nav: string[];
  services: string[];
  primary: string; // tailwind bg class
  primaryText: string; // tailwind text class
  heroBg: string; // tailwind gradient/bg classes
  heroText: string;
  accent: string; // tailwind bg class for cards
};

export const SAMPLES: MockTheme[] = [
  {
    brand: 'Rivera Plumbing',
    industry: 'Plumbing & home services',
    tagline: 'Licensed & insured · 24/7 emergency service',
    headline: 'Fast, honest plumbing — right when you need it.',
    cta: 'Book a plumber',
    nav: ['Services', 'Reviews', 'Areas', 'Contact'],
    services: ['Drain cleaning', 'Water heaters', 'Leak repair'],
    primary: 'bg-orange-500',
    primaryText: 'text-orange-600',
    heroBg: 'bg-gradient-to-br from-slate-900 to-slate-700',
    heroText: 'text-white',
    accent: 'bg-orange-50',
  },
  {
    brand: 'Olive & Ember',
    industry: 'Restaurant',
    tagline: 'Wood-fired Italian kitchen',
    headline: 'Handmade pasta. Wood-fired pizza. Since day one.',
    cta: 'Reserve a table',
    nav: ['Menu', 'Reservations', 'Catering', 'Visit'],
    services: ['Dinner menu', 'Private events', 'Order online'],
    primary: 'bg-emerald-700',
    primaryText: 'text-emerald-700',
    heroBg: 'bg-gradient-to-br from-stone-100 to-amber-50',
    heroText: 'text-stone-900',
    accent: 'bg-amber-50',
  },
  {
    brand: 'Bright Smile Dental',
    industry: 'Dental practice',
    tagline: 'Family & cosmetic dentistry',
    headline: 'Gentle care for healthy, confident smiles.',
    cta: 'Request appointment',
    nav: ['Services', 'Our team', 'Insurance', 'Contact'],
    services: ['Cleanings', 'Whitening', 'Implants'],
    primary: 'bg-sky-600',
    primaryText: 'text-sky-700',
    heroBg: 'bg-gradient-to-br from-sky-50 to-white',
    heroText: 'text-slate-900',
    accent: 'bg-sky-50',
  },
];

export function BrowserFrame({ url, children, className = '' }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 ${className}`}>
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 flex-1 truncate rounded-md bg-white px-2 py-0.5 text-[10px] text-zinc-400 ring-1 ring-zinc-200">{url}</span>
      </div>
      {children}
    </div>
  );
}

// A small but believable homepage for a local business.
export function MiniSite({ t, compact = false }: { t: MockTheme; compact?: boolean }) {
  return (
    <div className="select-none text-left" aria-hidden>
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-2.5">
        <span className={`h-4 w-4 shrink-0 rounded ${t.primary}`} />
        <span className="whitespace-nowrap text-[11px] font-bold text-zinc-900">{t.brand}</span>
        <span className={`ml-auto gap-3 text-[9px] text-zinc-500 ${compact ? 'hidden' : 'hidden sm:flex'}`}>
          {t.nav.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </span>
        <span className={`whitespace-nowrap rounded px-2 py-1 text-[9px] font-semibold text-white ${compact ? 'ml-auto' : ''} ${t.primary}`}>{t.cta}</span>
      </div>
      <div className={`px-5 ${compact ? 'py-6' : 'py-9'} ${t.heroBg}`}>
        <p className={`text-[9px] font-medium opacity-70 ${t.heroText}`}>{t.tagline}</p>
        <p className={`mt-1.5 max-w-[16rem] font-display font-bold leading-tight ${compact ? 'min-h-[2.5em] text-base' : 'text-xl'} ${t.heroText}`}>{t.headline}</p>
        <div className="mt-3 flex gap-2">
          <span className={`rounded px-2.5 py-1 text-[9px] font-semibold text-white ${t.primary}`}>{t.cta}</span>
          <span className={`rounded px-2.5 py-1 text-[9px] font-semibold ring-1 ring-current ${t.heroText} opacity-80`}>Call now</span>
        </div>
        <div className="mt-3 flex items-center gap-1 text-[9px]">
          <span className="text-amber-400">★★★★★</span>
          <span className={`opacity-60 ${t.heroText}`}>Reviews from Google</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-4">
        {t.services.map((s) => (
          <div key={s} className={`rounded-md p-2 ${t.accent}`}>
            <span className={`block h-3 w-3 rounded-sm ${t.primary} opacity-80`} />
            <p className="mt-1.5 text-[9px] font-semibold text-zinc-800">{s}</p>
            <span className="mt-1 block h-1 w-10 rounded bg-zinc-300/70" />
            <span className="mt-0.5 block h-1 w-7 rounded bg-zinc-300/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PhoneFrame({ t }: { t: MockTheme }) {
  return (
    <div className="w-36 overflow-hidden rounded-[1.6rem] border-[5px] border-zinc-900 bg-white shadow-2xl" aria-hidden>
      <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-zinc-800" />
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <span className={`h-3 w-3 rounded ${t.primary}`} />
        <span className="text-[8px] font-bold">{t.brand}</span>
      </div>
      <div className={`px-2.5 py-4 ${t.heroBg}`}>
        <p className={`font-display text-[10px] font-bold leading-tight ${t.heroText}`}>{t.headline}</p>
        <span className={`mt-2 block rounded py-1 text-center text-[8px] font-semibold text-white ${t.primary}`}>{t.cta}</span>
      </div>
      <div className="space-y-1.5 p-2.5">
        {t.services.map((s) => (
          <div key={s} className={`rounded p-1.5 text-[8px] font-medium ${t.accent}`}>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
