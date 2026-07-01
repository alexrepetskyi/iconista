import type Redis from 'ioredis';
import { RESERVATION_TTL_SECONDS } from '@/features/checkout/reservation';

const key = (code: string) => `promo:hold:${code.toUpperCase()}`;

/**
 * A single-use code must not ride two concurrent checkouts: the first
 * checkout takes a hold for the session lifetime; the webhook releases it.
 * Re-entrant for the same owner (retrying a checkout).
 */
export async function holdPromo(
  redis: Redis,
  code: string,
  ownerId: string,
): Promise<boolean> {
  const set = await redis.set(key(code), ownerId, 'EX', RESERVATION_TTL_SECONDS, 'NX');
  if (set === 'OK') return true;
  const holder = await redis.get(key(code));
  if (holder === ownerId) {
    await redis.expire(key(code), RESERVATION_TTL_SECONDS);
    return true;
  }
  return false;
}

export async function releasePromoHold(redis: Redis, code: string): Promise<void> {
  await redis.del(key(code));
}
