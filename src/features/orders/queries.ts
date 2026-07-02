import { connectDb } from '@/lib/mongodb';
import { Order, type OrderDoc } from '@/models/Order';
import { currentUser } from '@/features/auth/auth';
import { orderNumber } from './fulfill';

export interface OrderView {
  id: string;
  number: string;
  createdAt: string;
  status: OrderDoc['status'];
  items: { brand: string; title: string; image: string; price: number }[];
  subtotal: number;
  discount: number;
  promoCode: string | null;
  total: number;
  trackingNumber: string | null;
  carrier: string | null;
  trackingUrl: string | null;
}

export function toOrderView(order: OrderDoc): OrderView {
  return {
    id: String(order._id),
    number: orderNumber(order),
    createdAt: (order as unknown as { createdAt: Date }).createdAt.toISOString(),
    status: order.status,
    items: order.items.map((i) => ({
      brand: i.brand,
      title: i.title,
      image: i.image ?? '',
      price: i.price,
    })),
    subtotal: order.subtotal,
    discount: order.discount ?? 0,
    promoCode: order.promoCode ?? null,
    total: order.total,
    trackingNumber: order.trackingNumber ?? null,
    carrier: order.carrier ?? null,
    trackingUrl: order.trackingUrl ?? null,
  };
}

export async function getMyOrders(): Promise<OrderView[]> {
  const user = await currentUser();
  if (!user) return [];
  await connectDb();
  const orders = await Order.find({ userId: user.id }).sort({ createdAt: -1 });
  return orders.map(toOrderView);
}
