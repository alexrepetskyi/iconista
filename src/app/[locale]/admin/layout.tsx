import { redirect } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { currentUser } from '@/features/auth/auth';

/** Admin chrome. Internal tool — English only by design. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user || user.role !== 'admin') redirect('/login');

  const link = {
    fontSize: 12,
    fontWeight: 300,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  } as const;

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 24,
          padding: '20px 40px',
          borderBottom: '1px solid var(--line)',
          flexWrap: 'wrap',
        }}
      >
        <Link href="/admin" style={{ fontWeight: 800, letterSpacing: '0.24em', fontSize: 16 }}>
          ICONISTA · ADMIN
        </Link>
        <nav style={{ display: 'flex', gap: 26 }}>
          <Link href="/admin/drops" style={link}>Drops</Link>
          <Link href="/admin/orders" style={link}>Orders</Link>
          <Link href="/admin/promocodes" style={link}>Promo codes</Link>
          <Link href="/" style={{ ...link, color: 'var(--stone)' }}>← Storefront</Link>
        </nav>
      </header>
      <main className="container" style={{ paddingTop: 40, paddingBottom: 100, maxWidth: 1080, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
