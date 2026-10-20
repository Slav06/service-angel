import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import Image from 'next/image';
import { Icon } from '@/components/site/icons';

const serif = DM_Serif_Display({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--lu-serif' });
const sans = DM_Sans({ subsets: ['latin'], variable: '--lu-sans' });

export const metadata = { title: 'Lumen Day Spa — Facials, Massage & Wellness (demo)' };

const TREATMENTS = [
  { img: 'spa-massage', name: 'Signature massage', time: '60 / 90 min', price: 'from $110', tag: 'Most booked' },
  { img: 'spa-facial', name: 'Glow facial', time: '50 min', price: '$135', tag: '' },
  { img: 'spa-stones', name: 'Hot stone ritual', time: '75 min', price: '$150', tag: '' },
  { img: 'spa-serum', name: 'Hydrafacial', time: '45 min', price: '$185', tag: 'New' },
  { img: 'spa-hair', name: 'Cut & style', time: '60 min', price: 'from $75', tag: '' },
  { img: 'spa-bath', name: 'Couples retreat', time: '2 hrs', price: '$320', tag: '' },
];

const TIMES = ['10:00', '11:30', '1:00', '2:30', '4:00', '5:30'];

export default function Lumen() {
  const s = '[font-family:var(--lu-serif)]';
  return (
    <div className={`${serif.variable} ${sans.variable} bg-[#faf6f1] text-[#33302b] [font-family:var(--lu-sans)]`}>
      <header className="mx-auto flex max-w-7xl items-center gap-10 px-6 py-6">
        <span className={`text-3xl ${s}`}>
          lumen<span className="text-[#c98b7a]">.</span>
        </span>
        <nav className="hidden gap-8 text-sm text-[#33302b]/70 lg:flex">
          <span>Treatments</span>
          <span>Memberships</span>
          <span>Gift cards</span>
          <span>About</span>
        </nav>
        <span className="ml-auto rounded-full bg-[#5f7a65] px-6 py-3 text-sm font-medium text-white">Book now</span>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 pt-6 pb-24 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#e9efe6] px-4 py-1.5 text-sm text-[#5f7a65]">
            <Icon name="sparkles" className="h-4 w-4" /> Voted best day spa in the valley
          </p>
          <h1 className={`mt-6 text-6xl leading-[1.02] sm:text-7xl ${s}`}>
            Slow down.
            <br />
            <i className="text-[#c98b7a]">Breathe in.</i>
            <br />
            Glow out.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[#33302b]/70">
            Facials, massage and body rituals in a calm, light-filled studio. Thoughtful care, clean products, and an hour that’s entirely yours.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <span className="rounded-full bg-[#33302b] px-7 py-4 font-medium text-white">Book a treatment</span>
            <span className="flex items-center gap-3 text-sm">
              <span className="flex -space-x-2">
                {['spa-cream', 'spa-facial', 'spa-serum'].map((i) => (
                  <span key={i} className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-[#faf6f1]">
                    <Image src={`/demo/${i}.webp`} alt="" fill sizes="36px" className="object-cover" />
                  </span>
                ))}
              </span>
              <span>
                <b>4.9</b> <span className="text-[#c98b7a]">★★★★★</span>
                <br />
                <span className="text-[#33302b]/60">2,100+ happy guests</span>
              </span>
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="relative ml-auto aspect-[4/5] w-[85%] overflow-hidden rounded-t-full">
            <Image src="/demo/spa-facial.webp" alt="" fill priority sizes="45vw" className="object-cover" />
          </div>
          <div className="absolute top-10 -left-2 h-32 w-32 rounded-full bg-[#e9d5cc]/70 blur-2xl" />
          {/* Booking widget */}
          <div className="absolute bottom-6 left-0 w-64 rounded-3xl sm:w-72 bg-white p-5 shadow-2xl shadow-[#33302b]/15">
            <p className="text-sm font-semibold">Book in 60 seconds</p>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#faf6f1] px-3 py-2.5 text-sm">
              Glow facial · 50 min <span className="text-[#33302b]/40">▾</span>
            </div>
            <p className="mt-4 text-xs text-[#33302b]/50">Thursday, Oct 23</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {TIMES.map((t, i) => (
                <span key={t} className={`rounded-lg py-2 text-center ${i === 2 ? 'bg-[#5f7a65] text-white' : 'border border-[#33302b]/10'}`}>
                  {t}
                </span>
              ))}
            </div>
            <span className="mt-4 block rounded-xl bg-[#33302b] py-3 text-center text-sm font-medium text-white">Confirm 1:00 PM</span>
          </div>
        </div>
      </section>

      {/* Marquee-ish strip */}
      <div className="border-y border-[#33302b]/10 bg-white py-5">
        <div className={`mx-auto flex max-w-7xl flex-wrap justify-center gap-x-12 gap-y-2 px-6 text-2xl text-[#33302b]/50 ${s}`}>
          {['Clean beauty', 'Organic oils', 'Licensed therapists', 'Same-week booking'].map((t) => (
            <span key={t} className="flex items-center gap-3">
              <span className="text-[#c98b7a]">✦</span> <i>{t}</i>
            </span>
          ))}
        </div>
      </div>

      {/* Treatments */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h2 className={`text-5xl sm:text-6xl ${s}`}>
            Our <i className="text-[#c98b7a]">treatments</i>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[#33302b]/65">Every visit begins with a short consultation, warm tea and a few quiet minutes in our relaxation lounge.</p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TREATMENTS.map((t) => (
            <div key={t.name} className="group overflow-hidden rounded-[2rem] bg-white p-3 shadow-sm transition hover:shadow-xl">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem]">
                <Image src={`/demo/${t.img}.webp`} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                {t.tag && <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium">{t.tag}</span>}
              </div>
              <div className="flex items-end justify-between px-3 pt-4 pb-2">
                <div>
                  <h3 className={`text-2xl ${s}`}>{t.name}</h3>
                  <p className="text-sm text-[#33302b]/55">{t.time}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{t.price}</p>
                  <p className="text-xs text-[#5f7a65]">Book →</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Memberships */}
      <section className="bg-[#5f7a65] py-24 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:items-center">
            <div>
              <h2 className={`text-5xl leading-tight ${s}`}>
                Make it a <i className="text-[#f2d3c7]">ritual</i>
              </h2>
              <p className="mt-4 text-white/75">Monthly memberships include one treatment a month, member pricing on add-ons, and rollover visits that never expire.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { n: 'Essential', p: '$99', f: ['1 × 50-min treatment', '10% off add-ons', 'Rollover visits'] },
                { n: 'Radiance', p: '$169', f: ['1 × 90-min treatment', '20% off add-ons', 'Guest pass each quarter'], hl: true },
              ].map((m) => (
                <div key={m.n} className={`rounded-[2rem] p-7 ${m.hl ? 'bg-[#faf6f1] text-[#33302b]' : 'bg-white/10 ring-1 ring-white/20'}`}>
                  <p className="text-sm tracking-widest uppercase opacity-70">{m.n}</p>
                  <p className={`mt-2 text-5xl ${s}`}>
                    {m.p}
                    <span className="text-base opacity-60">/mo</span>
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {m.f.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Icon name="check" className="h-4 w-4 text-[#c98b7a]" /> {f}
                      </li>
                    ))}
                  </ul>
                  <span className={`mt-6 block rounded-full py-3 text-center text-sm font-medium ${m.hl ? 'bg-[#33302b] text-white' : 'bg-white text-[#33302b]'}`}>Join {m.n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <h2 className={`text-center text-5xl ${s}`}>
          Kind <i className="text-[#c98b7a]">words</i>
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            ['The most relaxing hour of my month. The hot stone ritual is unreal and the space is so calming.', 'Priya S.'],
            ['My skin has never looked better. They actually explain what they’re doing and why. Booking online takes seconds.', 'Jenna L.'],
            ['Booked a couples retreat for our anniversary — thoughtful touches everywhere. We’re already members.', 'Marcus & Tia'],
          ].map(([q, n]) => (
            <figure key={n} className="rounded-[2rem] bg-white p-8 shadow-sm">
              <p className="text-[#c98b7a]">★★★★★</p>
              <blockquote className={`mt-4 text-xl leading-relaxed ${s}`}>“{q}”</blockquote>
              <figcaption className="mt-5 text-sm font-medium text-[#33302b]/60">{n}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Gift + gallery */}
      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-24 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#e9d5cc] p-10">
          <div className="absolute -right-16 -bottom-16 h-72 w-72 overflow-hidden rounded-full">
            <Image src="/demo/spa-candles.webp" alt="" fill sizes="300px" className="object-cover" />
          </div>
          <p className="text-sm tracking-widest text-[#33302b]/60 uppercase">Gift cards</p>
          <h3 className={`mt-3 max-w-xs text-4xl leading-tight ${s}`}>
            Give the gift of <i>a deep exhale</i>
          </h3>
          <span className="mt-8 inline-block rounded-full bg-[#33302b] px-6 py-3 text-sm font-medium text-white">Send a gift card</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['spa-rocks', 'spa-cream', 'spa-stones', 'spa-bath'].map((i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-3xl">
              <Image src={`/demo/${i}.webp`} alt="" fill sizes="20vw" className="object-cover" />
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#33302b]/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-6 py-10 text-sm text-[#33302b]/60">
          <span className={`text-2xl text-[#33302b] ${s}`}>
            lumen<span className="text-[#c98b7a]">.</span>
          </span>
          <span>Open daily 9am – 8pm · 77 Example Ave</span>
          <span className="ml-auto">@lumenspa</span>
        </div>
      </footer>
    </div>
  );
}
