'use server';

import { headers } from 'next/headers';
import { connectDb } from '@/lib/mongodb';
import { PromoCode } from '@/models/PromoCode';
import { rateLimit } from '@/lib/ratelimit';
import { currentUser } from '@/features/auth/auth';
import { validatePromo, computeDiscount, type PromoError } from './validate';

export type PromoPreview =
  | { ok: true; code: string; discount: number }
  | { ok: false; error: PromoError | 'tooMany' };

/**
 * Validates a code for the checkout UI and returns the discount for the
 * given subtotal. The anti-double-spend hold happens later, when the Stripe
 * session is created.
 */
export async function previewPromo(code: string, subtotal: number): Promise<PromoPreview> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (!(await rateLimit('promo', ip, 10, 60))) return { ok: false, error: 'tooMany' };

  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: 'invalid' };

  await connectDb();
  const promo = await PromoCode.findOne({ code: normalized });
  const user = await currentUser();
  const result = validatePromo(
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
  if (!result.ok) return result;
  return {
    ok: true,
    code: normalized,
    discount: computeDiscount(subtotal, {
      code: promo!.code,
      status: promo!.status,
      expiresAt: promo!.expiresAt,
      discountType: promo!.discountType,
      discountValue: promo!.discountValue,
    }),
  };
}
