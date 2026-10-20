import { BRAND } from '@/lib/brand';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${light ? 'text-white' : 'text-zinc-900'}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <circle cx="16" cy="16" r="16" className="fill-brand-600" />
        <ellipse cx="16" cy="8.5" rx="6" ry="2" fill="none" stroke="#fde68a" strokeWidth="1.8" />
        <path d="M16 12c-2.4 0-4 1.7-4 4v8h8v-8c0-2.3-1.6-4-4-4Z" fill="#fff" />
        <path d="M12 17c-3 0-5.5-1.8-6.5-4.5 2.6.2 4.8 1 6.5 2.6M20 17c3 0 5.5-1.8 6.5-4.5-2.6.2-4.8 1-6.5 2.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {BRAND.name}
    </span>
  );
}
