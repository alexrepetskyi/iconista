'use server';

import crypto from 'node:crypto';
import { connectDb } from '@/lib/mongodb';
import { getRedis } from '@/lib/redis';
import { getStripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { Product } from '@/models/Product';
import { PromoCode } from '@/models/PromoCode';
import { Drop } from '@/models/Drop';
import { currentUser } from '@/features/auth/auth';
import { getOrCreateCartSessionId } from '@/features/cart/session';
import { pickLocalized, defaultLocale, type Locale } from '@/i18n/locales';
import { validatePromo, computeDiscount } from '@/features/promocodes/validate';
import { holdPromo } from '@/features/promocodes/hold';
import { reserveProducts, RESERVATION_TTL_SECONDS } from './reservation';

const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
] as const;

export type StartCheckoutResult =
  | { ok: true; clientSecret: string }
  /** PAYMENT_MODE=mock — the order is already fulfilled, go to the result page. */
  | { ok: true; mock: true; sessionId: string }
  | { ok: false; error: 'empty' | 'all_taken' | 'promo_error'; promoError?: string }
  | { ok: false; error: 'items_taken'; takenTitles: string[]; remainingIds: string[] };

/**
 * Reserves the pieces and creates a Stripe Embedded Checkout session.
 * The order itself is created by the webhook on successful payment —
 * an abandoned session leaves nothing behind except auto-expiring keys.
 */
export async function startCheckout(
  productIds: string[],
  promoCode: string | null,
  locale: Locale,
): Promise<StartCheckoutResult> {
  if (productIds.length === 0) return { ok: false, error: 'empty' };

  const user = await currentUser();
  const ownerId = user ? `u:${user.id}` : `s:${await getOrCreateCartSessionId()}`;

  await connectDb();
  const products = await Product.find({ _id: { $in: productIds }, status: 'available' });
  if (products.length === 0) return { ok: false, error: 'all_taken' };

  // A drop that has closed no longer sells; an existing reservation is honored
  // below via reserveProducts re-entrancy.
  const drops = await Drop.find({ _id: { $in: products.map((p) => p.dropId) } });
  const sellable = new Set(
    drops.filter((d) => d.status === 'live').map((d) => String(d._id)),
  );

  const redis = getRedis();
  const candidates = products.filter((p) => sellable.has(String(p.dropId)));
  if (candidates.length === 0) return { ok: false, error: 'all_taken' };

  const { reserved, failed } = await reserveProducts(
    redis,
    candidates.map((p) => String(p._id)),
    ownerId,
  );
  const goneIds = new Set([
    ...failed,
    ...productIds.filter((id) => !candidates.some((p) => String(p._id) === id)),
  ]);

  if (reserved.length === 0) return { ok: false, error: 'all_taken' };
  if (goneIds.size > 0) {
    const takenTitles = products
      .filter((p) => goneIds.has(String(p._id)))
      .map((p) => `${p.brand} ${pickLocalized(p.title as never, locale)}`);
    return { ok: false, error: 'items_taken', takenTitles, remainingIds: reserved };
  }

  const lineProducts = candidates;
  const subtotal = lineProducts.reduce((sum, p) => sum + p.price, 0);

  // Promo: validate, hold against concurrent checkouts, compute discount.
  let discount = 0;
  let appliedCode: string | null = null;
  if (promoCode) {
    const normalized = promoCode.trim().toUpperCase();
    const promo = await PromoCode.findOne({ code: normalized });
    const check = validatePromo(
      promo && {
        code: promo.code,
        status: promo.status,
        expiresAt: promo.expiresAt,
        userId: promo.userId ? String(promo.userId) : null,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      },
      { userId: user?.id ?? null },
    );
    if (!check.ok) return { ok: false, error: 'promo_error', promoError: check.error };
    if (!(await holdPromo(redis, normalized, ownerId))) {
      return { ok: false, error: 'promo_error', promoError: 'in_use' };
    }
    discount = computeDiscount(subtotal, {
      code: promo!.code,
      status: promo!.status,
      expiresAt: promo!.expiresAt,
      discountType: promo!.discountType,
      discountValue: promo!.discountValue,
    });
    appliedCode = normalized;
  }

  const base = env().NEXT_PUBLIC_BASE_URL;

  const metadata = {
    ownerId,
    userId: user?.id ?? '',
    productIds: lineProducts.map((p) => String(p._id)).join(','),
    promoCode: appliedCode ?? '',
    subtotal: String(subtotal),
    discount: String(discount),
    locale,
  };

  // Local dev without Stripe: run the SAME fulfillment path the webhook
  // uses, against a synthetic session. Guarded by env, never for prod.
  if (env().PAYMENT_MODE === 'mock') {
    const { fulfillCheckoutSession } = await import('@/features/orders/fulfill');
    const { Cart } = await import('@/models/Cart');
    const sessionId = `mock_${crypto.randomUUID()}`;
    await fulfillCheckoutSession({
      id: sessionId,
      metadata,
      customer_details: { email: user?.email ?? 'guest@local.test' },
      customer_email: user?.email ?? 'guest@local.test',
      amount_total: subtotal - discount,
      payment_intent: `pi_${sessionId}`,
      collected_information: null,
    } as never);
    const filter = ownerId.startsWith('u:')
      ? { userId: ownerId.slice(2) }
      : { sessionId: ownerId.slice(2) };
    await Cart.findOneAndUpdate(filter, {
      $pull: { productIds: { $in: lineProducts.map((p) => p._id) } },
    });
    return { ok: true, mock: true, sessionId };
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    mode: 'payment',
    expires_at: Math.floor(Date.now() / 1000) + RESERVATION_TTL_SECONDS,
    line_items: lineProducts.map((p) => ({
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: p.price,
        product_data: {
          name: `${p.brand} — ${pickLocalized(p.title as never, defaultLocale)}`,
          ...(p.images[0] ? { images: [`${base}${p.images[0]}`] } : {}),
        },
      },
    })),
    ...(discount > 0
      ? {
          discounts: [
            {
              coupon: (
                await stripe.coupons.create({
                  amount_off: discount,
                  currency: 'eur',
                  duration: 'once',
                  name: `Promo ${appliedCode}`,
                })
              ).id,
            },
          ],
        }
      : {}),
    shipping_address_collection: { allowed_countries: [...EU_COUNTRIES] },
    ...(user?.email ? { customer_email: user.email } : {}),
    return_url: `${base}/${locale}/checkout/result?session_id={CHECKOUT_SESSION_ID}`,
    metadata,
  });

  return { ok: true, clientSecret: session.client_secret! };
}
