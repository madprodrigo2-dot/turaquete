interface Props {
  src?: string | null
  alt: string
}

// Brand wordmarks vary wildly in aspect ratio (Head ~3:1, Mormaii ~1:1 icon+text,
// Zand two lines). Cap by height only and let width flow — avoids per-brand tuning.
export default function BrandLogo({ src, alt }: Props) {
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-3.5 w-auto max-w-[72px] object-contain shrink-0" />
  )
}
