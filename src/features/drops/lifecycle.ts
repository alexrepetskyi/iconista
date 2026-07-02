import { connectDb } from '@/lib/mongodb';
import { Drop } from '@/models/Drop';
import { Product } from '@/models/Product';

/** A drop is a small curated release — hard cap on pieces. */
export const MAX_PIECES_PER_DROP = 10;

export type LifecycleResult = { ok: true } | { ok: false; error: string };

/**
 * Going live is exclusive: the previously live drop (and its pieces with it)
 * moves to the archive. A drop published without a hero video inherits the
 * latest video from past drops.
 */
export async function publishDropLive(dropId: string): Promise<LifecycleResult> {
  await connectDb();
  const drop = await Drop.findById(dropId).catch(() => null);
  if (!drop) return { ok: false, error: 'not_found' };

  if (!drop.heroVideoUrl) {
    const latestWithVideo = await Drop.findOne({
      _id: { $ne: drop._id },
      heroVideoUrl: { $nin: ['', null] },
    }).sort({ number: -1 });
    if (latestWithVideo) drop.heroVideoUrl = latestWithVideo.heroVideoUrl;
  }

  await Drop.updateMany(
    { status: 'live', _id: { $ne: drop._id } },
    { $set: { status: 'closed' } },
  );

  drop.status = 'live';
  await drop.save();
  return { ok: true };
}

/** How many more pieces the drop can take. */
export async function remainingCapacity(dropId: string): Promise<number> {
  await connectDb();
  const count = await Product.countDocuments({ dropId });
  return Math.max(0, MAX_PIECES_PER_DROP - count);
}

/**
 * Unsold pieces of an archived drop can move into the next one.
 * Sold pieces are history and never move; a closed drop takes nothing.
 */
export async function moveProductToDrop(
  productId: string,
  targetDropId: string,
): Promise<LifecycleResult> {
  await connectDb();
  const [product, target] = await Promise.all([
    Product.findById(productId).catch(() => null),
    Drop.findById(targetDropId).catch(() => null),
  ]);
  if (!product || !target) return { ok: false, error: 'not_found' };
  if (product.status === 'sold') return { ok: false, error: 'sold' };
  if (target.status === 'closed') return { ok: false, error: 'target_closed' };
  if (String(product.dropId) === String(target._id)) return { ok: true };
  if ((await remainingCapacity(targetDropId)) < 1) return { ok: false, error: 'target_full' };

  product.dropId = target._id as never;
  await product.save();
  return { ok: true };
}
