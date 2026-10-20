import { Cormorant_Garamond, Jost } from 'next/font/google';
import Image from 'next/image';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--eo-serif' });
const sans = Jost({ subsets: ['latin'], variable: '--eo-sans' });

export const metadata = { title: 'Ember & Olive — Wood-fired Italian (demo)' };

const MENU: Record<string, [string, string, string][]> = {
  Antipasti: [
    ['Burrata', 'heirloom tomato, basil oil, grilled sourdough', '16'],
    ['Arancini', 'saffron risotto, smoked mozzarella, calabrian aioli', '13'],
    ['Carpaccio', 'shaved beef, arugula, capers, parmigiano', '17'],
  ],
  'Pasta fresca': [
    ['Tagliatelle al tartufo', 'black truffle, butter, aged parmigiano', '29'],
    ['Cacio e pepe', 'tonnarelli, pecorino romano, cracked pepper', '22'],
    ['Gamberi', 'spaghetti, wild shrimp, chili, garlic, white wine', '27'],
  ],
  'Dal forno': [
    ['Margherita', 'san marzano, fior di latte, basil', '18'],
    ['Diavola', 'spicy salami, honey, chili, mozzarella', '21'],
    ['Funghi e tartufo', 'wild mushrooms, fontina, truffle', '24'],
  ],
  Dolci: [
    ['Tiramisù', 'espresso, mascarpone, cocoa', '11'],
    ['Panna cotta', 'vanilla bean, seasonal berries', '10'],
  ],
};

export default function EmberOlive() {
  const serifCls = '[font-family:var(--eo-serif)]';
  return (
    <div className={`${serif.variable} ${sans.variable} bg-[#f6f1e8] text-[#2b211c] [font-family:var(--eo-sans)]`}>
      {/* Hero */}
      <section className="relative flex min-h-[92vh] flex-col overflow-hidden text-[#f6f1e8]">
        <Image src="/demo/food-oven.webp" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-[#1d1512]" />
        <nav className="relative mx-auto flex w-full max-w-7xl items-center px-6 py-6 text-sm tracking-[0.2em] uppercase">
          <div className="hidden flex-1 gap-8 md:flex">
            <span>Menu</span>
            <span>Our story</span>
            <span>Events</span>
          </div>
          <span className={`flex-1 text-center text-3xl tracking-normal normal-case md:flex-none ${serifCls}`}>
            Ember <i>&amp;</i> Olive
          </span>
          <div className="flex flex-1 justify-end gap-8">
            <span className="hidden md:inline">Gift cards</span>
            <span className="border border-[#f6f1e8]/60 px-4 py-2">Reserve</span>
          </div>
        </nav>
        <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-xs tracking-[0.4em] text-[#e9c46a] uppercase">Wood-fired · Handmade · Since 2009</p>
          <h1 className={`mt-6 text-6xl leading-[0.95] font-medium sm:text-8xl ${serifCls}`}>
            The fire is lit.
            <br />
            <i className="text-[#e9c46a]">Your table is waiting.</i>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[#f6f1e8]/80">Pasta rolled by hand every morning, pizza from a 900° oak-burning oven, and a cellar of small Italian producers.</p>
        </div>
        {/* Reservation bar */}
        <div className="relative mx-auto mb-10 w-full max-w-4xl px-6">
          <div className="grid grid-cols-2 gap-px overflow-hidden bg-[#f6f1e8]/20 text-sm backdrop-blur md:grid-cols-4">
            {[
              ['Date', 'Fri, Oct 24'],
              ['Time', '7:30 PM'],
              ['Guests', '2 people'],
            ].map(([l, v]) => (
              <div key={l} className="bg-black/40 px-5 py-4">
                <p className="text-[10px] tracking-[0.25em] text-[#e9c46a] uppercase">{l}</p>
                <p className="mt-1 text-base">{v} ▾</p>
              </div>
            ))}
            <span className="col-span-2 flex items-center justify-center bg-[#8c2f1b] px-5 py-4 text-sm tracking-[0.25em] uppercase md:col-span-1">Find a table</span>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto grid max-w-7xl gap-16 px-6 py-28 lg:grid-cols-2 lg:items-center">
        <div className="relative h-[520px]">
          <div className="absolute top-0 left-0 h-[78%] w-[72%] overflow-hidden">
            <Image src="/demo/food-pasta-make.webp" alt="" fill sizes="40vw" className="object-cover" />
          </div>
          <div className="absolute right-0 bottom-0 h-[55%] w-[52%] overflow-hidden border-8 border-[#f6f1e8] shadow-xl">
            <Image src="/demo/food-room.webp" alt="" fill sizes="30vw" className="object-cover" />
          </div>
          <div className="absolute bottom-8 left-6 flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[#8c2f1b] text-center text-[#f6f1e8]">
            <span className={`text-4xl ${serifCls}`}>15</span>
            <span className="text-[9px] tracking-[0.2em] uppercase">years of fire</span>
          </div>
        </div>
        <div>
          <p className="text-xs tracking-[0.4em] text-[#8c2f1b] uppercase">Our story</p>
          <h2 className={`mt-4 text-5xl leading-tight font-medium sm:text-6xl ${serifCls}`}>
            A little corner of <i>Napoli</i>, around the corner from you.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-[#2b211c]/75">
            Chef Marco Bellini grew up rolling pasta in his nonna’s kitchen. Today his team still makes every noodle by hand each morning, and the oven hasn’t gone cold
            since we opened.
          </p>
          <p className={`mt-8 text-3xl text-[#8c2f1b] italic ${serifCls}`}>— Marco Bellini, chef &amp; owner</p>
        </div>
      </section>

      {/* Menu */}
      <section className="bg-[#1d1512] py-28 text-[#f6f1e8]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-xs tracking-[0.4em] text-[#e9c46a] uppercase">La carta</p>
            <h2 className={`mt-3 text-6xl font-medium ${serifCls}`}>The menu</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs tracking-[0.25em] uppercase">
              {['Dinner', 'Lunch', 'Wine', 'Cocktails'].map((t, i) => (
                <span key={t} className={i === 0 ? 'border-b border-[#e9c46a] pb-1 text-[#e9c46a]' : 'text-[#f6f1e8]/50'}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-16 grid gap-x-16 gap-y-14 md:grid-cols-2">
            {Object.entries(MENU).map(([section, items]) => (
              <div key={section}>
                <h3 className={`border-b border-[#f6f1e8]/15 pb-3 text-3xl text-[#e9c46a] italic ${serifCls}`}>{section}</h3>
                <ul className="mt-6 space-y-6">
                  {items.map(([name, desc, price]) => (
                    <li key={name}>
                      <div className="flex items-baseline gap-3">
                        <span className={`text-2xl ${serifCls}`}>{name}</span>
                        <span className="flex-1 border-b border-dotted border-[#f6f1e8]/25" />
                        <span className={`text-2xl ${serifCls}`}>{price}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#f6f1e8]/55">{desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="grid grid-cols-2 gap-1 md:grid-cols-4">
        {['food-tagliatelle', 'food-pizza', 'food-wine', 'food-shrimp', 'food-chef', 'food-table', 'food-cozy'].map((img, i) => (
          <div key={img} className={`group relative overflow-hidden ${i === 2 ? 'row-span-2 aspect-auto' : 'aspect-square'}`}>
            <Image src={`/demo/${img}.webp`} alt="" fill sizes="25vw" className="object-cover transition duration-700 group-hover:scale-110" />
          </div>
        ))}
      </section>

      {/* Events */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-28 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs tracking-[0.4em] text-[#8c2f1b] uppercase">Private dining</p>
          <h2 className={`mt-4 text-5xl leading-tight font-medium ${serifCls}`}>
            Celebrate <i>around our table</i>
          </h2>
          <p className="mt-5 text-lg text-[#2b211c]/75">Our candlelit wine room seats up to 40 for birthdays, rehearsal dinners and company gatherings, with custom family-style menus.</p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              ['40', 'guests'],
              ['3', 'set menus'],
              ['120+', 'wines'],
            ].map(([n, l]) => (
              <div key={l} className="border border-[#2b211c]/15 py-5">
                <p className={`text-4xl ${serifCls}`}>{n}</p>
                <p className="text-[10px] tracking-[0.25em] text-[#2b211c]/60 uppercase">{l}</p>
              </div>
            ))}
          </div>
          <span className="mt-8 inline-block bg-[#8c2f1b] px-8 py-4 text-xs tracking-[0.3em] text-[#f6f1e8] uppercase">Plan an event</span>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image src="/demo/food-cozy.webp" alt="" fill sizes="50vw" className="object-cover" />
        </div>
      </section>

      {/* Visit */}
      <section className="border-t border-[#2b211c]/10 bg-[#efe6d6]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-3">
          <div>
            <h3 className={`text-3xl ${serifCls}`}>Visit</h3>
            <p className="mt-3 text-[#2b211c]/70">
              418 Example Street
              <br />
              Old Town
            </p>
          </div>
          <div>
            <h3 className={`text-3xl ${serifCls}`}>Hours</h3>
            <p className="mt-3 text-[#2b211c]/70">
              Tue–Thu · 5pm – 10pm
              <br />
              Fri–Sat · 5pm – 11pm
              <br />
              Sun · 4pm – 9pm
            </p>
          </div>
          <div>
            <h3 className={`text-3xl ${serifCls}`}>Contact</h3>
            <p className="mt-3 text-[#2b211c]/70">
              (555) 018-4471
              <br />
              ciao@emberandolive.example
            </p>
          </div>
        </div>
      </section>
      <footer className={`bg-[#1d1512] py-10 text-center text-2xl text-[#f6f1e8] ${serifCls}`}>
        Ember <i>&amp;</i> Olive
      </footer>
    </div>
  );
}
