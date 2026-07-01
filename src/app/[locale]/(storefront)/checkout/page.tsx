import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { isLocale, defaultLocale, type Locale } from '@/i18n/locales';
import { getCart } from '@/features/cart/queries';
import { getRedis } from '@/lib/redis';
import { connectDb } from '@/lib/mongodb';
import { Product } from '@/models/Product';
import { getReservedIds } from '@/features/checkout/reservation';
import { toProductView } from '@/features/drops/queries';
import { CheckoutClient, type CheckoutItem } from '@/features/checkout/components/CheckoutClient';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ buy?: string }>;
}) {
  const [{ locale: raw }, { buy }] = await Promise.all([params, searchParams]);
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  setRequestLocale(locale);
  const t = await getTranslations('checkout');
  const tCart = await getTranslations('cart');

  let items: CheckoutItem[] = [];

  if (buy) {
    // "Buy now" — single-item checkout regardless of the rest of the cart.
    await connectDb();
    const product = await Product.findById(buy).catch(() => null);
    if (product && product.status === 'available') {
      const view = toProductView(product, locale, await getReservedIds(getRedis(), []));
      items = [
        {
          id: view.id,
          brand: view.brand,
          title: view.title,
          image: view.images[0] ?? null,
          price: view.price,
        },
      ];
    }
  } else {
    const cart = await getCart(locale);
    items = cart.items
      .filter((i) => i.state !== 'sold')
      .map((i) => ({
        id: i.id,
        brand: i.brand,
        title: i.title,
        image: i.images[0] ?? null,
        price: i.price,
      }));
  }

  return (
    <section className="container" style={{ padding: '72px 40px 90px', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: 'clamp(30px, 3.6vw, 48px)', marginBottom: 36 }}>
        {t('title')}
      </h1>
      {items.length === 0 ? (
        <div>
          <p style={{ fontWeight: 300, color: 'var(--stone)' }}>{tCart('empty')}</p>
          <div style={{ marginTop: 28 }}>
            <Link href="/" className="btn btn-dark">
              {tCart('backToShop')}
            </Link>
          </div>
        </div>
      ) : (
        <CheckoutClient items={items} />
      )}
    </section>
  );
}
