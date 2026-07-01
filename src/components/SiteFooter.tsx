import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export async function SiteFooter() {
  const t = await getTranslations('footer');

  const colTitle = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(243,237,226,0.5)',
    marginBottom: 18,
  } as const;
  const colLink = {
    display: 'block',
    fontSize: 13,
    fontWeight: 300,
    color: 'rgba(243,237,226,0.85)',
    marginBottom: 12,
  } as const;

  return (
    <footer style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
      <div
        className="container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1.4fr) repeat(3, minmax(140px, 1fr))',
          gap: 40,
          padding: '72px 40px 48px',
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 34, letterSpacing: '0.18em' }}>ICONISTA</div>
          <p
            style={{
              marginTop: 18,
              fontSize: 13,
              fontWeight: 300,
              lineHeight: 1.6,
              maxWidth: 320,
              color: 'rgba(243,237,226,0.7)',
            }}
          >
            {t('tagline')}
          </p>
        </div>
        <div>
          <div style={colTitle}>{t('drops')}</div>
          <Link href="/" style={colLink}>{t('thisDrop')}</Link>
          <Link href="/archive" style={colLink}>{t('theArchive')}</Link>
          <Link href="/#newsletter" style={colLink}>{t('nextDropReminder')}</Link>
        </div>
        <div>
          <div style={colTitle}>{t('house')}</div>
          <Link href="/#about" style={colLink}>{t('aboutUs')}</Link>
          <Link href="/#authenticity" style={colLink}>{t('authentication')}</Link>
          <Link href="/#reviews" style={colLink}>{t('reviews')}</Link>
        </div>
        <div>
          <div style={colTitle}>{t('care')}</div>
          <Link href="/#faq" style={colLink}>{t('shipping')}</Link>
          <Link href="/#faq" style={colLink}>{t('returns')}</Link>
          <Link href="/#faq" style={colLink}>{t('privacy')}</Link>
          <Link href="/#faq" style={colLink}>{t('contact')}</Link>
        </div>
      </div>
      <div
        className="container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
          padding: '20px 40px',
          borderTop: '1px solid rgba(243,237,226,0.14)',
          fontSize: 11,
          fontWeight: 300,
          letterSpacing: '0.1em',
          color: 'rgba(243,237,226,0.5)',
        }}
      >
        <span>{t('copyright', { year: new Date().getFullYear() })}</span>
        <span style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Instagram · Visa · Mastercard · Amex · PayPal · Klarna
        </span>
      </div>
    </footer>
  );
}
