'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { subscribeAction } from '@/features/newsletter/actions';

export function NewsletterForm() {
  const t = useTranslations('newsletter');
  const [state, formAction, pending] = useActionState(subscribeAction, null);

  if (state?.ok) {
    return (
      <p style={{ fontSize: 14, fontWeight: 300, color: 'var(--stone)' }}>{t('confirmSent')}</p>
    );
  }

  return (
    <form action={formAction} style={{ maxWidth: 460, width: '100%' }}>
      <div style={{ display: 'flex' }}>
        <input
          type="email"
          name="email"
          required
          placeholder={t('emailPlaceholder')}
          className="field"
          style={{ borderRight: 0 }}
        />
        <button type="submit" disabled={pending} className="btn btn-dark" style={{ whiteSpace: 'nowrap' }}>
          {t('notifyMe')}
        </button>
      </div>
      {state && !state.ok ? <p className="form-error">{t(state.error)}</p> : null}
    </form>
  );
}
