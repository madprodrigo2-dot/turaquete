interface Props {
  src?: string | null
  alt: string
}

// Brand wordmarks vary wildly in aspect ratio (Head ~3:1, Mormaii ~1:1 icon+text,
// Zand two lines). Cap by height only and let width flow — avoids per-brand tuning.
// Bigger on desktop (md+) per Rodrigo's request; stays compact on mobile where space is tight.
export default function BrandLogo({ src, alt }: Props) {
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-3.5 md:h-5 w-auto max-w-[64px] md:max-w-[88px] object-contain shrink-0" />
  )
}
