import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { isLocale, defaultLocale, type Locale } from '@/i18n/locales';
import { getCart } from '@/features/cart/queries';
import { removeFromCart } from '@/features/cart/actions';
import { formatEur } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  setRequestLocale(locale);

  const [cart, t, tDrop] = await Promise.all([
    getCart(locale),
    getTranslations('cart'),
    getTranslations('drop'),
  ]);

  return (
    <section className="container" style={{ paddingTop: 72, paddingBottom: 90, maxWidth: 860, margin: '0 auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: 'clamp(30px, 3.6vw, 48px)', marginBottom: 36 }}>
        {t('title')}
      </h1>

      {cart.items.length === 0 ? (
        <div>
          <p style={{ fontWeight: 300, color: 'var(--stone)' }}>{t('empty')}</p>
          <div style={{ marginTop: 28 }}>
            <Link href="/" className="btn btn-dark">
              {t('backToShop')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            {cart.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 20,
                  alignItems: 'center',
                  padding: '20px 0',
                  borderBottom: '1px solid var(--line)',
                  opacity: item.state === 'sold' ? 0.5 : 1,
                }}
              >
                <Link
                  href={`/product/${item.slug}`}
                  style={{
                    width: 88,
                    aspectRatio: '4 / 5',
                    background: 'var(--card-bg)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {item.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : null}
                </Link>
                <div style={{ flex: 1 }}>
                  <div className="label-xs" style={{ color: 'var(--stone)', fontWeight: 600 }}>
                    {item.brand}
                  </div>
                  <Link href={`/product/${item.slug}`} style={{ display: 'block', fontSize: 15, marginTop: 6 }}>
                    {item.title}
                  </Link>
                  {item.state === 'sold' ? (
                    <div className="label-xs" style={{ color: 'var(--bronze)', marginTop: 6 }}>
                      {t('itemUnavailable')}
                    </div>
                  ) : item.state === 'on_hold' ? (
                    <div className="label-xs" style={{ color: 'var(--bronze)', marginTop: 6 }}>
                      {tDrop('onHold')}
                    </div>
                  ) : null}
                </div>
                <div style={{ fontWeight: 700, color: 'var(--bronze)' }}>{formatEur(item.price)}</div>
                <form
                  action={async () => {
                    'use server';
                    await removeFromCart(item.id);
                  }}
                >
                  <button type="submit" className="label-xs" style={{ color: 'var(--stone)', textDecoration: 'underline' }}>
                    {t('remove')}
                  </button>
                </form>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 28,
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
              <span className="label-sm" style={{ color: 'var(--stone)' }}>
                {t('subtotal')}
              </span>
              <span style={{ fontWeight: 800, fontSize: 26 }}>{formatEur(cart.subtotal)}</span>
            </div>
            <Link href="/checkout" className="btn btn-dark">
              {t('checkout')} →
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
