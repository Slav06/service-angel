'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

type State = { ok?: string; error?: string } | null;

// A form bound to a server action that reports { ok } / { error } under the fields.
export function ActionForm({
  action,
  children,
  className,
  reset = false,
}: {
  action: (prev: State, f: FormData) => Promise<State>;
  children: React.ReactNode;
  className?: string;
  reset?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (reset && state?.ok) ref.current?.reset();
  }, [state, reset]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <p className="text-sm text-red-600 sm:col-span-full">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700 sm:col-span-full">{state.ok}</p>}
    </form>
  );
}

export function Submit({ children, className = 'btn btn-primary' }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? 'Saving…' : children}
    </button>
  );
}

export function ConfirmButton({
  children,
  message,
  className = 'btn btn-sm',
  formAction,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  formAction?: (f: FormData) => void | Promise<void>;
}) {
  return (
    <button className={className} formAction={formAction} onClick={(e) => !confirm(message) && e.preventDefault()}>
      {children}
    </button>
  );
}
