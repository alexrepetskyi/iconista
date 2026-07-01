import { Link } from '@/i18n/routing';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ textAlign: 'center', padding: '32px 20px', borderBottom: '1px solid var(--line)' }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 21, letterSpacing: '0.24em', paddingLeft: '0.24em' }}>
          ICONISTA
        </Link>
      </header>
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 20px',
        }}
      >
        {children}
      </main>
    </div>
  );
}
