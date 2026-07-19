'use client'

import { useState, useMemo } from 'react'

export interface PriceRowData {
  id: number
  name: string
  brandName: string
  price: number | null
  price_updated_at: string | null
  affiliate_url: string | null
  is_active: boolean | null
  clicks30d: number
}

function StalenessLabel({ updatedAt }: { updatedAt: string | null }) {
  if (!updatedAt) return <span className="text-[10px] text-red-500 font-medium">⏰ nunca</span>
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000)
  if (days > 60) return <span className="text-[10px] text-orange-500 font-medium">⚠️ {days}d atrás</span>
  if (days > 30) return <span className="text-[10px] text-yellow-600 font-medium">📅 {days}d atrás</span>
  return <span className="text-[10px] text-green-600 font-medium">✓ {days}d atrás</span>
}

function PriceRow({ row }: { row: PriceRowData }) {
  const [priceStr, setPriceStr] = useState(row.price?.toString() ?? '')
  const [status, setStatus] = useState<null | 'saving' | 'ok' | string>(null)
  const [savedAt, setSavedAt] = useState(row.price_updated_at)

  const currentStr = row.price?.toString() ?? ''
  const dirty = priceStr.trim() !== currentStr

  async function save() {
    const num = parseFloat(priceStr.replace(',', '.'))
    if (!isFinite(num) || num <= 0) { setStatus('Preço inválido'); return }
    setStatus('saving')
    try {
      const res = await fetch('/api/admin/price', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, price: num }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setStatus(data.error ?? 'Erro ao salvar')
      } else {
        setSavedAt(new Date().toISOString())
        setStatus('ok')
        setTimeout(() => setStatus(null), 4000)
      }
    } catch {
      setStatus('Erro de rede')
    }
  }

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50/60">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-800 text-sm leading-tight">{row.name}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">{row.brandName}</div>
        {row.affiliate_url && (
          <a
            href={row.affiliate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-teal-600 hover:underline mt-0.5 inline-block"
          >
            ↗ ver no ML
          </a>
        )}
      </td>
      <td className="px-4 py-3 text-center whitespace-nowrap">
        {row.clicks30d > 0
          ? <span className="text-xs font-bold text-teal-700">💰 {row.clicks30d}</span>
          : <span className="text-xs text-gray-300">—</span>
        }
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StalenessLabel updatedAt={savedAt} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] pointer-events-none select-none">R$</span>
            <input
              type="number"
              step="1"
              min="1"
              value={priceStr}
              onChange={e => { setPriceStr(e.target.value); setStatus(null) }}
              onKeyDown={e => { if (e.key === 'Enter' && dirty) save() }}
              className="w-28 text-xs border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 tabular-nums"
              placeholder="0"
            />
          </div>
          <button
            onClick={save}
            disabled={status === 'saving' || !dirty}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
              status === 'saving'
                ? 'bg-gray-100 text-gray-400 cursor-wait'
                : dirty
                  ? 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800'
                  : 'bg-gray-100 text-gray-300 cursor-default'
            }`}
          >
            {status === 'saving' ? '...' : 'Salvar'}
          </button>
        </div>
        {status === 'ok' && (
          <p className="text-[10px] text-green-600 mt-1">✓ Salvo · data_atualização = hoje</p>
        )}
        {status && status !== 'ok' && status !== 'saving' && (
          <p className="text-[10px] text-red-500 mt-1">{status}</p>
        )}
      </td>
    </tr>
  )
}

type FilterKey = 'afiliado' | 'no_price' | 'stale' | 'all'

const FILTER_LABELS: Record<FilterKey, string> = {
  afiliado: '💰 Com afiliado',
  no_price: '⏰ Sem preço',
  stale:    '⚠️ +30 dias',
  all:      'Todas',
}

export default function PrecosClient({ rows }: { rows: PriceRowData[] }) {
  const [q, setQ]           = useState('')
  const [filter, setFilter] = useState<FilterKey>('afiliado')

  const counts = useMemo(() => {
    const now = Date.now()
    return {
      afiliado: rows.filter(r => r.affiliate_url && r.is_active !== false).length,
      no_price: rows.filter(r => !r.price_updated_at && r.affiliate_url && r.is_active !== false).length,
      stale:    rows.filter(r => {
        if (!r.affiliate_url || r.is_active === false || !r.price_updated_at) return false
        return (now - new Date(r.price_updated_at).getTime()) > 30 * 86_400_000
      }).length,
      all: rows.length,
    }
  }, [rows])

  const displayed = useMemo(() => {
    const now = Date.now()
    let out = rows
    if (q) out = out.filter(r =>
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.brandName.toLowerCase().includes(q.toLowerCase())
    )
    if (filter === 'afiliado') out = out.filter(r => r.affiliate_url && r.is_active !== false)
    if (filter === 'no_price') out = out.filter(r => !r.price_updated_at && r.affiliate_url && r.is_active !== false)
    if (filter === 'stale')    out = out.filter(r => {
      if (!r.affiliate_url || r.is_active === false || !r.price_updated_at) return false
      return (now - new Date(r.price_updated_at).getTime()) > 30 * 86_400_000
    })
    return out
  }, [rows, q, filter])

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">🔍</span>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nome ou marca..."
            className="text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">×</button>
          )}
        </div>

        {(['afiliado', 'no_price', 'stale', 'all'] as FilterKey[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === f
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {FILTER_LABELS[f]} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr className="text-[11px] text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-2.5 font-semibold">Raquete</th>
              <th className="text-center px-4 py-2.5 font-semibold whitespace-nowrap">Cliques 30d</th>
              <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Últ. atualização</th>
              <th className="text-left px-4 py-2.5 font-semibold">Preço</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(r => <PriceRow key={r.id} row={r} />)}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic text-sm">
                  Nenhuma raquete com este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 text-[11px] text-gray-400">
          {displayed.length} de {rows.length} raquete{rows.length !== 1 ? 's' : ''}
          {filter !== 'all' || q ? ' (filtradas)' : ''}
        </div>
      </div>
    </div>
  )
}
