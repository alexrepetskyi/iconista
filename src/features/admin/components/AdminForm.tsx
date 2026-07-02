'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminResult } from '@/features/admin/actions';

type FormAction = (prev: AdminResult, formData: FormData) => Promise<AdminResult>;

/**
 * Thin wrapper over useActionState: the form POSTs to the server action even
 * before hydration (no GET fallback leaking fields into the URL).
 */
export function AdminForm({
  action,
  submitLabel,
  children,
  resetOnSuccess = true,
  inline = false,
}: {
  action: FormAction;
  submitLabel: string;
  children: React.ReactNode;
  resetOnSuccess?: boolean;
  /** Single-row form: fields, button and status share one line. */
  inline?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      router.refresh();
    }
  }, [state, resetOnSuccess, router]);

  const status = state ? (
    <span className={state.ok ? 'form-ok' : 'form-error'} style={{ marginTop: 0 }}>
      {state.ok ? (state.id ? `Done: ${state.id}` : 'Done') : state.error}
    </span>
  ) : null;

  const submit = (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-dark"
      style={inline ? { padding: '10px 18px', fontSize: 11, flexShrink: 0 } : undefined}
    >
      {submitLabel}
    </button>
  );

  if (inline) {
    return (
      <form
        ref={formRef}
        action={formAction}
        style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
      >
        {children}
        {submit}
        {status}
      </form>
    );
  }

  return (
    <form ref={formRef} action={formAction} style={{ display: 'grid', gap: 12 }}>
      {children}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {submit}
        {status}
      </div>
    </form>
  );
}

/** One-click admin button bound to a server action (publish, close, disable…). */
export function AdminButton({
  action,
  label,
  variant = 'outline',
}: {
  action: () => Promise<AdminResult>;
  label: string;
  variant?: 'dark' | 'outline';
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span>
      <button
        onClick={() =>
          startTransition(async () => {
            const result = await action();
            if (result?.ok) router.refresh();
            else setError(result ? result.error : 'Failed');
          })
        }
        disabled={pending}
        className={variant === 'dark' ? 'btn btn-dark' : 'btn btn-outline-dark'}
        style={{ padding: '10px 18px', fontSize: 11 }}
      >
        {label}
      </button>
      {error ? <span className="form-error" style={{ marginLeft: 10 }}>{error}</span> : null}
    </span>
  );
}
