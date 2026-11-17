import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';
import { env } from '@/config/env';
import { SITE } from '@/lib/site';

import '@/app/globals.css';

// The same type pair as the other CodeAcme products, so they read as one family.
const inter = Inter({ variable: '--font-sans-brand', subsets: ['latin'] });
const plexMono = IBM_Plex_Mono({
  variable: '--font-mono-brand',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: { default: SITE.NAME, template: `%s · ${SITE.NAME}` },
  description: SITE.DESCRIPTION,
  applicationName: SITE.NAME,
  openGraph: {
    type: 'website',
    siteName: SITE.NAME,
    title: SITE.NAME,
    description: SITE.DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: SITE.NAME, description: SITE.DESCRIPTION },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
