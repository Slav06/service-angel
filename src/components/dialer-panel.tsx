'use client';

import { useEffect, useState } from 'react';

const DIALER_URL = 'https://dialerr.com/dashboard';
const EMBED_SRC = 'https://dialerr.com/embed.js';
// With a publishable key the panel signs in automatically via /api/dialerr/token; without one, sign in inside it.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_DIALERR_KEY;
const KEY = 'sa:dialer-open';

// Dialerr's inline embed (https://dialerr.com/llms.txt), docked on the right of the owner admin, signed into
// the owner's Dialerr account. It lives in the admin layout, so the slot stays mounted
// (and a call keeps going) while you move between pages. One slot serves both layouts: a docked column on wide
// screens, a full-screen sheet behind a floating button on smaller ones.
export function DialerPanel() {
  const [open, setOpen] = useState(true); // wide screens: expanded vs collapsed to a tab
  const [sheet, setSheet] = useState(false); // small screens: sheet shown

  // Load the embed script once; it fills #dialerr with the dialer iframe.
  useEffect(() => {
    if (document.querySelector(`script[src="${EMBED_SRC}"]`)) return;
    const tag = document.createElement('script');
    tag.src = EMBED_SRC;
    tag.dataset.mode = 'inline';
    tag.dataset.target = '#dialerr';
    if (PUBLIC_KEY) {
      tag.dataset.key = PUBLIC_KEY;
      tag.dataset.tokenUrl = '/api/dialerr/token';
    }
    document.body.appendChild(tag);
  }, []);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved preference after hydration
      if (localStorage.getItem(KEY) === '0') setOpen(false);
    } catch {}
  }, []);

  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(KEY, o ? '0' : '1');
      } catch {}
      return !o;
    });
  };

  return (
    <>
      <button
        onClick={() => setSheet(true)}
        className={`fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg xl:hidden ${sheet ? 'hidden' : ''}`}
      >
        <PhoneIcon /> Dialerr
      </button>

      <aside
        aria-label="Dialerr"
        className={`flex-col bg-white ${sheet ? 'fixed inset-0 z-50 flex' : 'hidden'} xl:sticky xl:top-0 xl:z-auto xl:flex xl:h-screen xl:shrink-0 xl:border-l xl:border-zinc-200 xl:transition-[width] xl:duration-200 ${open ? 'xl:w-[440px]' : 'xl:w-11'}`}
      >
        <div className={`flex items-center gap-2 border-b border-zinc-200 px-2 py-2 ${open ? '' : 'xl:flex-col'}`}>
          <button
            onClick={toggle}
            className="hidden rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 xl:block"
            title={open ? 'Collapse Dialerr' : 'Open Dialerr'}
          >
            <svg viewBox="0 0 24 24" className={`h-4 w-4 transition ${open ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <span className={`flex items-center gap-1.5 px-1 text-sm font-semibold ${open ? '' : 'xl:hidden'}`}>
            <PhoneIcon /> Dialerr
          </span>
          <a
            href={DIALER_URL}
            target="_blank"
            rel="noreferrer"
            className={`ml-auto rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 ${open ? '' : 'xl:hidden'}`}
          >
            Open in new tab ↗
          </a>
          <button onClick={() => setSheet(false)} className="rounded-md px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 xl:hidden">
            Close
          </button>
          {!open && (
            <button onClick={toggle} className="mt-2 hidden flex-col items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-brand-700 xl:flex" title="Open Dialerr">
              <PhoneIcon />
              <span className="[writing-mode:vertical-rl]">Dialerr</span>
            </button>
          )}
        </div>
        {/* Kept mounted while collapsed so a live call isn't dropped. */}
        <div id="dialerr" className={`min-h-0 w-full flex-1 [&>iframe]:h-full [&>iframe]:w-full ${open ? '' : 'xl:hidden'}`} />
      </aside>
    </>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}
