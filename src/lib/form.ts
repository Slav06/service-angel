import { parseMoney } from './format';

export const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? '').trim().slice(0, max);
export const optStr = (f: FormData, k: string, max = 500) => str(f, k, max) || null;

export function int(f: FormData, k: string, fallback = 0) {
  const n = Number(str(f, k, 20));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export const id = (f: FormData, k = 'id') => {
  const n = int(f, k, 0);
  return n > 0 ? n : null;
};

export const cents = (f: FormData, k: string) => parseMoney(str(f, k, 30));

// <input type="date"> value → noon local-ish UTC, so the day never shifts across zones.
export function date(f: FormData, k: string) {
  const v = str(f, k, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00Z`) : null;
}
