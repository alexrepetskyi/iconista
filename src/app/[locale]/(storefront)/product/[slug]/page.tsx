import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { isLocale, defaultLocale, type Locale } from '@/i18n/locales';
import { getProductBySlug } from '@/features/products/queries';
import { ProductActions } from '@/features/products/components/ProductActions';
import { formatEur } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  setRequestLocale(locale);

  const [product, t] = await Promise.all([
    getProductBySlug(slug, locale),
    getTranslations('product'),
  ]);
  if (!product) notFound();

  const save =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : null;

  return (
    <section
      className="container"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 1.1fr) minmax(300px, 0.9fr)',
        gap: 56,
        padding: '56px 40px 90px',
        alignItems: 'start',
      }}
    >
      {/* gallery */}
      <div style={{ display: 'grid', gap: 16 }}>
        {(product.images.length ? product.images : [null]).map((image, i) => (
          <div
            key={i}
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
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={`${product.brand} ${product.title} — ${i + 1}`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontWeight: 200, fontSize: 14, color: 'var(--ink-32)' }}>
                {product.brand} · {product.title}
              </span>
            )}
            {i === 0 && save ? (
              <span
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  background: 'var(--ink)',
                  color: 'var(--cream)',
                  padding: '6px 11px',
                }}
              >
                {t('save', { amount: formatEur(save) })}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {/* details */}
      <div style={{ position: 'sticky', top: 32 }}>
        <Link
          href={`/drop/${product.drop.slug}`}
          className="label-sm"
          style={{ color: 'var(--bronze)' }}
        >
          ← {t('backToDrop')} · Drop {String(product.drop.number).padStart(3, '0')}
        </Link>
        <div
          className="label-sm"
          style={{ color: 'var(--stone)', marginTop: 28, fontWeight: 600 }}
        >
          {product.brand}
        </div>
        <h1
          style={{
            fontWeight: 800,
            fontSize: 'clamp(30px, 3.6vw, 48px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.02,
            marginTop: 10,
          }}
        >
          {product.title}
        </h1>

        <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', marginTop: 22 }}>
          <span style={{ fontWeight: 800, fontSize: 30, color: 'var(--bronze)' }}>
            {formatEur(product.price)}
          </span>
          {product.compareAtPrice ? (
            <span style={{ fontWeight: 300, fontSize: 17, color: 'var(--stone)', textDecoration: 'line-through' }}>
              {formatEur(product.compareAtPrice)}
            </span>
          ) : null}
        </div>

        {product.description ? (
          <p style={{ marginTop: 26, fontSize: 14, fontWeight: 300, lineHeight: 1.75, color: '#4d463a', maxWidth: 460 }}>
            {product.description}
          </p>
        ) : null}

        <div style={{ marginTop: 34 }}>
          <ProductActions productId={product.id} state={product.state} />
        </div>

        <div
          className="label-xs"
          style={{
            marginTop: 30,
            paddingTop: 22,
            borderTop: '1px solid var(--line)',
            color: 'var(--stone)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--gold)' }}>✦</span> {t('authenticity')}
        </div>
      </div>
    </section>
  );
}
