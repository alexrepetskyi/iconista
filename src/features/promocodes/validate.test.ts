import { describe, it, expect } from 'vitest';
import { validatePromo, computeDiscount, type PromoLike } from './validate';

const NOW = new Date('2026-07-01T12:00:00Z');
const FUTURE = new Date('2026-08-01T12:00:00Z');
const PAST = new Date('2026-06-01T12:00:00Z');

function promo(overrides: Partial<PromoLike> = {}): PromoLike {
  return {
    code: 'SUMMER',
    status: 'active',
    expiresAt: FUTURE,
    userId: null,
    discountType: 'percent',
    discountValue: 10,
    ...overrides,
  };
}

describe('validatePromo', () => {
  it('accepts an active, unexpired, unrestricted code', () => {
    expect(validatePromo(promo(), { userId: null, now: NOW })).toEqual({ ok: true });
  });

  it('rejects a missing code as invalid', () => {
    expect(validatePromo(null, { userId: null, now: NOW })).toEqual({
      ok: false,
      error: 'invalid',
    });
  });

  it('rejects an expired code', () => {
    expect(validatePromo(promo({ expiresAt: PAST }), { userId: null, now: NOW })).toEqual({
      ok: false,
      error: 'expired',
    });
  });

  it('rejects an already used code', () => {
    expect(validatePromo(promo({ status: 'used' }), { userId: null, now: NOW })).toEqual({
      ok: false,
      error: 'used',
    });
  });

  it('rejects a disabled code as invalid', () => {
    expect(validatePromo(promo({ status: 'disabled' }), { userId: null, now: NOW })).toEqual({
      ok: false,
      error: 'invalid',
    });
  });

  it('requires sign-in for an account-bound code when anonymous', () => {
    expect(validatePromo(promo({ userId: 'u1' }), { userId: null, now: NOW })).toEqual({
      ok: false,
      error: 'need_sign_in',
    });
  });

  it('rejects an account-bound code for a different account', () => {
    expect(validatePromo(promo({ userId: 'u1' }), { userId: 'u2', now: NOW })).toEqual({
      ok: false,
      error: 'wrong_account',
    });
  });

  it('accepts an account-bound code for the right account', () => {
    expect(validatePromo(promo({ userId: 'u1' }), { userId: 'u1', now: NOW })).toEqual({
      ok: true,
    });
  });
});

describe('computeDiscount (amounts in EUR cents)', () => {
  it('computes a percent discount, rounding to whole cents', () => {
    // 10% of €12.99 = €1.299 → 130 cents (round half up)
    expect(
      computeDiscount(1299, promo({ discountType: 'percent', discountValue: 10 })),
    ).toBe(130);
  });

  it('caps percent at 100%', () => {
    expect(
      computeDiscount(5000, promo({ discountType: 'percent', discountValue: 150 })),
    ).toBe(5000);
  });

  it('applies a fixed discount', () => {
    expect(
      computeDiscount(5000, promo({ discountType: 'fixed', discountValue: 1000 })),
    ).toBe(1000);
  });

  it('never discounts more than the subtotal', () => {
    expect(
      computeDiscount(500, promo({ discountType: 'fixed', discountValue: 1000 })),
    ).toBe(500);
  });

  it('never returns a negative discount', () => {
    expect(computeDiscount(0, promo({ discountType: 'fixed', discountValue: 1000 }))).toBe(0);
  });
});
