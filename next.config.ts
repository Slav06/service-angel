import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite'],
  // Lead request attachments go through Server Actions (files are capped at 4 MB; Vercel allows 4.5 MB).
  experimental: { serverActions: { bodySizeLimit: '4.5mb' } },
  // Migrations run on first DB use; ship the SQL files with every server route.
  outputFileTracingIncludes: { '/**': ['./drizzle/**/*'] },
};

export default nextConfig;
