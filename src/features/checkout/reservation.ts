import type Redis from 'ioredis';

/** Matches the Stripe Checkout Session lifetime (30 min). */
export const RESERVATION_TTL_SECONDS = 30 * 60;

const key = (productId: string) => `reserve:product:${productId}`;

export interface ReservationResult {
  reserved: string[];
  failed: string[];
}

/**
 * Atomically reserves 1/1 products for `ownerId`. Re-entrant: products the
 * owner already holds count as reserved (and their TTL is refreshed).
 * Products held by someone else land in `failed`.
 */
export async function reserveProducts(
  redis: Redis,
  productIds: string[],
  ownerId: string,
): Promise<ReservationResult> {
  const reserved: string[] = [];
  const failed: string[] = [];
  for (const id of productIds) {
    const set = await redis.set(key(id), ownerId, 'EX', RESERVATION_TTL_SECONDS, 'NX');
    if (set === 'OK') {
      reserved.push(id);
      continue;
    }
    const holder = await redis.get(key(id));
    if (holder === ownerId) {
      await redis.expire(key(id), RESERVATION_TTL_SECONDS);
      reserved.push(id);
    } else {
      failed.push(id);
    }
  }
  return { reserved, failed };
}

/** Releases only reservations held by `ownerId`; other holders are untouched. */
export async function releaseReservations(
  redis: Redis,
  productIds: string[],
  ownerId: string,
): Promise<void> {
  for (const id of productIds) {
    const holder = await redis.get(key(id));
    if (holder === ownerId) {
      await redis.del(key(id));
    }
  }
}

/** Which of the given products are currently reserved (by anyone). */
export async function getReservedIds(
  redis: Redis,
  productIds: string[],
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();
  const values = await redis.mget(productIds.map(key));
  const reserved = new Set<string>();
  values.forEach((value, i) => {
    if (value !== null) reserved.add(productIds[i]);
  });
  return reserved;
}
