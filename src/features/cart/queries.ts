import { connectDb } from '@/lib/mongodb';
import { getRedis } from '@/lib/redis';
import { Cart } from '@/models/Cart';
import { Product } from '@/models/Product';
import { getReservedIds } from '@/features/checkout/reservation';
import { toProductView, type ProductView } from '@/features/drops/queries';
import type { Locale } from '@/i18n/locales';
import { currentUser } from '@/features/auth/auth';
import { getCartSessionId } from './session';

export interface CartOwner {
  userId: string | null;
  sessionId: string | null;
  /** Stable id used for redis reservation ownership. */
  reservationOwner: string;
}

export async function getCartOwner(): Promise<CartOwner | null> {
  const user = await currentUser();
  if (user) return { userId: user.id, sessionId: null, reservationOwner: `u:${user.id}` };
  const sessionId = await getCartSessionId();
  if (sessionId) return { userId: null, sessionId, reservationOwner: `s:${sessionId}` };
  return null;
}

export function ownerFilter(owner: CartOwner): Record<string, string> {
  return owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId! };
}

export interface CartView {
  items: ProductView[];
  subtotal: number;
}

export async function getCart(locale: Locale): Promise<CartView> {
  const owner = await getCartOwner();
  if (!owner) return { items: [], subtotal: 0 };

  await connectDb();
  const cart = await Cart.findOne(ownerFilter(owner));
  if (!cart || cart.productIds.length === 0) return { items: [], subtotal: 0 };

  const products = await Product.find({ _id: { $in: cart.productIds } });
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const reserved = await getReservedIds(
    getRedis(),
    products.map((p) => String(p._id)),
  );

  const items: ProductView[] = [];
  for (const id of cart.productIds.map(String)) {
    const product = byId.get(id);
    if (product) items.push(toProductView(product, locale, reserved));
  }
  const subtotal = items
    .filter((i) => i.state !== 'sold')
    .reduce((sum, i) => sum + i.price, 0);
  return { items, subtotal };
}

export async function getCartCount(): Promise<number> {
  const owner = await getCartOwner();
  if (!owner) return 0;
  await connectDb();
  const cart = await Cart.findOne(ownerFilter(owner));
  return cart?.productIds.length ?? 0;
}
