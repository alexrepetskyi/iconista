import { getRedis } from './redis';

/**
 * Fixed-window rate limit. Returns true when the call is allowed.
 * Fails open: if Redis hiccups, users are not locked out.
 */
export async function rateLimit(
  bucket: string,
  id: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const redis = getRedis();
    const key = `rl:${bucket}:${id}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= limit;
  } catch (err) {
    console.error('rateLimit failed', err);
    return true;
  }
}
