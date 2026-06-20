import Link from 'next/link'

export default function GuiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen sand-texture">
      <nav className="sticky top-0 z-30 bg-[#FBF6EF]/90 backdrop-blur-sm border-b border-[rgba(14,58,64,0.06)]">
        <div className="max-w-2xl mx-auto px-5 md:px-6 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-tinta/60 text-sm font-medium hover:text-aqua transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Turaquete
          </Link>
          <Link href="/guia" className="text-xs text-tinta/40 hover:text-tinta transition-colors font-medium">
            Guia da raquete
          </Link>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
