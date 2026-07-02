import { connectDb } from '@/lib/mongodb';
import { Order } from '@/models/Order';
import { AdminForm, AdminButton } from '@/features/admin/components/AdminForm';
import { Pagination, ADMIN_PAGE_SIZE, parsePage } from '@/features/admin/components/Pagination';
import { markOrderShipped, markOrderDelivered } from '@/features/admin/actions';
import { orderNumber } from '@/features/orders/fulfill';
import { formatEur } from '@/lib/money';

export const dynamic = 'force-dynamic';

/** Stripe's collected shipping details → one readable line. */
function formatAddress(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '';
  const details = raw as { name?: string; address?: Record<string, string | null> };
  const a = details.address ?? {};
  return [details.name, a.line1, a.line2, a.postal_code, a.city, a.state, a.country]
    .filter(Boolean)
    .join(', ');
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale }, { page: rawPage }] = await Promise.all([params, searchParams]);
  const page = parsePage(rawPage);

  await connectDb();
  const total = await Order.countDocuments();
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * ADMIN_PAGE_SIZE)
    .limit(ADMIN_PAGE_SIZE);

  return (
    <div>
      <h1 style={{ fontWeight: 800, fontSize: 34, marginBottom: 24 }}>Orders</h1>
      <div style={{ display: 'grid', gap: 14 }}>
        {orders.map((order) => {
          const shipAction = async (
            _prev: Awaited<ReturnType<typeof markOrderShipped>>,
            formData: FormData,
          ) => {
            'use server';
            return markOrderShipped(String(order._id), {
              trackingNumber: String(formData.get('tracking') ?? ''),
              carrier: String(formData.get('carrier') ?? ''),
              trackingUrl: String(formData.get('trackingUrl') ?? ''),
            });
          };
          return (
            <div key={String(order._id)} style={{ background: '#fff', padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <strong>{orderNumber(order)}</strong>
                  <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--stone)' }}>{order.email}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>{formatEur(order.total)}</span>
                  <span
                    className="label-xs"
                    style={{ background: 'var(--ink)', color: 'var(--cream)', padding: '5px 10px' }}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: '#4d463a' }}>
                {order.items.map((item, i) => (
                  <span key={i}>
                    {item.brand} {item.title}
                    {i < order.items.length - 1 ? ' · ' : ''}
                  </span>
                ))}
                {order.promoCode ? (
                  <span style={{ color: 'var(--bronze)' }}>
                    {' '}
                    · promo {order.promoCode} (−{formatEur(order.discount ?? 0)})
                  </span>
                ) : null}
              </div>

              {formatAddress(order.shippingAddress) ? (
                <div className="label-xs" style={{ color: 'var(--stone)', marginTop: 8 }}>
                  📦 {formatAddress(order.shippingAddress)}
                </div>
              ) : null}

              <div style={{ marginTop: 14 }}>
                {order.status === 'paid' ? (
                  <AdminForm action={shipAction} submitLabel="Ship + email" resetOnSuccess inline>
                    <input name="tracking" placeholder="Tracking number" className="field" required style={{ flex: '1 1 140px', maxWidth: 200, padding: '9px 12px', fontSize: 13 }} />
                    <input name="carrier" placeholder="Carrier (e.g. DHL)" className="field" style={{ flex: '1 1 120px', maxWidth: 160, padding: '9px 12px', fontSize: 13 }} />
                    <input name="trackingUrl" type="url" placeholder="Tracking link (https://…)" className="field" style={{ flex: '2 1 200px', maxWidth: 300, padding: '9px 12px', fontSize: 13 }} />
                  </AdminForm>
                ) : order.status === 'shipped' ? (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="label-xs" style={{ color: 'var(--stone)' }}>
                      {order.carrier ? `${order.carrier} · ` : ''}
                      {order.trackingUrl ? (
                        <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                          {order.trackingNumber}
                        </a>
                      ) : (
                        order.trackingNumber
                      )}
                    </span>
                    <AdminButton
                      action={markOrderDelivered.bind(null, String(order._id))}
                      label="Mark delivered"
                    />
                  </div>
                ) : order.trackingNumber ? (
                  <span className="label-xs" style={{ color: 'var(--stone)' }}>
                    {order.carrier ? `${order.carrier} · ` : ''}Tracking: {order.trackingNumber}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
        {orders.length === 0 ? <p style={{ color: 'var(--stone)', fontWeight: 300 }}>No orders yet.</p> : null}
      </div>
      <Pagination page={page} total={total} basePath={`/${locale}/admin/orders`} />
    </div>
  );
}
