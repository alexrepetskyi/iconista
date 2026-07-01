import { connectDb } from '@/lib/mongodb';
import { getRedis } from '@/lib/redis';
import { Drop, type DropDoc } from '@/models/Drop';
import { Product, type ProductDoc } from '@/models/Product';
import { getReservedIds } from '@/features/checkout/reservation';
import { pickLocalized, type Locale } from '@/i18n/locales';

export interface ProductView {
  id: string;
  slug: string;
  brand: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  /** available | on_hold (someone is paying) | sold */
  state: 'available' | 'on_hold' | 'sold';
}

export interface DropView {
  id: string;
  number: number;
  slug: string;
  title: string;
  description: string;
  status: 'draft' | 'live' | 'closed';
  releaseAt: string;
  closesAt: string;
  heroVideoUrl: string;
  products: ProductView[];
  availableCount: number;
  totalCount: number;
}

const CACHE_KEY = 'cache:live-drop';
const CACHE_TTL_SECONDS = 30;

export function toProductView(
  doc: ProductDoc,
  locale: Locale,
  reserved: Set<string>,
): ProductView {
  const id = String(doc._id);
  return {
    id,
    slug: doc.slug,
    brand: doc.brand,
    title: pickLocalized(doc.title as never, locale),
    description: pickLocalized(doc.description as never, locale),
    price: doc.price,
    compareAtPrice: doc.compareAtPrice ?? null,
    images: doc.images,
    state: doc.status === 'sold' ? 'sold' : reserved.has(id) ? 'on_hold' : 'available',
  };
}

async function toDropView(drop: DropDoc, locale: Locale): Promise<DropView> {
  await connectDb();
  const products = await Product.find({ dropId: drop._id }).sort({ createdAt: 1 });
  const reserved = await getReservedIds(
    getRedis(),
    products.map((p) => String(p._id)),
  );
  const views = products.map((p) => toProductView(p, locale, reserved));
  return {
    id: String(drop._id),
    number: drop.number,
    slug: drop.slug,
    title: pickLocalized(drop.title as never, locale),
    description: pickLocalized(drop.description as never, locale),
    status: drop.status,
    releaseAt: drop.releaseAt.toISOString(),
    closesAt: drop.closesAt.toISOString(),
    heroVideoUrl: drop.heroVideoUrl,
    products: views,
    availableCount: views.filter((p) => p.state !== 'sold').length,
    totalCount: views.length,
  };
}

/** The drop currently shown on the home page, lightly cached in Redis. */
export async function getLiveDrop(locale: Locale): Promise<DropView | null> {
  const redis = getRedis();
  const cacheKey = `${CACHE_KEY}:${locale}`;
  try {
    const hit = await redis.get(cacheKey);
    if (hit) return JSON.parse(hit) as DropView;
  } catch (err) {
    console.error('live-drop cache read failed', err);
  }

  await connectDb();
  const drop = await Drop.findOne({ status: 'live' }).sort({ number: -1 });
  if (!drop) return null;
  const view = await toDropView(drop, locale);

  try {
    await redis.set(cacheKey, JSON.stringify(view), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    console.error('live-drop cache write failed', err);
  }
  return view;
}

export async function invalidateLiveDropCache(): Promise<void> {
  try {
    const redis = getRedis();
    const keys = await redis.keys(`${CACHE_KEY}:*`);
    if (keys.length) await redis.del(...keys);
  } catch (err) {
    console.error('live-drop cache invalidation failed', err);
  }
}

export async function getDropBySlug(slug: string, locale: Locale): Promise<DropView | null> {
  await connectDb();
  const drop = await Drop.findOne({ slug, status: { $ne: 'draft' } });
  if (!drop) return null;
  return toDropView(drop, locale);
}

export interface ArchiveDropView {
  number: number;
  slug: string;
  title: string;
  closesAt: string;
  pieceCount: number;
}

export async function getArchiveDrops(locale: Locale): Promise<ArchiveDropView[]> {
  await connectDb();
  const drops = await Drop.find({ status: 'closed' }).sort({ number: -1 });
  const counts = await Product.aggregate<{ _id: unknown; count: number }>([
    { $match: { dropId: { $in: drops.map((d) => d._id) } } },
    { $group: { _id: '$dropId', count: { $sum: 1 } } },
  ]);
  const countByDrop = new Map(counts.map((c) => [String(c._id), c.count]));
  return drops.map((d) => ({
    number: d.number,
    slug: d.slug,
    title: pickLocalized(d.title as never, locale),
    closesAt: d.closesAt.toISOString(),
    pieceCount: countByDrop.get(String(d._id)) ?? 0,
  }));
}
