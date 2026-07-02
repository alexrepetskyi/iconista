'use server';

import { revalidatePath } from 'next/cache';
import crypto from 'node:crypto';
import { connectDb } from '@/lib/mongodb';
import { saveUpload } from '@/lib/uploads';
import { requireAdmin } from '@/features/auth/auth';
import { Drop } from '@/models/Drop';
import { Product } from '@/models/Product';
import { Order } from '@/models/Order';
import { PromoCode } from '@/models/PromoCode';
import { User } from '@/models/User';
import { Subscriber } from '@/models/Subscriber';
import { invalidateLiveDropCache } from '@/features/drops/queries';
import {
  publishDropLive,
  moveProductToDrop,
  remainingCapacity,
  MAX_PIECES_PER_DROP,
} from '@/features/drops/lifecycle';
import { sanitizeDescription } from '@/features/products/sanitize';
import { translateContent } from '@/features/translations/translate';
import { runBackfill } from '@/features/translations/backfill';
import {
  sendDropLiveEmail,
  sendOrderShippedEmail,
} from '@/features/emails/send';
import { orderNumber } from '@/features/orders/fulfill';
import { defaultLocale } from '@/i18n/locales';

export type AdminResult = { ok: true; id?: string } | { ok: false; error: string } | null;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* ---------------- drops ---------------- */

export async function createDrop(
  _prev: AdminResult,
  formData: FormData,
): Promise<AdminResult> {
  await requireAdmin();
  await connectDb();

  const number = Number(formData.get('number'));
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const releaseAt = new Date(String(formData.get('releaseAt')));
  const closesAt = new Date(String(formData.get('closesAt')));
  if (!Number.isInteger(number) || !title || isNaN(releaseAt.getTime()) || isNaN(closesAt.getTime())) {
    return { ok: false, error: 'Fill number, title, release and close dates.' };
  }
  if (await Drop.exists({ number })) return { ok: false, error: `Drop ${number} already exists.` };

  // LLM translation of content into every configured locale; failures are
  // recorded as pending and never block the save.
  const { maps, failedLocales } = await translateContent({ title, description });

  const drop = await Drop.create({
    number,
    slug: `drop-${String(number).padStart(3, '0')}`,
    title: maps.title,
    description: maps.description,
    releaseAt,
    closesAt,
    heroVideoUrl: String(formData.get('heroVideoUrl') ?? '').trim(),
    pendingLocales: failedLocales,
    status: 'draft',
  });
  revalidatePath('/[locale]/admin', 'layout');
  return { ok: true, id: String(drop._id) };
}

export async function setDropStatus(dropId: string, status: 'draft' | 'live' | 'closed'): Promise<AdminResult> {
  await requireAdmin();
  await connectDb();

  let drop;
  if (status === 'live') {
    // Exclusive: archives the previous live drop, inherits the latest hero
    // video when this drop has none.
    const published = await publishDropLive(dropId);
    if (!published.ok) return { ok: false, error: 'Drop not found' };
    drop = await Drop.findById(dropId);
  } else {
    drop = await Drop.findByIdAndUpdate(dropId, { $set: { status } }, { new: true });
  }
  if (!drop) return { ok: false, error: 'Drop not found' };
  await invalidateLiveDropCache();
  revalidatePath('/', 'layout');

  if (status === 'live') {
    // Broadcast to confirmed subscribers; fire-and-forget per recipient.
    const subscribers = await Subscriber.find({ status: 'confirmed' });
    const title = (drop.title as never as Map<string, string>).get(defaultLocale) ?? '';
    void Promise.allSettled(
      subscribers.map((sub) =>
        sendDropLiveEmail(sub.email, drop.number, title, drop.slug, sub.unsubscribeToken ?? ''),
      ),
    ).then((results) => {
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed) console.error(`drop-live broadcast: ${failed} sends failed`);
    });
  }
  return { ok: true };
}

/* ---------------- products ---------------- */

export async function createProduct(
  _prev: AdminResult,
  formData: FormData,
): Promise<AdminResult> {
  await requireAdmin();
  await connectDb();

  const dropId = String(formData.get('dropId'));
  const brand = String(formData.get('brand') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  // WYSIWYG HTML — sanitized to a strict allowlist before it touches the DB.
  const description = sanitizeDescription(String(formData.get('description') ?? ''));
  const price = Math.round(Number(formData.get('price')) * 100);
  const compareAtRaw = Number(formData.get('compareAtPrice'));
  const compareAtPrice = compareAtRaw > 0 ? Math.round(compareAtRaw * 100) : undefined;

  if (!brand || !title || !Number.isFinite(price) || price <= 0) {
    return { ok: false, error: 'Fill brand, title and price.' };
  }
  if (!(await Drop.exists({ _id: dropId }))) return { ok: false, error: 'Drop not found' };
  if ((await remainingCapacity(dropId)) < 1) {
    return { ok: false, error: `A drop holds at most ${MAX_PIECES_PER_DROP} pieces.` };
  }

  const images: string[] = [];
  for (const file of formData.getAll('images')) {
    if (file instanceof File && file.size > 0) {
      try {
        images.push(await saveUpload(file));
      } catch (err) {
        return { ok: false, error: `Image upload failed: ${(err as Error).message}` };
      }
    }
  }

  const { maps, failedLocales } = await translateContent({ title, description });
  const baseSlug = slugify(`${brand}-${title}`);
  const slug = (await Product.exists({ slug: baseSlug }))
    ? `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`
    : baseSlug;

  const product = await Product.create({
    dropId,
    brand,
    title: maps.title,
    description: maps.description,
    slug,
    price,
    compareAtPrice,
    images,
    pendingLocales: failedLocales,
  });
  await invalidateLiveDropCache();
  revalidatePath('/', 'layout');
  return { ok: true, id: String(product._id) };
}

/** Moves an unsold piece from an archived drop into a draft/live one. */
export async function movePieceToDrop(productId: string, targetDropId: string): Promise<AdminResult> {
  await requireAdmin();
  const result = await moveProductToDrop(productId, targetDropId);
  if (!result.ok) {
    const message: Record<string, string> = {
      not_found: 'Piece or drop not found.',
      sold: 'Sold pieces are history — they never move.',
      target_closed: 'Cannot move into a closed drop.',
      target_full: `A drop holds at most ${MAX_PIECES_PER_DROP} pieces.`,
    };
    return { ok: false, error: message[result.error] ?? result.error };
  }
  await invalidateLiveDropCache();
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteProduct(productId: string): Promise<AdminResult> {
  await requireAdmin();
  await connectDb();
  const product = await Product.findById(productId);
  if (!product) return { ok: false, error: 'Not found' };
  if (product.status === 'sold') return { ok: false, error: 'Cannot delete a sold piece.' };
  await product.deleteOne();
  await invalidateLiveDropCache();
  revalidatePath('/', 'layout');
  return { ok: true };
}

/* ---------------- orders ---------------- */

export async function markOrderShipped(
  orderId: string,
  shipping: { trackingNumber: string; carrier: string; trackingUrl: string },
): Promise<AdminResult> {
  await requireAdmin();

  const trackingNumber = shipping.trackingNumber.trim();
  const carrier = shipping.carrier.trim();
  const trackingUrl = shipping.trackingUrl.trim();
  if (!trackingNumber) return { ok: false, error: 'Tracking number is required.' };
  if (trackingUrl && !/^https?:\/\//.test(trackingUrl)) {
    return { ok: false, error: 'Tracking link must start with http(s)://' };
  }

  await connectDb();
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'paid' },
    {
      $set: { status: 'shipped', trackingNumber, carrier, trackingUrl },
      $push: { timeline: { status: 'shipped', at: new Date() } },
    },
    { new: true },
  );
  if (!order) return { ok: false, error: 'Order not found or not in "paid" state.' };
  try {
    await sendOrderShippedEmail(order.email, orderNumber(order), {
      trackingNumber,
      carrier: carrier || undefined,
      trackingUrl: trackingUrl || undefined,
    });
  } catch (err) {
    console.error('shipped email failed', err);
  }
  revalidatePath('/[locale]/admin', 'layout');
  return { ok: true };
}

export async function markOrderDelivered(orderId: string): Promise<AdminResult> {
  await requireAdmin();
  await connectDb();
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'shipped' },
    { $set: { status: 'delivered' }, $push: { timeline: { status: 'delivered', at: new Date() } } },
  );
  if (!order) return { ok: false, error: 'Order not found or not in "shipped" state.' };
  revalidatePath('/[locale]/admin', 'layout');
  return { ok: true };
}

/* ---------------- promo codes ---------------- */

export async function createPromoCode(
  _prev: AdminResult,
  formData: FormData,
): Promise<AdminResult> {
  await requireAdmin();
  await connectDb();

  const rawCode = String(formData.get('code') ?? '').trim().toUpperCase();
  const code = rawCode || `ICON-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const discountType = String(formData.get('discountType')) === 'fixed' ? 'fixed' : 'percent';
  const valueRaw = Number(formData.get('discountValue'));
  const discountValue = discountType === 'fixed' ? Math.round(valueRaw * 100) : Math.round(valueRaw);
  const expiresAt = new Date(String(formData.get('expiresAt')));
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  if (!Number.isFinite(discountValue) || discountValue < 1) return { ok: false, error: 'Invalid discount value.' };
  if (discountType === 'percent' && discountValue > 100) return { ok: false, error: 'Percent must be 1–100.' };
  if (isNaN(expiresAt.getTime())) return { ok: false, error: 'Set an expiry date.' };
  if (await PromoCode.exists({ code })) return { ok: false, error: 'Code already exists.' };

  let userId: string | undefined;
  if (email) {
    const user = await User.findOne({ email });
    if (!user) return { ok: false, error: `No account with email ${email}.` };
    userId = String(user._id);
  }

  await PromoCode.create({ code, discountType, discountValue, expiresAt, userId });
  revalidatePath('/[locale]/admin', 'layout');
  return { ok: true, id: code };
}

export async function disablePromoCode(codeId: string): Promise<AdminResult> {
  await requireAdmin();
  await connectDb();
  await PromoCode.findByIdAndUpdate(codeId, { $set: { status: 'disabled' } });
  revalidatePath('/[locale]/admin', 'layout');
  return { ok: true };
}

/* ---------------- translations ---------------- */

export async function runTranslationBackfill(): Promise<AdminResult> {
  await requireAdmin();
  const report = await runBackfill();
  await invalidateLiveDropCache();
  revalidatePath('/', 'layout');
  return { ok: true, id: `${report.translated} translated` };
}
