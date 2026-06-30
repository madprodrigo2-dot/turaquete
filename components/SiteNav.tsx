import Link from 'next/link'
import BackButton from './BackButton'
import SearchBar from './SearchBar'

interface Props {
  useHistory?: boolean
  fallbackHref?: string
  backHref?: string
  backLabel?: string
  maxWidth?: string
}

export default function SiteNav({
  useHistory,
  fallbackHref = '/',
  backHref = '/',
  backLabel = 'Início',
  maxWidth = 'max-w-4xl',
}: Props) {
  return (
    <div className="sticky top-0 z-30 bg-[#FBF6EF]/90 backdrop-blur-sm border-b border-[rgba(14,58,64,0.06)]">
      <div className={`${maxWidth} mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-4`}>
        {useHistory ? (
          <BackButton fallbackHref={fallbackHref} />
        ) : (
          <Link
            href={backHref}
            className="flex items-center gap-2 text-tinta text-sm font-medium hover:text-aqua transition-colors w-fit shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {backLabel}
          </Link>
        )}
        <SearchBar />
      </div>
    </div>
  )
}
