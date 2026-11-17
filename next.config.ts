import type { NextConfig } from 'next';

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Keep visited pages in the browser for five minutes so going back to them is instant.
    // Every save calls refresh(), which clears this cache, so your own changes always show.
    staleTimes: { dynamic: 300 },
    // Room for the workbook upload (Settings → Import), plus multipart overhead.
    serverActions: { bodySizeLimit: '6mb' },
  },
  // exceljs is a Node library with optional native-ish deps; keep it out of the bundle.
  serverExternalPackages: ['exceljs'],
  reactStrictMode: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
