import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale, defaultLocale, type Locale } from '@/i18n/locales';
import { getDropBySlug } from '@/features/drops/queries';
import { DropGridSection } from '@/features/drops/components/DropGridSection';

export const dynamic = 'force-dynamic';

export default async function DropPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  setRequestLocale(locale);

  const drop = await getDropBySlug(slug, locale);
  if (!drop) notFound();

  return (
    <>
      <section className="container" style={{ paddingTop: 56 }}>
        {drop.title ? (
          <p style={{ fontWeight: 200, fontSize: 'clamp(18px, 2vw, 24px)', color: 'var(--stone)' }}>
            {drop.title}
          </p>
        ) : null}
      </section>
      <DropGridSection drop={drop} />
    </>
  );
}
