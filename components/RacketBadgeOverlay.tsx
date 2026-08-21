import BrandLogo from './BrandLogo'

// Multi-athlete strings use '&' or '/' as separators, and any single name can
// carry a parenthetical aside not meant for display (e.g. "Edição Ayrton Senna
// (embaixador: Mattia Spoto)"). Same cleanup AthleteBadge.tsx used to do per
// pill — needed here too since this badge renders the joined string directly.
function cleanAthleteLabel(raw: string): string {
  return raw
    .split(/[&/]/)
    .map(name => name.trim())
    .filter(Boolean)
    .map(name => (name.includes('(') ? name.split('(')[0].trim() : name))
    .join(' & ')
}

interface Props {
  athlete?: string
  brandLogo?: string | null
  brandName?: string
  // 'detail' = product-detail hero (bigger photo) — the athlete badge scales up
  // to stay proportionally prominent there. Brand stays uniformly small (see
  // BrandLogo.tsx) since it's deliberately secondary in this design.
  size?: 'card' | 'detail'
}

// Athlete badge (bottom, prominent) + brand logo badge (top-right corner,
// discreet) overlaid on a racket photo. Approved as "Variant B" over two
// alternatives that put both badges at the top competing for the same space —
// separating them by both position and visual weight reads as far less cramped.
// Single source of truth so the pair always matches wherever a photo shows
// both — card tiles (via RacketImageTile) and the product detail hero alike.
// Caller's image wrapper must be `relative` (and ideally `overflow-hidden`).
export default function RacketBadgeOverlay({ athlete, brandLogo, brandName, size = 'card' }: Props) {
  const isDetail = size === 'detail'
  // Co-signed athletes and unusually long names truncate to one line with an
  // ellipsis rather than wrapping — the badge sits at the photo's bottom edge,
  // so there's no room below it to grow into like the old top-corner layout had.
  const athletePill = isDetail
    ? 'text-sm px-3.5 py-2'
    : 'text-[11px] px-2.5 py-1 md:text-xs md:px-3 md:py-1.5'

  return (
    <>
      {brandLogo && (
        <div className="absolute top-1.5 right-1.5 z-10 h-5 flex items-center justify-center rounded-md bg-white/70 border border-tinta/10 px-1.5">
          <BrandLogo src={brandLogo} alt={brandName ?? ''} />
        </div>
      )}
      {athlete && (
        <div className="absolute bottom-2 left-2 right-2 z-10 flex justify-start">
          <span className={`inline-flex items-center gap-1.5 max-w-full rounded-full bg-tinta text-white shadow-md font-bold leading-tight ${athletePill}`}>
            <span className="text-yellow shrink-0" aria-hidden="true">★</span>
            <span className="truncate">{cleanAthleteLabel(athlete)}</span>
          </span>
        </div>
      )}
    </>
  )
}
