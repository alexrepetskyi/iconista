import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['mongoose', 'ioredis', 'argon2'],
  experimental: {
    serverActions: {
      // admin uploads several product photos in one submit
      bodySizeLimit: '50mb',
    },
  },
};

export default withNextIntl(nextConfig);
