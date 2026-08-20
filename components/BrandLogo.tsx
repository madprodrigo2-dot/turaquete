interface Props {
  src?: string | null
  alt: string
  size?: 'card' | 'detail'
}

// Brand wordmarks vary wildly in aspect ratio (Head ~3:1, Mormaii ~1:1 icon+text,
// Zand two lines). Cap by height only and let width flow — avoids per-brand tuning.
// 'card' scales up at md+ (small on mobile where card tiles are small too).
// 'detail' stays at the larger size on every breakpoint — the product-detail hero
// photo is close to a desktop card's width even on mobile, so the mobile-card size
// reads as too small there (Rodrigo flagged this from a production screenshot).
export default function BrandLogo({ src, alt, size = 'card' }: Props) {
  if (!src) return null
  const cls = size === 'detail'
    ? 'h-5 max-w-[88px]'
    : 'h-3.5 md:h-5 max-w-[64px] md:max-w-[88px]'
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`w-auto object-contain shrink-0 ${cls}`} />
  )
}
