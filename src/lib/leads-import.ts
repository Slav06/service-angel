import { getDb } from '@/db';
import { leads } from '@/db/schema';

const HEADER_ALIASES: Record<string, string> = {
  business: 'business', company: 'business', 'business name': 'business', name: 'business',
  contact: 'contactName', 'contact name': 'contactName', owner: 'contactName',
  phone: 'phone', 'phone number': 'phone', tel: 'phone',
  email: 'email', 'e-mail': 'email',
  website: 'website', url: 'website', site: 'website',
  city: 'city', location: 'city', area: 'city',
  niche: 'niche', category: 'niche', industry: 'niche', type: 'niche',
};
const DEFAULT_COLUMNS = ['business', 'contactName', 'phone', 'email', 'city', 'niche', 'website'];
export const MAX_IMPORT = 5000;

function parseLine(line: string, sep: string) {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

export type LeadRow = Record<string, string>;

// Rows pasted from a spreadsheet (tabs) or a CSV file. A header row is detected; otherwise columns are
// business, contact, phone, email, city, niche, website. Rows without a business name are dropped.
export function parseLeadTable(text: string): LeadRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const first = parseLine(lines[0], sep).map((h) => HEADER_ALIASES[h.toLowerCase()]);
  const hasHeader = first.filter(Boolean).length >= 2;
  const columns = hasHeader ? first : DEFAULT_COLUMNS;
  return (hasHeader ? lines.slice(1) : lines)
    .map((line) => {
      const cells = parseLine(line, sep);
      const r: LeadRow = {};
      columns.forEach((c, i) => {
        if (c && cells[i]) r[c] = cells[i].slice(0, 200);
      });
      return r;
    })
    .filter((r) => r.business);
}

export async function insertLeads(
  rows: LeadRow[],
  opts: { repId: number | null; requestId?: number; niche?: string | null; city?: string | null },
) {
  const db = await getDb();
  const now = new Date();
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(leads).values(
      rows.slice(i, i + 500).map((r) => ({
        business: r.business,
        contactName: r.contactName || null,
        phone: r.phone || null,
        email: r.email || null,
        website: r.website || null,
        city: r.city || opts.city || null,
        niche: r.niche || opts.niche || null,
        source: 'import' as const,
        repId: opts.repId,
        requestId: opts.requestId ?? null,
        assignedAt: opts.repId ? now : null,
      })),
    );
  }
  return rows.length;
}
