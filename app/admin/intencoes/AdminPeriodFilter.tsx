'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'

const PERIODS = [
  { label: 'Hoje',    value: '1'   },
  { label: '7 dias',  value: '7'   },
  { label: '30 dias', value: '30'  },
  { label: 'Tudo',    value: 'all' },
] as const

interface Props {
  current: string
  currentFrom?: string
  currentTo?: string
}

export default function AdminPeriodFilter({ current, currentFrom, currentTo }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [showCustom, setShowCustom] = useState(false)
  const [from, setFrom] = useState(currentFrom ?? '')
  const [to,   setTo  ] = useState(currentTo   ?? new Date().toISOString().slice(0, 10))

  const isCustomActive = !!currentFrom

  const setDays = (val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('days', val)
    params.delete('starter')
    params.delete('from')
    params.delete('to')
    setShowCustom(false)
    router.push(`${pathname}?${params.toString()}`)
  }

  const applyCustom = () => {
    if (!from) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('days')
    params.delete('starter')
    params.set('from', from)
    if (to) params.set('to', to)
    else params.delete('to')
    setShowCustom(false)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center justify-end">
      <span className="text-[11px] text-gray-400">Período:</span>

      {PERIODS.map(p => (
        <button
          key={p.value}
          onClick={() => setDays(p.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !isCustomActive && current === p.value
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-500 border border-gray-200 hover:border-teal-400 hover:text-teal-700'
          }`}
        >
          {p.label}
        </button>
      ))}

      {isCustomActive ? (
        <div className="flex items-center gap-1">
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white">
            {currentFrom} → {currentTo ?? 'hoje'}
          </span>
          <button
            onClick={() => setDays('1')}
            title="Limpar"
            className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCustom(s => !s)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showCustom
              ? 'bg-gray-100 text-gray-700 border border-gray-300'
              : 'bg-white text-gray-500 border border-gray-200 hover:border-teal-400 hover:text-teal-700'
          }`}
        >
          Personalizado
        </button>
      )}

      {showCustom && !isCustomActive && (
        <div className="flex items-center gap-2 w-full justify-end mt-1">
          <span className="text-[11px] text-gray-400">De</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={e => setFrom(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          <span className="text-[11px] text-gray-400">até</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={e => setTo(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          <button
            onClick={applyCustom}
            disabled={!from}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white disabled:opacity-40 hover:bg-teal-700 transition-colors"
          >
            Aplicar
          </button>
          <button onClick={() => setShowCustom(false)} className="text-xs text-gray-400 hover:text-gray-600">
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
