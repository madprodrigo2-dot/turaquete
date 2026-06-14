'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const PERIODS = [
  { label: 'Hoje',    value: '1'   },
  { label: '7 dias',  value: '7'   },
  { label: '30 dias', value: '30'  },
  { label: 'Tudo',    value: 'all' },
] as const

export default function AdminPeriodFilter({ current }: { current: string }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const setDays = (val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('days', val)
    params.delete('starter')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-1.5 items-center">
      <span className="text-[11px] text-gray-400 mr-0.5">Período:</span>
      {PERIODS.map(p => (
        <button
          key={p.value}
          onClick={() => setDays(p.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            current === p.value
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-500 border border-gray-200 hover:border-teal-400 hover:text-teal-700'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
