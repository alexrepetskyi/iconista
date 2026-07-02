import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { ProductView } from '@/features/drops/queries';
import { formatEur } from '@/lib/money';

/** Drop-grid product card — SAVE badge, hover state, SOLD OUT / ON HOLD variants. */
export function ProductCard({ product }: { product: ProductView }) {
  const t = useTranslations('drop');
  const gone = product.state === 'sold';
  const held = product.state === 'on_hold';
  const save =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : null;

  // Sold pieces are history — the card stays visible but leads nowhere.
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    gone ? (
      <div style={{ display: 'block', cursor: 'default' }}>{children}</div>
    ) : (
      <Link href={`/product/${product.slug}`} style={{ display: 'block' }}>
        {children}
      </Link>
    );

  return (
    <article style={{ opacity: gone ? 0.55 : 1 }}>
      <Wrapper>
        <div
          style={{
            position: 'relative',
            aspectRatio: '4 / 5',
            background: 'var(--card-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={`${product.brand} ${product.title}`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontWeight: 200, fontSize: 14, color: 'var(--ink-32)' }}>
              {product.brand} · {product.title}
            </span>
          )}

          <span
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              background: gone || held ? 'var(--bronze)' : 'var(--ink)',
              color: 'var(--cream)',
              padding: '6px 11px',
            }}
          >
            {gone
              ? t('soldOut')
              : held
                ? t('onHold')
                : save
                  ? t('save', { amount: formatEur(save) })
                  : product.brand}
          </span>

          {!gone && !held ? (
            <span
              style={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: 16,
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                background: 'var(--ink)',
                color: 'var(--cream)',
                padding: '13px 0',
              }}
            >
              {t('orderNow')} →
            </span>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--stone)',
          }}
        >
          {product.brand}
        </div>
        <div style={{ marginTop: 6, fontSize: 15, fontWeight: 400 }}>{product.title}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: gone ? 'var(--stone)' : 'var(--bronze)' }}>
            {formatEur(product.price)}
          </span>
          {product.compareAtPrice ? (
            <span
              style={{
                fontWeight: 300,
                fontSize: 13,
                color: 'var(--stone)',
                textDecoration: 'line-through',
              }}
            >
              {formatEur(product.compareAtPrice)}
            </span>
          ) : null}
        </div>
      </Wrapper>
    </article>
  );
}
