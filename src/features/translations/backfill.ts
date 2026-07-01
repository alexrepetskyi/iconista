import { connectDb } from '@/lib/mongodb';
import { Drop } from '@/models/Drop';
import { Product } from '@/models/Product';
import { defaultLocale, localeCodes } from '@/i18n/locales';
import { translateContent } from './translate';

function missingLocales(map: Map<string, string> | undefined): string[] {
  const has = new Set(map?.keys() ?? []);
  return localeCodes.filter((l) => l !== defaultLocale && !has.has(l));
}

export interface BackfillReport {
  dropsMissing: number;
  productsMissing: number;
  translated: number;
}

/** How much content still lacks translations (drives the admin counter). */
export async function countMissingTranslations(): Promise<
  Pick<BackfillReport, 'dropsMissing' | 'productsMissing'>
> {
  await connectDb();
  const [drops, products] = await Promise.all([Drop.find(), Product.find()]);
  return {
    dropsMissing: drops.filter((d) => missingLocales(d.title as never).length > 0).length,
    productsMissing: products.filter((p) => missingLocales(p.title as never).length > 0)
      .length,
  };
}

/**
 * Translates every drop/product missing a configured locale. Used by the
 * admin "fill missing translations" button after a new language is added.
 */
export async function runBackfill(): Promise<BackfillReport> {
  await connectDb();
  const report: BackfillReport = { dropsMissing: 0, productsMissing: 0, translated: 0 };

  const drops = await Drop.find();
  for (const drop of drops) {
    if (missingLocales(drop.title as never).length === 0) continue;
    report.dropsMissing += 1;
    const { maps, failedLocales } = await translateContent({
      title: (drop.title as never as Map<string, string>).get(defaultLocale) ?? '',
      description:
        (drop.description as never as Map<string, string>).get(defaultLocale) ?? '',
    });
    for (const [locale, text] of Object.entries(maps.title)) {
      (drop.title as never as Map<string, string>).set(locale, text);
    }
    for (const [locale, text] of Object.entries(maps.description)) {
      (drop.description as never as Map<string, string>).set(locale, text);
    }
    drop.pendingLocales = failedLocales as never;
    await drop.save();
    if (failedLocales.length === 0) report.translated += 1;
  }

  const products = await Product.find();
  for (const product of products) {
    if (missingLocales(product.title as never).length === 0) continue;
    report.productsMissing += 1;
    const { maps, failedLocales } = await translateContent({
      title: (product.title as never as Map<string, string>).get(defaultLocale) ?? '',
      description:
        (product.description as never as Map<string, string>).get(defaultLocale) ?? '',
    });
    for (const [locale, text] of Object.entries(maps.title)) {
      (product.title as never as Map<string, string>).set(locale, text);
    }
    for (const [locale, text] of Object.entries(maps.description)) {
      (product.description as never as Map<string, string>).set(locale, text);
    }
    product.pendingLocales = failedLocales as never;
    await product.save();
    if (failedLocales.length === 0) report.translated += 1;
  }

  return report;
}
