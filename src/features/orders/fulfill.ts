import type Stripe from 'stripe';
import { connectDb } from '@/lib/mongodb';
import { getRedis } from '@/lib/redis';
import { Order, type OrderDoc } from '@/models/Order';
import { Product } from '@/models/Product';
import { PromoCode } from '@/models/PromoCode';
import { releaseReservations } from '@/features/checkout/reservation';
import { releasePromoHold } from '@/features/promocodes/hold';
import { invalidateLiveDropCache } from '@/features/drops/queries';
import { sendOrderConfirmedEmail, sendOrderRefundedEmail } from '@/features/emails/send';
import { pickLocalized, defaultLocale } from '@/i18n/locales';

export function orderNumber(order: Pick<OrderDoc, '_id'>): string {
  return `IC-${String(order._id).slice(-6).toUpperCase()}`;
}

interface SessionMeta {
  ownerId: string;
  userId: string;
  productIds: string[];
  promoCode: string;
  subtotal: number;
  discount: number;
}

function parseMeta(session: Stripe.Checkout.Session): SessionMeta | null {
  const m = session.metadata;
  if (!m?.productIds) return null;
  return {
    ownerId: m.ownerId ?? '',
    userId: m.userId ?? '',
    productIds: m.productIds.split(',').filter(Boolean),
    promoCode: m.promoCode ?? '',
    subtotal: Number(m.subtotal ?? 0),
    discount: Number(m.discount ?? 0),
  };
}

/**
 * checkout.session.completed — the single place an order becomes real.
 * Idempotent: a Stripe retry finds the existing order and stops.
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const meta = parseMeta(session);
  if (!meta) {
    console.error('webhook: session without metadata', session.id);
    return;
  }

  await connectDb();
  if (await Order.exists({ stripeSessionId: session.id })) return;

  const products = await Product.find({ _id: { $in: meta.productIds } });
  await Product.updateMany({ _id: { $in: meta.productIds } }, { $set: { status: 'sold' } });

  const email =
    session.customer_details?.email?.toLowerCase() ?? session.customer_email?.toLowerCase();
  const now = new Date();
  const order = await Order.create({
    ...(meta.userId ? { userId: meta.userId } : {}),
    email: email ?? 'unknown@unknown',
    items: products.map((p) => ({
      productId: p._id,
      brand: p.brand,
      title: pickLocalized(p.title as never, defaultLocale),
      image: p.images[0] ?? '',
      price: p.price,
    })),
    subtotal: meta.subtotal,
    ...(meta.promoCode ? { promoCode: meta.promoCode } : {}),
    discount: meta.discount,
    total: session.amount_total ?? meta.subtotal - meta.discount,
    status: 'paid',
    stripeSessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id,
    shippingAddress: session.collected_information?.shipping_details ?? null,
    timeline: [{ status: 'paid', at: now }],
  });

  const redis = getRedis();
  if (meta.promoCode) {
    await PromoCode.findOneAndUpdate(
      { code: meta.promoCode, status: 'active' },
      { $set: { status: 'used', usedAt: now, orderId: order._id, ...(meta.userId ? { usedBy: meta.userId } : {}) } },
    );
    await releasePromoHold(redis, meta.promoCode);
  }
  await releaseReservations(redis, meta.productIds, meta.ownerId);
  await invalidateLiveDropCache();

  if (email) {
    try {
      await sendOrderConfirmedEmail(email, {
        orderNumber: orderNumber(order),
        items: order.items.map((i) => ({
          brand: i.brand,
          title: i.title,
          image: i.image,
          price: i.price,
        })),
        subtotal: order.subtotal,
        discount: order.discount,
        promoCode: order.promoCode ?? undefined,
        total: order.total,
      });
    } catch (err) {
      console.error('order confirmation email failed', err);
    }
  }
}

/** checkout.session.expired — free the pieces and the promo code. */
export async function expireCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const meta = parseMeta(session);
  if (!meta) return;
  const redis = getRedis();
  await releaseReservations(redis, meta.productIds, meta.ownerId);
  if (meta.promoCode) await releasePromoHold(redis, meta.promoCode);
}

/** charge.refunded — reflect a refund issued in the Stripe dashboard. */
export async function markOrderRefunded(paymentIntentId: string): Promise<void> {
  await connectDb();
  const order = await Order.findOneAndUpdate(
    { paymentIntentId, status: { $nin: ['refunded'] } },
    { $set: { status: 'refunded' }, $push: { timeline: { status: 'refunded', at: new Date() } } },
    { new: true },
  );
  if (!order) return;
  try {
    await sendOrderRefundedEmail(order.email, orderNumber(order));
  } catch (err) {
    console.error('refund email failed', err);
  }
}
