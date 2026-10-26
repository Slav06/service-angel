// A plain phone link: the Dialerr toolbar picks up tel: links and places the call.
export function CallButton({ phone, className, children }: { phone: string; name?: string; className?: string; children?: React.ReactNode }) {
  return (
    <a href={`tel:${phone}`} className={className} title="Call with Dialerr">
      {children ?? phone}
    </a>
  );
}
