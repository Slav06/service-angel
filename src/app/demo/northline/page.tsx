import { Inter, Oswald } from 'next/font/google';
import Image from 'next/image';
import { Icon } from '@/components/site/icons';

const display = Oswald({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--nl-display' });
const body = Inter({ subsets: ['latin'], variable: '--nl-body' });

export const metadata = { title: 'Northline Builders — Remodeling & Construction (demo)' };

const SERVICES = [
  { img: 'build-hero', title: 'Kitchen remodels', body: 'Custom cabinetry, stone counters and layouts built around how you cook.' },
  { img: 'build-roof', title: 'Roofing & exteriors', body: 'Shingle, metal and flat roofs, siding, gutters and storm repair.' },
  { img: 'build-crew', title: 'Whole-home renovations', body: 'Open up floor plans, update systems and make an old house new.' },
  { img: 'build-frame', title: 'Additions', body: 'Extra bedrooms, sunrooms and second stories, designed and permitted.' },
  { img: 'build-saw', title: 'Custom carpentry', body: 'Built-ins, trim, decks and finish work with real craftsmanship.' },
  { img: 'build-modern', title: 'New construction', body: 'Ground-up custom homes from foundation to final walkthrough.' },
];

const PROJECTS = [
  { img: 'build-house', label: 'Hillside modern · 4,200 sq ft', span: 'md:col-span-2 md:row-span-2' },
  { img: 'build-hero', label: 'Chef’s kitchen remodel', span: '' },
  { img: 'build-site', label: 'Craftsman renovation', span: '' },
  { img: 'build-modern', label: 'Townhome exteriors', span: '' },
  { img: 'build-level', label: 'Built-in cabinetry', span: '' },
];

export default function Northline() {
  return (
    <div className={`${display.variable} ${body.variable} bg-white text-stone-900 [font-family:var(--nl-body)]`}>
      {/* Utility bar */}
      <div className="bg-stone-900 text-xs text-stone-300">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-6 py-2">
          <span className="flex items-center gap-1.5">
            <Icon name="shield" className="h-3.5 w-3.5 text-amber-400" /> Licensed · Bonded · Insured
          </span>
          <span className="hidden sm:inline">Mon–Sat 7am–6pm</span>
          <span className="ml-auto flex items-center gap-1.5 font-semibold text-white">
            <Icon name="phone" className="h-3.5 w-3.5 text-amber-400" /> (555) 014-2290
          </span>
        </div>
      </div>

      {/* Nav */}
      <header className="sticky top-10 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-4">
          <span className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center bg-amber-400 text-stone-900">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                <path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z" />
              </svg>
            </span>
            <span className="leading-none [font-family:var(--nl-display)]">
              <span className="block text-xl font-bold tracking-wide uppercase">Northline</span>
              <span className="block text-[10px] tracking-[0.3em] text-stone-500 uppercase">Builders</span>
            </span>
          </span>
          <div className="ml-auto hidden gap-8 text-sm font-semibold tracking-wide text-stone-600 uppercase lg:flex [font-family:var(--nl-display)]">
            <span>Services</span>
            <span>Projects</span>
            <span>Process</span>
            <span>Reviews</span>
            <span>Areas</span>
          </div>
          <span className="ml-auto bg-amber-400 px-5 py-3 text-sm font-bold tracking-wide text-stone-900 uppercase lg:ml-0 [font-family:var(--nl-display)]">
            Free estimate
          </span>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-stone-900 text-white">
        <Image src="/demo/build-house.webp" alt="" fill priority sizes="100vw" className="object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-900/85 to-stone-900/30" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 border-l-4 border-amber-400 pl-3 text-sm font-semibold tracking-[0.2em] text-amber-300 uppercase [font-family:var(--nl-display)]">
              Remodeling · Roofing · New homes
            </p>
            <h1 className="mt-6 text-5xl leading-[0.95] font-bold uppercase sm:text-7xl [font-family:var(--nl-display)]">
              Built right.
              <br />
              <span className="text-amber-400">Built to last.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-stone-300">
              Family-owned builders turning houses into the homes people actually want to live in — on time, on budget, and done right the first time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="flex items-center gap-2 bg-amber-400 px-7 py-4 font-bold tracking-wide text-stone-900 uppercase [font-family:var(--nl-display)]">
                Get your free estimate <Icon name="arrow" className="h-4 w-4" />
              </span>
              <span className="border border-white/40 px-7 py-4 font-bold tracking-wide uppercase [font-family:var(--nl-display)]">View our work</span>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-amber-400">★★★★★</span>
                <span className="text-sm text-stone-300">
                  <b className="text-white">4.9</b> from 310 Google reviews
                </span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <span className="text-sm text-stone-300">
                <b className="text-white">10-year</b> workmanship warranty
              </span>
            </div>
          </div>

          <form className="bg-white p-7 text-stone-900 shadow-2xl">
            <p className="text-2xl font-bold uppercase [font-family:var(--nl-display)]">Request a free estimate</p>
            <p className="mt-1 text-sm text-stone-500">We respond within one business day.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {['Full name', 'Phone', 'Email', 'Zip code'].map((f) => (
                <div key={f} className="border border-stone-300 px-3 py-2.5 text-stone-400">
                  {f}
                </div>
              ))}
              <div className="col-span-2 flex items-center justify-between border border-stone-300 px-3 py-2.5 text-stone-400">
                Project type <span>▾</span>
              </div>
              <div className="col-span-2 h-20 border border-stone-300 px-3 py-2.5 text-stone-400">Tell us about your project…</div>
            </div>
            <span className="mt-4 block bg-stone-900 py-3.5 text-center font-bold tracking-wide text-white uppercase [font-family:var(--nl-display)]">Send my request</span>
          </form>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-amber-400">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 text-stone-900 md:grid-cols-4">
          {[
            ['22', 'Years in business'],
            ['1,400+', 'Projects completed'],
            ['4.9★', 'Average rating'],
            ['10 yr', 'Workmanship warranty'],
          ].map(([n, l]) => (
            <div key={l} className="border-l-2 border-stone-900/20 pl-5">
              <p className="text-4xl font-bold [font-family:var(--nl-display)]">{n}</p>
              <p className="mt-1 text-sm font-semibold tracking-wide uppercase">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.25em] text-amber-600 uppercase [font-family:var(--nl-display)]">What we do</p>
            <h2 className="mt-2 text-4xl font-bold uppercase sm:text-5xl [font-family:var(--nl-display)]">Our services</h2>
          </div>
          <p className="max-w-md text-stone-600">One crew from first sketch to final walkthrough — design, permits, construction and cleanup.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="group relative h-80 overflow-hidden bg-stone-900">
              <Image src={`/demo/${s.img}.webp`} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <span className="mb-3 block h-1 w-10 bg-amber-400 transition-all group-hover:w-16" />
                <h3 className="text-2xl font-bold uppercase [font-family:var(--nl-display)]">{s.title}</h3>
                <p className="mt-2 text-sm text-stone-300">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="bg-stone-100 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-4xl font-bold uppercase sm:text-5xl [font-family:var(--nl-display)]">How we build</h2>
          <div className="mt-14 grid gap-px bg-stone-300 md:grid-cols-4">
            {[
              ['01', 'Consult', 'We walk your home, listen to your goals and talk budget — free.'],
              ['02', 'Design & quote', 'Detailed plans and a fixed, line-item price. No surprises.'],
              ['03', 'Build', 'A dedicated project lead and weekly updates from start to finish.'],
              ['04', 'Walkthrough', 'We don’t call it done until you do. Backed by our warranty.'],
            ].map(([n, t, d]) => (
              <div key={n} className="bg-stone-100 p-8">
                <p className="text-6xl font-bold text-amber-400 [font-family:var(--nl-display)]">{n}</p>
                <h3 className="mt-4 text-xl font-bold uppercase [font-family:var(--nl-display)]">{t}</h3>
                <p className="mt-2 text-sm text-stone-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-4xl font-bold uppercase sm:text-5xl [font-family:var(--nl-display)]">Recent projects</h2>
          <div className="flex gap-2 text-xs font-semibold tracking-wide uppercase [font-family:var(--nl-display)]">
            {['All', 'Kitchens', 'Exteriors', 'New homes'].map((t, i) => (
              <span key={t} className={`px-4 py-2 ${i === 0 ? 'bg-stone-900 text-white' : 'border border-stone-300 text-stone-600'}`}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-10 grid auto-rows-[220px] gap-4 md:grid-cols-4">
          {PROJECTS.map((p) => (
            <div key={p.label} className={`group relative overflow-hidden ${p.span}`}>
              <Image src={`/demo/${p.img}.webp`} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute bottom-3 left-3 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide uppercase [font-family:var(--nl-display)]">{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="relative overflow-hidden bg-stone-900 py-24 text-white">
        <Image src="/demo/build-frame.webp" alt="" fill sizes="100vw" className="object-cover opacity-15" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="text-7xl leading-none text-amber-400 [font-family:var(--nl-display)]">“</p>
          <p className="text-2xl leading-relaxed font-medium sm:text-3xl">
            They gutted and rebuilt our 1950s kitchen in six weeks — exactly when they said they would. The crew was respectful, the site was spotless every
            night, and the result is stunning.
          </p>
          <p className="mt-8 font-bold tracking-widest text-amber-400 uppercase [font-family:var(--nl-display)]">Dana & Mike R.</p>
          <p className="text-sm text-stone-400">Kitchen remodel · Oak Hills</p>
        </div>
      </section>

      {/* Areas + CTA */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-4xl font-bold uppercase [font-family:var(--nl-display)]">Proudly serving</h2>
          <p className="mt-3 text-stone-600">Within 40 miles of our shop, including:</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['Oak Hills', 'Riverside', 'Maple Grove', 'Cedar Park', 'Lakeview', 'Westbrook', 'Pine Ridge', 'Fairview', 'Stonebridge', 'Elm Creek'].map((a) => (
              <span key={a} className="flex items-center gap-1.5 border border-stone-300 px-3 py-2 text-sm">
                <Icon name="pin" className="h-3.5 w-3.5 text-amber-600" />
                {a}
              </span>
            ))}
          </div>
        </div>
        <div className="relative overflow-hidden bg-amber-400 p-10">
          <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full border-[30px] border-stone-900/10" />
          <p className="text-3xl font-bold uppercase sm:text-4xl [font-family:var(--nl-display)]">Ready to start your project?</p>
          <p className="mt-3 max-w-sm text-stone-800">Get a free, no-pressure estimate. Most visits can be scheduled this week.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="bg-stone-900 px-6 py-3.5 font-bold tracking-wide text-white uppercase [font-family:var(--nl-display)]">Book an estimate</span>
            <span className="flex items-center gap-2 border-2 border-stone-900 px-6 py-3 font-bold [font-family:var(--nl-display)]">
              <Icon name="phone" className="h-4 w-4" /> (555) 014-2290
            </span>
          </div>
        </div>
      </section>

      <footer className="bg-stone-950 py-10 text-sm text-stone-400">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-6">
          <span className="text-lg font-bold tracking-wide text-white uppercase [font-family:var(--nl-display)]">Northline Builders</span>
          <span>Lic. #000000 · 1200 Example Way, Oak Hills</span>
          <span className="ml-auto">© Northline Builders</span>
        </div>
      </footer>
    </div>
  );
}
