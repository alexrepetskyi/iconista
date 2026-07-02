import { connectDb } from '@/lib/mongodb';
import { Order } from '@/models/Order';
import { AdminForm, AdminButton } from '@/features/admin/components/AdminForm';
import { markOrderShipped, markOrderDelivered } from '@/features/admin/actions';
import { orderNumber } from '@/features/orders/fulfill';
import { formatEur } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await connectDb();
  const orders = await Order.find().sort({ createdAt: -1 }).limit(200);

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
            return markOrderShipped(String(order._id), String(formData.get('tracking') ?? ''));
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

              {order.shippingAddress ? (
                <div className="label-xs" style={{ color: 'var(--stone)', marginTop: 8 }}>
                  {JSON.stringify(order.shippingAddress)}
                </div>
              ) : null}

              <div style={{ marginTop: 14 }}>
                {order.status === 'paid' ? (
                  <AdminForm action={shipAction} submitLabel="Mark shipped + email" resetOnSuccess>
                    <input name="tracking" placeholder="Tracking number" className="field" required style={{ maxWidth: 320 }} />
                  </AdminForm>
                ) : order.status === 'shipped' ? (
                  <AdminButton
                    action={markOrderDelivered.bind(null, String(order._id))}
                    label="Mark delivered"
                  />
                ) : order.trackingNumber ? (
                  <span className="label-xs" style={{ color: 'var(--stone)' }}>
                    Tracking: {order.trackingNumber}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
        {orders.length === 0 ? <p style={{ color: 'var(--stone)', fontWeight: 300 }}>No orders yet.</p> : null}
      </div>
    </div>
  );
}
