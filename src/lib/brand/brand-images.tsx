import { readFileSync } from 'node:fs';
import path from 'node:path';

import { SITE } from '@/lib/site';

// Read once at module load: the logo never changes, and a synchronous read keeps these
// image routes prerenderable under Cache Components.
const LOGO_MARK_DATA_URI = `data:image/png;base64,${readFileSync(
  path.join(process.cwd(), 'public/brand/codeacme-logo-mark.png'),
).toString('base64')}`;

// Logo mark aspect ratio (211 × 126 px source).
const LOGO_ASPECT = 126 / 211;
const TILE_RADIUS = 0.22;
const TILE_LOGO_WIDTH = 0.82;

export const BRAND_COLORS = {
  violet: '#5911EB',
  paper: '#FFFFFF',
  ink: '#0C0B13',
  muted: '#6D6A7C',
  dot: 'rgba(89, 17, 235, 0.08)',
} as const;

export const SOCIAL_CARD_SIZE = { width: 1200, height: 630 };
export const SOCIAL_CARD_ALT = `${SITE.NAME}: ${SITE.DESCRIPTION}`;

const CARD_PILLS = ['Revenue & receivables', 'P&L and reports', 'Month close'];

export function LogoMark({ width }: { width: number }) {
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- rendered by Satori, not the browser
  return <img src={LOGO_MARK_DATA_URI} width={width} height={Math.round(width * LOGO_ASPECT)} />;
}

/** The app icon: the logo mark on a white rounded tile (favicon and home-screen icon). */
export function IconTile({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND_COLORS.paper,
        borderRadius: size * TILE_RADIUS,
      }}
    >
      <LogoMark width={Math.round(size * TILE_LOGO_WIDTH)} />
    </div>
  );
}

/** The image a pasted link unfurls to (Open Graph and Twitter cards share it). */
export function SocialCard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: BRAND_COLORS.paper,
        backgroundImage: `radial-gradient(${BRAND_COLORS.dot} 2px, transparent 2px)`,
        backgroundSize: '28px 28px',
        color: BRAND_COLORS.ink,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <LogoMark width={120} />
        <span style={{ fontSize: 34, fontWeight: 700 }}>{SITE.COMPANY}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <span style={{ fontSize: 92, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
          {SITE.NAME}
        </span>
        <span style={{ fontSize: 40, color: BRAND_COLORS.muted }}>{SITE.TAGLINE}</span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {CARD_PILLS.map((name) => (
          <span
            key={name}
            style={{
              display: 'flex',
              padding: '12px 26px',
              borderRadius: 999,
              background: BRAND_COLORS.violet,
              color: BRAND_COLORS.paper,
              fontSize: 28,
              fontWeight: 600,
            }}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
