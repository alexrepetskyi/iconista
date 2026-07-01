'use server';

import { revalidatePath } from 'next/cache';
import { connectDb } from '@/lib/mongodb';
import { Cart } from '@/models/Cart';
import { Product } from '@/models/Product';
import { currentUser } from '@/features/auth/auth';
import { getOrCreateCartSessionId } from './session';
import { ownerFilter, type CartOwner } from './queries';

export type CartActionResult = { ok: true } | { ok: false; error: string };

async function ensureOwner(): Promise<CartOwner> {
  const user = await currentUser();
  if (user) return { userId: user.id, sessionId: null, reservationOwner: `u:${user.id}` };
  const sessionId = await getOrCreateCartSessionId();
  return { userId: null, sessionId, reservationOwner: `s:${sessionId}` };
}

export async function addToCart(productId: string): Promise<CartActionResult> {
  await connectDb();
  const product = await Product.findById(productId).catch(() => null);
  if (!product || product.status !== 'available') {
    return { ok: false, error: 'unavailable' };
  }
  const owner = await ensureOwner();
  await Cart.findOneAndUpdate(
    ownerFilter(owner),
    { $addToSet: { productIds: product._id }, $setOnInsert: ownerFilter(owner) },
    { upsert: true },
  );
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function removeFromCart(productId: string): Promise<CartActionResult> {
  const owner = await ensureOwner();
  await connectDb();
  await Cart.findOneAndUpdate(ownerFilter(owner), { $pull: { productIds: productId } });
  revalidatePath('/', 'layout');
  return { ok: true };
}
