'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { locales, localeCodes, type Locale } from '@/i18n/locales';

/** Rendered entirely from the locale config — new languages appear automatically. */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  if (localeCodes.length < 2) {
    return null;
  }

  return (
    <details style={{ position: 'relative' }}>
      <summary
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        <GlobeIcon />
        {locale.toUpperCase()}
        <ChevronIcon />
      </summary>
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 12px)',
          background: 'var(--ink)',
          color: 'var(--cream)',
          minWidth: 200,
          padding: '10px 0',
          zIndex: 50,
          boxShadow: 'rgba(21,17,11,0.25) 0 16px 40px',
        }}
      >
        {localeCodes.map((code) => (
          <button
            key={code}
            onClick={() => router.replace(pathname, { locale: code })}
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 20px',
              fontSize: 12,
              letterSpacing: '0.12em',
              fontWeight: code === locale ? 600 : 300,
              color: code === locale ? 'var(--cream)' : 'rgba(243,237,226,0.8)',
              textAlign: 'left',
            }}
          >
            {locales[code].label}
            {code === locale ? <span style={{ color: 'var(--gold)' }}>✓</span> : null}
          </button>
        ))}
      </div>
    </details>
  );
}

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M2.8 12h18.4M12 2.8c2.6 2.4 3.9 5.6 3.9 9.2s-1.3 6.8-3.9 9.2c-2.6-2.4-3.9-5.6-3.9-9.2s1.3-6.8 3.9-9.2z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
