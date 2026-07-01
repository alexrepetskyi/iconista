import type { PromoDiscountType, PromoStatus } from '@/models/types';

/** The subset of a promo code document the validation logic needs. */
export interface PromoLike {
  code: string;
  status: PromoStatus;
  expiresAt: Date;
  /** When set, only this account may redeem the code. */
  userId?: string | null;
  discountType: PromoDiscountType;
  discountValue: number;
}

export type PromoError =
  | 'invalid'
  | 'expired'
  | 'used'
  | 'wrong_account'
  | 'need_sign_in'
  | 'in_use';

export type PromoValidation = { ok: true } | { ok: false; error: PromoError };

export function validatePromo(
  promo: PromoLike | null | undefined,
  opts: { userId?: string | null; now?: Date },
): PromoValidation {
  if (!promo || promo.status === 'disabled') return { ok: false, error: 'invalid' };
  if (promo.status === 'used') return { ok: false, error: 'used' };
  const now = opts.now ?? new Date();
  if (promo.expiresAt.getTime() <= now.getTime()) return { ok: false, error: 'expired' };
  if (promo.userId) {
    if (!opts.userId) return { ok: false, error: 'need_sign_in' };
    if (String(opts.userId) !== String(promo.userId)) {
      return { ok: false, error: 'wrong_account' };
    }
  }
  return { ok: true };
}

/** Discount in EUR cents for the given subtotal; never negative, never above subtotal. */
export function computeDiscount(subtotalCents: number, promo: PromoLike): number {
  const raw =
    promo.discountType === 'percent'
      ? Math.round((subtotalCents * promo.discountValue) / 100)
      : promo.discountValue;
  return Math.max(0, Math.min(raw, subtotalCents));
}
