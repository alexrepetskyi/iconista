import { cookies } from 'next/headers';
import crypto from 'node:crypto';

export const CART_SESSION_COOKIE = 'iconista_cart';

/** Read-only variant for Server Components. */
export async function getCartSessionId(): Promise<string | null> {
  return (await cookies()).get(CART_SESSION_COOKIE)?.value ?? null;
}

/** For Server Actions: creates the anonymous cart cookie when missing. */
export async function getOrCreateCartSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_SESSION_COOKIE)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  store.set(CART_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 90,
    path: '/',
  });
  return id;
}
