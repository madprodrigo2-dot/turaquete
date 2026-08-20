import AthleteBadge from './AthleteBadge'
import BrandLogo from './BrandLogo'

interface Props {
  athlete?: string
  brandLogo?: string | null
  brandName?: string
  // 'detail' = product-detail hero (bigger photo, badge reads too small at the
  // card-mobile size even on mobile — see BrandLogo.tsx for why).
  size?: 'card' | 'detail'
}

// Athlete badge (left) + brand logo badge (right), overlaid on a racket photo.
// Single source of truth so the pair always matches wherever a photo shows
// both — card tiles (via RacketImageTile) and the product detail hero alike.
// Caller's image wrapper must be `relative` (and ideally `overflow-hidden`).
export default function RacketBadgeOverlay({ athlete, brandLogo, brandName, size = 'card' }: Props) {
  const isDetail = size === 'detail'

  // When a brand badge shares the photo, reserve room on the right so the
  // athlete badge never reaches it: two co-signed athletes wrap to a second
  // line, and a single unusually long name (one flex item, can't wrap against
  // itself) gets hard-clipped by overflow-hidden as the last-resort guarantee.
  // Also match the brand badge's box height so both sit on the same horizontal
  // line — min-height (not height) so a wrapped multi-athlete pill can still
  // grow past it instead of getting clipped.
  const athleteMaxW = brandLogo
    ? isDetail
      ? 'max-w-[calc(100%-126px)] min-h-9 flex items-center overflow-hidden'
      : 'max-w-[calc(100%-96px)] md:max-w-[calc(100%-126px)] min-h-6 md:min-h-9 flex items-center overflow-hidden'
    : 'max-w-[calc(100%-12px)]'

  const plateH = isDetail ? 'h-9' : 'h-6 md:h-9'
  const platePx = isDetail ? 'px-2' : 'px-1.5 md:px-2'

  return (
    <>
      {athlete && (
        <div className={`absolute top-1.5 left-1.5 z-10 ${athleteMaxW}`}>
          <AthleteBadge athlete={athlete} />
        </div>
      )}
      {brandLogo && (
        <div className={`absolute top-1.5 right-1.5 z-10 max-w-[calc(100%-12px)] ${plateH} flex items-center justify-center rounded-md bg-white/95 border border-tinta/10 shadow-sm ${platePx}`}>
          <BrandLogo src={brandLogo} alt={brandName ?? ''} size={size} />
        </div>
      )}
    </>
  )
}
