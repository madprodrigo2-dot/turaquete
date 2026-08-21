interface Props {
  src?: string | null
  alt: string
}

// Brand wordmarks vary wildly in aspect ratio (Head ~3:1, Mormaii ~1:1 icon+text,
// Zand two lines). Cap by height only and let width flow — avoids per-brand tuning.
// Variant B (approved): brand is deliberately secondary — small, grayscale, low
// contrast — everywhere, card and detail alike. The athlete badge carries the
// visual weight now, so there's no longer a bigger/smaller-by-context split here.
export default function BrandLogo({ src, alt }: Props) {
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-3 w-auto max-w-[40px] object-contain shrink-0 opacity-60 grayscale" />
  )
}
