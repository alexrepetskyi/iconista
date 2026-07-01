'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { addToCart } from '@/features/cart/actions';

/** "Add to cart" + "Buy now" on the product page. Buy now = single-item checkout. */
export function ProductActions({
  productId,
  state,
}: {
  productId: string;
  state: 'available' | 'on_hold' | 'sold';
}) {
  const t = useTranslations('product');
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  if (state === 'sold') {
    return <div className="label-sm" style={{ color: 'var(--stone)' }}>{t('soldOut')}</div>;
  }
  if (state === 'on_hold') {
    return <div className="label-sm" style={{ color: 'var(--bronze)' }}>{t('onHold')}</div>;
  }

  const add = () =>
    startTransition(async () => {
      const result = await addToCart(productId);
      if (result.ok) setAdded(true);
      else setError(true);
    });

  const buyNow = () =>
    startTransition(async () => {
      const result = await addToCart(productId);
      if (!result.ok) {
        setError(true);
        return;
      }
      router.push(`/checkout?buy=${productId}`);
    });

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <button onClick={buyNow} disabled={pending} className="btn btn-dark">
          {t('buyNow')}
        </button>
        <button onClick={add} disabled={pending || added} className="btn btn-outline-dark">
          {added ? t('inCart') : t('addToCart')}
        </button>
      </div>
      {error ? <p className="form-error">{t('soldOut')}</p> : null}
    </div>
  );
}
