import Image from 'next/image';

// Demo sites live at /demo/<slug>; their screenshots are in public/demo/shots
// (regenerate them whenever a demo changes).
export type Demo = {
  slug: string;
  name: string;
  industry: string;
  url: string;
  pitch: string;
  highlights: string[];
};

export const DEMOS: Demo[] = [
  {
    slug: 'northline',
    name: 'Northline Builders',
    industry: 'Remodeling & construction',
    url: 'northlinebuilders.com',
    pitch: 'A bold, high-trust site for a contractor: estimate form above the fold, services with real project photos, a filterable portfolio and service areas.',
    highlights: ['Free-estimate form', 'Project gallery', 'Reviews & warranty', 'Service areas'],
  },
  {
    slug: 'ember-olive',
    name: 'Ember & Olive',
    industry: 'Restaurant',
    url: 'emberandolive.com',
    pitch: 'An elegant, photo-led site for a restaurant: table reservations from the hero, a full menu with prices, a story section and private events.',
    highlights: ['Reservations', 'Menu with prices', 'Private events', 'Hours & location'],
  },
  {
    slug: 'lumen',
    name: 'Lumen Day Spa',
    industry: 'Spa & wellness',
    url: 'lumenspa.com',
    pitch: 'A calm, modern site for a spa or salon: an online booking widget, treatments with prices and times, monthly memberships and gift cards.',
    highlights: ['Online booking', 'Treatments & prices', 'Memberships', 'Gift cards'],
  },
];

export function BrowserFrame({ url, children, className = '' }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 ${className}`}>
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 flex flex-1 items-center gap-1.5 truncate rounded-md bg-white px-2 py-0.5 text-[10px] text-zinc-400 ring-1 ring-zinc-200">
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
            <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 0 1 6 0v3Z" />
          </svg>
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

// A tall full-page screenshot that scrolls slowly through the page on hover.
export function ScrollPreview({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="group/preview relative h-[420px] overflow-hidden">
      <Image
        src={src}
        alt={alt}
        width={1100}
        height={2420}
        sizes="(min-width: 1024px) 60vw, 100vw"
        className="absolute inset-x-0 top-0 w-full translate-y-0 transition-transform duration-[6000ms] ease-in-out group-hover/preview:translate-y-[calc(-100%+420px)]"
      />
    </div>
  );
}

export function PhoneShot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-40 overflow-hidden rounded-[1.8rem] border-[6px] border-zinc-900 bg-zinc-900 shadow-2xl">
      <div className="relative">
        <Image src={src} alt={alt} width={360} height={779} sizes="160px" className="w-full rounded-[1.3rem]" />
        <span className="absolute top-1.5 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-zinc-900" />
      </div>
    </div>
  );
}
