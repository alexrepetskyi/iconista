import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { isLocale, defaultLocale, type Locale } from '@/i18n/locales';
import { getStripe } from '@/lib/stripe';
import { connectDb } from '@/lib/mongodb';
import { Cart } from '@/models/Cart';

export const dynamic = 'force-dynamic';

export default async function CheckoutResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const [{ locale: raw }, { session_id: sessionId }] = await Promise.all([params, searchParams]);
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  setRequestLocale(locale);
  const t = await getTranslations('checkout');

  let paid = false;
  if (sessionId?.startsWith('mock_')) {
    // PAYMENT_MODE=mock — the order was fulfilled synchronously; verify in Mongo.
    const { Order } = await import('@/models/Order');
    await connectDb();
    paid = (await Order.exists({ stripeSessionId: sessionId, status: 'paid' })) !== null;
  } else if (sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === 'paid';
      // Clear purchased items from the owner's cart.
      if (paid && session.metadata?.productIds) {
        const ids = session.metadata.productIds.split(',').filter(Boolean);
        const ownerId = session.metadata.ownerId ?? '';
        await connectDb();
        const filter = ownerId.startsWith('u:')
          ? { userId: ownerId.slice(2) }
          : { sessionId: ownerId.slice(2) };
        await Cart.findOneAndUpdate(filter, { $pull: { productIds: { $in: ids } } });
      }
    } catch (err) {
      console.error('checkout result lookup failed', err);
    }
  }

  return (
    <section
      className="container"
      style={{ paddingTop: 96, paddingBottom: 120, maxWidth: 640, margin: '0 auto', textAlign: 'center' }}
    >
      {paid ? (
        <>
          <div style={{ color: 'var(--gold)', fontSize: 28 }}>✦</div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(30px, 3.6vw, 48px)', marginTop: 16 }}>
            {t('successTitle')}
          </h1>
          <p style={{ fontWeight: 300, color: 'var(--stone)', marginTop: 16, lineHeight: 1.6 }}>
            {t('success')}
          </p>
          <div style={{ marginTop: 32, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/account" className="btn btn-dark">
              {t('viewOrders')}
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(26px, 3vw, 40px)' }}>
            {t('reservationExpired')}
          </h1>
          <div style={{ marginTop: 28 }}>
            <Link href="/checkout" className="btn btn-dark">
              {t('reserveAgain')}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
