import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Ticker } from '@/components/Ticker';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { currentUser, signOut } from '@/features/auth/auth';
import { getMyOrders } from '@/features/orders/queries';
import { formatEur } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);

  const [orders, t, tNav] = await Promise.all([
    getMyOrders(),
    getTranslations('account'),
    getTranslations('nav'),
  ]);

  return (
    <>
      <Ticker dropNumber={null} pieceCount={0} />
      <SiteHeader />
      <main
        className="container"
        style={{ padding: '72px 40px 120px', maxWidth: 860, margin: '0 auto', minHeight: '50vh' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 16 }}>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(30px, 3.6vw, 48px)' }}>{t('title')}</h1>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <button type="submit" className="label-sm" style={{ color: 'var(--stone)', textDecoration: 'underline' }}>
              {tNav('signOut')}
            </button>
          </form>
        </div>

        {orders.length === 0 ? (
          <p style={{ marginTop: 32, fontWeight: 300, color: 'var(--stone)' }}>{t('noOrders')}</p>
        ) : (
          <div style={{ marginTop: 36, display: 'grid', gap: 20 }}>
            {orders.map((order) => (
              <div key={order.id} style={{ background: '#fff', padding: '24px 26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{t('order')} {order.number}</span>
                    <span className="label-xs" style={{ color: 'var(--stone)', marginLeft: 14 }}>
                      {new Date(order.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <span
                    className="label-xs"
                    style={{
                      color: 'var(--cream)',
                      background: order.status === 'refunded' || order.status === 'cancelled' ? 'var(--stone)' : 'var(--ink)',
                      padding: '5px 10px',
                    }}
                  >
                    {t(`status.${order.status}`)}
                  </span>
                </div>

                <div style={{ marginTop: 16, borderTop: '1px solid var(--line)' }}>
                  {order.items.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '10px 0',
                        borderBottom: '1px solid var(--line)',
                        fontSize: 14,
                      }}
                    >
                      <span style={{ fontWeight: 300 }}>
                        <strong style={{ fontWeight: 600 }}>{item.brand}</strong> {item.title}
                      </span>
                      <span>{formatEur(item.price)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 14, flexWrap: 'wrap', gap: 8 }}>
                  <span className="label-xs" style={{ color: 'var(--stone)' }}>
                    {order.trackingNumber ? `${t('tracking')}: ${order.trackingNumber}` : null}
                  </span>
                  <span>
                    {order.discount > 0 ? (
                      <span style={{ color: 'var(--bronze)', marginRight: 14 }}>
                        {t('discount')} ({order.promoCode}): −{formatEur(order.discount)}
                      </span>
                    ) : null}
                    <strong>{t('total')}: {formatEur(order.total)}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
