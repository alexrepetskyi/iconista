'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { startCheckout } from '@/features/checkout/actions';
import { previewPromo } from '@/features/promocodes/actions';
import { formatEur } from '@/lib/money';
import type { Locale } from '@/i18n/locales';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface CheckoutItem {
  id: string;
  brand: string;
  title: string;
  image: string | null;
  price: number;
}

const PROMO_ERROR_KEYS: Record<string, string> = {
  invalid: 'promoInvalid',
  expired: 'promoExpired',
  used: 'promoUsed',
  wrong_account: 'promoWrongAccount',
  need_sign_in: 'promoNeedSignIn',
  in_use: 'promoInUse',
  tooMany: 'promoInvalid',
};

export function CheckoutClient({ items: initialItems }: { items: CheckoutItem[] }) {
  const t = useTranslations('checkout');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [items, setItems] = useState(initialItems);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [takenTitles, setTakenTitles] = useState<string[] | null>(null);
  const [remainingIds, setRemainingIds] = useState<string[]>([]);
  const [fatal, setFatal] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price, 0), [items]);
  const total = Math.max(0, subtotal - (promo?.discount ?? 0));

  const applyPromo = () =>
    startTransition(async () => {
      setPromoError(null);
      const result = await previewPromo(promoInput, subtotal);
      if (result.ok) {
        setPromo({ code: result.code, discount: result.discount });
      } else {
        setPromo(null);
        setPromoError(PROMO_ERROR_KEYS[result.error] ?? 'promoInvalid');
      }
    });

  const begin = useCallback(
    (ids: string[]) =>
      startTransition(async () => {
        setFatal(null);
        setTakenTitles(null);
        const result = await startCheckout(ids, promo?.code ?? null, locale);
        if (result.ok) {
          if ('mock' in result) {
            // PAYMENT_MODE=mock — the order is already fulfilled server-side.
            router.push(`/checkout/result?session_id=${result.sessionId}`);
            return;
          }
          setClientSecret(result.clientSecret);
          return;
        }
        if (result.error === 'items_taken') {
          setTakenTitles(result.takenTitles);
          setRemainingIds(result.remainingIds);
          setItems((current) => current.filter((i) => result.remainingIds.includes(i.id)));
          return;
        }
        if (result.error === 'promo_error') {
          setPromo(null);
          setPromoError(PROMO_ERROR_KEYS[result.promoError ?? 'invalid'] ?? 'promoInvalid');
          return;
        }
        setFatal('allTaken');
      }),
    [promo, locale],
  );

  if (clientSecret) {
    return (
      <div style={{ background: '#fff', padding: 8 }}>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 className="label" style={{ color: 'var(--bronze)', marginBottom: 20 }}>
        {t('orderSummary')}
      </h2>

      <div style={{ borderTop: '1px solid var(--line)' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              padding: '14px 0',
              borderBottom: '1px solid var(--line)',
              fontSize: 14,
            }}
          >
            <span style={{ fontWeight: 300 }}>
              <strong style={{ fontWeight: 600 }}>{item.brand}</strong> {item.title}
            </span>
            <span style={{ fontWeight: 600 }}>{formatEur(item.price)}</span>
          </div>
        ))}
      </div>

      {takenTitles ? (
        <p className="form-error" style={{ marginTop: 14 }}>
          {t('itemsTaken', { titles: takenTitles.join(', ') })}
        </p>
      ) : null}
      {fatal ? (
        <p className="form-error" style={{ marginTop: 14 }}>
          {t('allTaken')}
        </p>
      ) : null}

      {/* promo code — always visible at checkout */}
      <div style={{ marginTop: 24 }}>
        <label className="label-xs" style={{ color: 'var(--stone)', display: 'block', marginBottom: 8 }}>
          {t('promoLabel')}
        </label>
        {promo ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
            <span style={{ color: 'var(--bronze)', fontWeight: 600 }}>
              {t('promoDiscount', { code: promo.code })} — −{formatEur(promo.discount)}
            </span>
            <button
              onClick={() => setPromo(null)}
              className="label-xs"
              style={{ textDecoration: 'underline', color: 'var(--stone)' }}
            >
              {t('promoRemove')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex' }}>
            <input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder={t('promoPlaceholder')}
              className="field"
              style={{ borderRight: 0 }}
            />
            <button
              onClick={applyPromo}
              disabled={pending || !promoInput.trim()}
              className="btn btn-dark"
            >
              {t('promoApply')}
            </button>
          </div>
        )}
        {promoError ? <p className="form-error">{t(promoError)}</p> : null}
      </div>

      {/* totals */}
      <div style={{ marginTop: 24, borderTop: '1px solid var(--ink)', paddingTop: 16, fontSize: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          <span style={{ fontWeight: 300 }}>{t('subtotal')}</span>
          <span>{formatEur(subtotal)}</span>
        </div>
        {promo ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--bronze)' }}>
            <span>{t('promoDiscount', { code: promo.code })}</span>
            <span>−{formatEur(promo.discount)}</span>
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 0 0',
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          <span>{t('total')}</span>
          <span>{formatEur(total)}</span>
        </div>
      </div>

      <button
        onClick={() => begin((takenTitles ? remainingIds : items.map((i) => i.id)))}
        disabled={pending || items.length === 0}
        className="btn btn-dark"
        style={{ width: '100%', marginTop: 28 }}
      >
        {takenTitles ? t('payForRest') : t('title')} →
      </button>
      <p className="label-xs" style={{ color: 'var(--stone)', marginTop: 12, textAlign: 'center' }}>
        {t('reservedFor', { minutes: 30 })}
      </p>
    </div>
  );
}
