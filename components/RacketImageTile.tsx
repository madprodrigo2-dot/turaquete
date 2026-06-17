import AthleteBadge from './AthleteBadge'

interface Props {
  src?: string | null
  alt: string
  athlete?: string
  hoverScale?: boolean
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
export default function RacketImageTile({ src, alt, athlete, hoverScale }: Props) {
  return (
    <div className="relative h-36 bg-white overflow-hidden shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`object-cover object-top w-full h-full${hoverScale ? ' group-hover:scale-105 transition-transform duration-300' : ''}`}
        />
      ) : (
        <Placeholder />
      )}
      {athlete && (
        <div className="absolute top-1.5 left-1.5 z-10 max-w-[calc(100%-12px)]">
          <AthleteBadge athlete={athlete} />
        </div>
      )}
    </div>
  )
}
