import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { currentUser } from '@/features/auth/auth';
import { getCartCount } from '@/features/cart/queries';
import { LanguageSwitcher } from './LanguageSwitcher';

export async function SiteHeader() {
  const t = await getTranslations('nav');
  const [user, cartCount] = await Promise.all([currentUser(), getCartCount()]);

  const navStyle = {
    display: 'flex',
    gap: 30,
    fontSize: 12,
    fontWeight: 300,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  } as const;

  return (
    <header
      style={{
        position: 'relative',
        zIndex: 5,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '24px 40px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--cream)',
      }}
    >
      <nav style={navStyle}>
        <Link href="/" style={{ fontWeight: 600 }}>
          {t('thisDrop')}
        </Link>
        <Link href="/archive">{t('archive')}</Link>
        <Link href="/#about">{t('about')}</Link>
      </nav>

      <Link
        href="/"
        style={{ fontWeight: 800, fontSize: 21, letterSpacing: '0.24em', paddingLeft: '0.24em' }}
      >
        ICONISTA
      </Link>

      <div style={{ ...navStyle, gap: 26, justifyContent: 'flex-end', alignItems: 'center' }}>
        {user?.role === 'admin' ? <Link href="/admin">{t('admin')}</Link> : null}
        <Link href={user ? '/account' : '/login'}>{user ? t('account') : t('signIn')}</Link>
        <Link href="/cart">
          {t('cart')}
          {cartCount > 0 ? (
            <span style={{ color: 'var(--bronze)', fontWeight: 600 }}> ({cartCount})</span>
          ) : null}
        </Link>
        <LanguageSwitcher />
        <a
          href="https://instagram.com/iconista"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
            <circle cx="12" cy="12" r="4.5" />
            <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </a>
      </div>
    </header>
  );
}
