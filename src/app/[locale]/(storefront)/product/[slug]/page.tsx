import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { isLocale, defaultLocale, type Locale } from '@/i18n/locales';
import { getProductBySlug } from '@/features/products/queries';
import { ProductActions } from '@/features/products/components/ProductActions';
import { ProductGallery } from '@/features/products/components/ProductGallery';
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
      className="split container"
      style={{
        ['--split-cols' as string]: '1.1fr 0.9fr',
        gap: 56,
        paddingTop: 56,
        paddingBottom: 90,
        alignItems: 'start',
      }}
    >
      {/* gallery: main frame + thumbnail rail */}
      <ProductGallery
        images={product.images}
        alt={`${product.brand} · ${product.title}`}
        badge={save ? t('save', { amount: formatEur(save) }) : null}
      />

      {/* details */}
      <div className="sticky-col" style={{ position: 'sticky', top: 32 }}>
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
          <div
            className="prose"
            style={{ marginTop: 26, maxWidth: 460 }}
            // sanitized on save with a strict allowlist (features/products/sanitize.ts)
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
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
