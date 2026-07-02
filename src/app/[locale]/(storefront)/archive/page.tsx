import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { isLocale, defaultLocale, type Locale } from '@/i18n/locales';
import { getArchiveDrops } from '@/features/drops/queries';

export const dynamic = 'force-dynamic';

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  setRequestLocale(locale);

  const [archive, t] = await Promise.all([getArchiveDrops(locale), getTranslations('archive')]);

  return (
    <section className="container" style={{ paddingTop: 72, paddingBottom: 90 }}>
      <div className="label" style={{ color: 'var(--bronze)', marginBottom: 14 }}>
        {t('label')}
      </div>
      <h1 style={{ fontWeight: 800, fontSize: 'clamp(34px, 4.4vw, 62px)', marginBottom: 16 }}>
        {t('title')}
      </h1>
      <p style={{ fontSize: 13, fontWeight: 300, maxWidth: 380, color: 'var(--stone)', lineHeight: 1.6, marginBottom: 48 }}>
        {t('description')}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}
      >
        {archive.map((past) => (
          <Link
            key={past.slug}
            href={`/drop/${past.slug}`}
            style={{
              position: 'relative',
              background:
                'radial-gradient(120% 120% at 70% 20%, var(--dark-1) 0%, var(--dark-2) 55%, var(--dark-3) 100%)',
              color: 'var(--cream)',
              aspectRatio: '16 / 10',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 800, fontSize: 44 }}>
                {String(past.number).padStart(3, '0')}
              </span>
              <span
                className="label-xs"
                style={{ border: '1px solid rgba(243,237,226,0.4)', padding: '5px 10px' }}
              >
                {t('soldOut')}
              </span>
            </div>
            <div>
              <div className="label-xs" style={{ color: 'var(--cream-55)', marginBottom: 8 }}>
                {new Date(past.closesAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                · {t('pieces', { count: past.pieceCount })}
              </div>
              <div style={{ fontWeight: 400, fontSize: 17 }}>{past.title}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
