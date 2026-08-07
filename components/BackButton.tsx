'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CaretLeft } from '@phosphor-icons/react'

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
        <CaretLeft size={16} weight="regular" aria-hidden="true" />
        Voltar
      </button>
    )
  }

  return (
    <Link href={fallbackHref} className={cls}>
      <CaretLeft size={16} weight="regular" aria-hidden="true" />
      Voltar
    </Link>
  )
}
