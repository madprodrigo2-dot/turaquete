import AthleteBadge from './AthleteBadge'
import BrandLogo from './BrandLogo'

interface Props {
  src?: string | null
  alt: string
  athlete?: string
  brandLogo?: string | null
  brandName?: string
  hoverScale?: boolean
  loading?: 'lazy' | 'eager'
}

function Placeholder() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="9.5" rx="6" ry="7.5" fill="#0CC0BE" />
      <rect x="10.5" y="16" width="3" height="7" rx="1.5" fill="#0CC0BE" />
    </svg>
  )
}

// Single source of truth for the racket image tile + athlete badge overlay.
// Always uses relative + overflow-hidden so the badge is clipped to the tile
// and can never escape card bounds or bleed over a sticky header (z-10 < z-30).
export default function RacketImageTile({ src, alt, athlete, brandLogo, brandName, hoverScale, loading = 'lazy' }: Props) {
  // When a brand badge shares the tile, reserve room on the right so the athlete
  // badge never reaches it: two co-signed athletes wrap to a second line, and a
  // single unusually long name (still one flex item, so it can't wrap against
  // itself) gets hard-clipped by overflow-hidden as the last-resort guarantee.
  const athleteMaxW = brandLogo
    ? 'max-w-[calc(100%-96px)] md:max-w-[calc(100%-126px)] overflow-hidden'
    : 'max-w-[calc(100%-12px)]'

  return (
    <div className="relative aspect-[800/1020] bg-white overflow-hidden shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={loading}
          className={`object-contain w-full h-full${hoverScale ? ' group-hover:scale-105 transition-transform duration-300' : ''}`}
        />
      ) : (
        <Placeholder />
      )}
      {athlete && (
        <div className={`absolute top-1.5 left-1.5 z-10 ${athleteMaxW}`}>
          <AthleteBadge athlete={athlete} />
        </div>
      )}
      {brandLogo && (
        <div className="absolute top-1.5 right-1.5 z-10 max-w-[calc(100%-12px)] rounded-md bg-white/95 border border-tinta/10 shadow-sm px-1.5 py-1 md:px-2 md:py-1.5">
          <BrandLogo src={brandLogo} alt={brandName ?? ''} />
        </div>
      )}
    </div>
  )
}
