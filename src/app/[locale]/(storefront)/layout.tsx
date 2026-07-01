import { Ticker } from '@/components/Ticker';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { getLiveDrop } from '@/features/drops/queries';
import { defaultLocale } from '@/i18n/locales';

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const drop = await getLiveDrop(defaultLocale).catch(() => null);
  return (
    <div style={{ overflow: 'hidden' }}>
      <Ticker dropNumber={drop?.number ?? null} pieceCount={drop?.totalCount ?? 0} />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
