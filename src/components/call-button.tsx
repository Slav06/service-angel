'use client';

import { OPEN_EVENT } from './dialer-panel';

// Dials through the Dialerr panel when it's on the page (so the call is logged and recorded);
// otherwise a plain phone link.
export function CallButton({ phone, name, className, children }: { phone: string; name?: string; className?: string; children?: React.ReactNode }) {
  return (
    <a
      href={`tel:${phone}`}
      className={className}
      title="Call with Dialerr"
      onClick={(e) => {
        if (!window.Dialerr?.startCall) return;
        e.preventDefault();
        window.dispatchEvent(new Event(OPEN_EVENT));
        window.Dialerr.startCall(phone, name);
      }}
    >
      {children ?? phone}
    </a>
  );
}
