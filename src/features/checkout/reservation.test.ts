import { describe, it, expect, beforeEach } from 'vitest';
import RedisMock from 'ioredis-mock';
import type Redis from 'ioredis';
import {
  reserveProducts,
  releaseReservations,
  getReservedIds,
  RESERVATION_TTL_SECONDS,
} from './reservation';

let redis: Redis;

beforeEach(async () => {
  redis = new RedisMock() as unknown as Redis;
  await redis.flushall(); // ioredis-mock instances share one store
});

describe('reserveProducts', () => {
  it('reserves all requested products for the owner', async () => {
    const result = await reserveProducts(redis, ['p1', 'p2'], 'alice');
    expect(result.reserved).toEqual(['p1', 'p2']);
    expect(result.failed).toEqual([]);
  });

  it('sets a TTL on the reservation', async () => {
    await reserveProducts(redis, ['p1'], 'alice');
    const ttl = await redis.ttl('reserve:product:p1');
    expect(ttl).toBeGreaterThan(RESERVATION_TTL_SECONDS - 10);
    expect(ttl).toBeLessThanOrEqual(RESERVATION_TTL_SECONDS);
  });

  it('refuses products already reserved by someone else (partial failure)', async () => {
    await reserveProducts(redis, ['p1'], 'bob');
    const result = await reserveProducts(redis, ['p1', 'p2'], 'alice');
    expect(result.reserved).toEqual(['p2']);
    expect(result.failed).toEqual(['p1']);
  });

  it('is re-entrant for the same owner', async () => {
    await reserveProducts(redis, ['p1'], 'alice');
    const again = await reserveProducts(redis, ['p1'], 'alice');
    expect(again.reserved).toEqual(['p1']);
    expect(again.failed).toEqual([]);
  });

  it('only one of two concurrent owners wins a product', async () => {
    const [a, b] = await Promise.all([
      reserveProducts(redis, ['p1'], 'alice'),
      reserveProducts(redis, ['p1'], 'bob'),
    ]);
    const winners = [a.reserved.length, b.reserved.length].sort();
    expect(winners).toEqual([0, 1]);
  });
});

describe('releaseReservations', () => {
  it('releases the owner’s reservations', async () => {
    await reserveProducts(redis, ['p1', 'p2'], 'alice');
    await releaseReservations(redis, ['p1', 'p2'], 'alice');
    const reserved = await getReservedIds(redis, ['p1', 'p2']);
    expect(reserved.size).toBe(0);
  });

  it('does not release someone else’s reservation', async () => {
    await reserveProducts(redis, ['p1'], 'bob');
    await releaseReservations(redis, ['p1'], 'alice');
    const reserved = await getReservedIds(redis, ['p1']);
    expect(reserved.has('p1')).toBe(true);
  });
});

describe('getReservedIds', () => {
  it('reports which of the given products are currently reserved', async () => {
    await reserveProducts(redis, ['p1'], 'bob');
    const reserved = await getReservedIds(redis, ['p1', 'p2', 'p3']);
    expect(reserved).toEqual(new Set(['p1']));
  });

  it('returns an empty set for an empty list without touching redis', async () => {
    const reserved = await getReservedIds(redis, []);
    expect(reserved.size).toBe(0);
  });
});
