'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { subscribe } from '@/features/newsletter/actions';
import type { Locale } from '@/i18n/locales';

export function NewsletterForm() {
  const t = useTranslations('newsletter');
  const locale = useLocale() as Locale;
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sent' | 'invalidEmail' | 'tooMany'>('idle');
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await subscribe(email, locale);
      setState(result.ok ? 'sent' : result.error);
    });
  };

  if (state === 'sent') {
    return (
      <p style={{ fontSize: 14, fontWeight: 300, color: 'var(--stone)' }}>{t('confirmSent')}</p>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 0, maxWidth: 460, width: '100%' }}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('emailPlaceholder')}
        className="field"
        style={{ borderRight: 0 }}
      />
      <button type="submit" disabled={pending} className="btn btn-dark" style={{ whiteSpace: 'nowrap' }}>
        {t('notifyMe')}
      </button>
      {state !== 'idle' ? <span className="form-error">{t(state)}</span> : null}
    </form>
  );
}
