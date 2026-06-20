'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export default function AdminTestFilter({ includeTest }: { includeTest: boolean }) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const toggle = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (includeTest) {
      params.delete('test')
    } else {
      params.set('test', '1')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <button
      onClick={toggle}
      title={includeTest ? 'Ocultar dados de teste' : 'Incluir dados de teste (você)'}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
        includeTest
          ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
          : 'bg-white text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-600'
      }`}
    >
      {includeTest ? '🧪 c/ teste' : '🧪 s/ teste'}
    </button>
  )
}
