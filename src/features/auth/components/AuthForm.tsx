'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { loginAction, registerAction } from '@/features/auth/actions';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const t = useTranslations('auth');
  const router = useRouter();
  // useActionState so the form POSTs to the server action even before
  // hydration — a native pre-hydration submit must never GET credentials.
  const [state, formAction, pending] = useActionState(
    mode === 'login' ? loginAction : registerAction,
    null,
  );
  const error = state && !state.ok ? state.error : null;

  useEffect(() => {
    if (state?.ok) {
      router.push('/account');
      router.refresh();
    }
  }, [state, router]);

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <h1 style={{ fontWeight: 800, fontSize: 34, marginBottom: 28 }}>
        {mode === 'login' ? t('signInTitle') : t('registerTitle')}
      </h1>

      <a
        href="/api/auth/signin/google"
        className="btn btn-outline-dark"
        style={{ display: 'block', textAlign: 'center', width: '100%' }}
      >
        {t('withGoogle')}
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span className="label-xs" style={{ color: 'var(--stone)' }}>
          {t('or')}
        </span>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      <form action={formAction} style={{ display: 'grid', gap: 14 }}>
        {mode === 'register' ? (
          <input name="name" placeholder={t('name')} className="field" autoComplete="name" />
        ) : null}
        <input
          name="email"
          type="email"
          required
          placeholder={t('email')}
          className="field"
          autoComplete="email"
        />
        <input
          name="password"
          type="password"
          required
          minLength={mode === 'register' ? 8 : undefined}
          placeholder={t('password')}
          className="field"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        />
        {error ? <p className="form-error">{t(error)}</p> : null}
        <button type="submit" disabled={pending} className="btn btn-dark" style={{ width: '100%' }}>
          {mode === 'login' ? t('signIn') : t('register')}
        </button>
      </form>

      <p style={{ marginTop: 22, fontSize: 13, fontWeight: 300, color: 'var(--stone)' }}>
        {mode === 'login' ? t('noAccount') : t('haveAccount')}{' '}
        <Link
          href={mode === 'login' ? '/register' : '/login'}
          style={{ textDecoration: 'underline', color: 'var(--ink)' }}
        >
          {mode === 'login' ? t('register') : t('signIn')}
        </Link>
      </p>
    </div>
  );
}
