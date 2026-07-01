import { connectDb } from '@/lib/mongodb';
import { getRedis } from '@/lib/redis';
import { Product } from '@/models/Product';
import { Drop } from '@/models/Drop';
import { getReservedIds } from '@/features/checkout/reservation';
import { toProductView, type ProductView } from '@/features/drops/queries';
import { pickLocalized, type Locale } from '@/i18n/locales';

export interface ProductPageView extends ProductView {
  drop: { number: number; slug: string; title: string; status: string; closesAt: string };
}

export async function getProductBySlug(
  slug: string,
  locale: Locale,
): Promise<ProductPageView | null> {
  await connectDb();
  const product = await Product.findOne({ slug });
  if (!product) return null;
  const drop = await Drop.findById(product.dropId);
  if (!drop || drop.status === 'draft') return null;

  const reserved = await getReservedIds(getRedis(), [String(product._id)]);
  return {
    ...toProductView(product, locale, reserved),
    drop: {
      number: drop.number,
      slug: drop.slug,
      title: pickLocalized(drop.title as never, locale),
      status: drop.status,
      closesAt: drop.closesAt.toISOString(),
    },
  };
}
