'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

type State = { ok?: string; error?: string } | null;

// Message box with an optional file attachment, used on both sides of a lead request.
export function Composer({
  action,
  requestId,
  placeholder,
  owner = false,
}: {
  action: (prev: State, f: FormData) => Promise<State>;
  requestId: number;
  placeholder: string;
  owner?: boolean; // the owner gets delivery options when attaching a file
}) {
  const [state, formAction] = useActionState(action, null);
  const [file, setFile] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={formAction} onReset={() => setFile(null)} className="space-y-3">
      <input type="hidden" name="id" value={requestId} />
      <textarea name="body" rows={3} placeholder={placeholder} className="input resize-y" />
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn cursor-pointer">
          📎 {file ? 'Change file' : 'Attach a file'}
          <input name="file" type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {file && (
          <span className="text-sm text-zinc-600">
            {file.name} <span className="text-zinc-400">({Math.max(1, Math.round(file.size / 1024))} KB)</span>
          </span>
        )}
        <span className="ml-auto" />
        <Send />
      </div>
      {owner && file && (
        <div className="space-y-2 rounded-lg bg-zinc-50 p-3 text-sm">
          {/\.(csv|tsv|txt)$/i.test(file.name) ? (
            <label className="flex items-start gap-2">
              <input type="checkbox" name="import" defaultChecked className="mt-0.5" />
              <span>
                Also add these leads to the rep’s <b>My leads</b> list
                <span className="block text-xs text-zinc-500">Columns: business, contact, phone, email, city, niche, website (header row optional).</span>
              </span>
            </label>
          ) : (
            <p className="text-xs text-zinc-500">The rep can download this file. Only CSV files can be loaded straight into their lead list.</p>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" name="complete" defaultChecked /> This completes the request
          </label>
        </div>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      <p className="text-xs text-zinc-400">Files up to 4 MB — spreadsheets (CSV, Excel), PDFs, docs or images.</p>
    </form>
  );
}

function Send() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" disabled={pending}>
      {pending ? 'Sending…' : 'Send'}
    </button>
  );
}
