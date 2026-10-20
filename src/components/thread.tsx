import type { User } from '@/db/schema';
import { ago, fmtDate } from '@/lib/format';
import type { ThreadItem } from '@/lib/requests';

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// The request conversation, chat-style: my messages on the right, theirs on the left, status events centered.
export function Thread({ items, me }: { items: ThreadItem[]; me: User }) {
  return (
    <ol className="space-y-4">
      {items.map((m) => {
        if (m.kind === 'event') {
          return (
            <li key={m.id} className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="h-px flex-1 bg-zinc-200" />
              <span>
                <b className="font-medium text-zinc-700">{m.authorId === me.id ? 'You' : (m.authorName ?? 'Someone')}</b> {lower(m.body)} · {fmtDate(m.createdAt, true)}
              </span>
              <span className="h-px flex-1 bg-zinc-200" />
            </li>
          );
        }
        const mine = m.authorId === me.id;
        return (
          <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] sm:max-w-[70%]">
              <p className={`mb-1 text-xs text-zinc-500 ${mine ? 'text-right' : ''}`}>
                {mine ? 'You' : (m.authorName ?? 'Someone')}
                {!mine && m.authorRole === 'admin' && <span className="ml-1 rounded bg-brand-100 px-1 text-[10px] font-semibold text-brand-700">Owner</span>} ·{' '}
                <span title={fmtDate(m.createdAt, true)}>{ago(m.createdAt)}</span>
              </p>
              <div className={`rounded-2xl px-4 py-2.5 text-sm ${mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-white ring-1 ring-zinc-200'}`}>
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                {m.fileId && (
                  <a
                    href={`/files/${m.fileId}`}
                    className={`mt-1.5 flex items-center gap-3 rounded-xl px-3 py-2.5 ${mine ? 'bg-white/15 hover:bg-white/25' : 'bg-zinc-50 ring-1 ring-zinc-200 hover:bg-zinc-100'} ${m.body ? 'mt-2' : ''}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase ${mine ? 'bg-white text-brand-700' : 'bg-brand-600 text-white'}`}>
                      {m.fileName?.split('.').pop()?.slice(0, 4) ?? 'file'}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{m.fileName}</span>
                      <span className={`block text-xs ${mine ? 'text-white/75' : 'text-zinc-500'}`}>
                        {kb(m.fileSize ?? 0)} · Download
                        {m.importedCount ? ` · ${m.importedCount} leads added to My leads` : ''}
                      </span>
                    </span>
                  </a>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const lower = (s: string | null) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
