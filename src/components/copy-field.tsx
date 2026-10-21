'use client';

import { useState } from 'react';

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <input readOnly value={value} onFocus={(e) => e.target.select()} className="input font-mono text-xs" />
        <button
          type="button"
          className="btn btn-sm shrink-0"
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
