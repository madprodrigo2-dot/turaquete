'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const cls = 'flex items-center gap-2 text-tinta text-sm font-medium hover:text-aqua transition-colors w-fit'

export default function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter()
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    setCanGoBack(window.history.length > 1)
  }, [])

  if (canGoBack) {
    return (
      <button onClick={() => router.back()} className={cls}>
        <ArrowLeft />
        Voltar
      </button>
    )
  }

  return (
    <Link href={fallbackHref} className={cls}>
      <ArrowLeft />
      Voltar
    </Link>
  )
}
