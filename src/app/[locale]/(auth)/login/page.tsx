import { setRequestLocale, getTranslations } from 'next-intl/server';
import { AuthForm } from '@/features/auth/components/AuthForm';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ verified?: string }>;
}) {
  const [{ locale }, { verified }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      {verified === '1' ? <p className="form-ok" style={{ marginBottom: 16 }}>{t('verified')}</p> : null}
      <AuthForm mode="login" />
    </div>
  );
}
