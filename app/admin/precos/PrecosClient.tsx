'use client'

import { useState, useMemo, useCallback } from 'react'
import { setFaraLinha } from './actions'

type SortKey = 'name' | 'clicks' | 'staleness' | 'price'
type SortDir = 'asc' | 'desc'

function staleDaysClient(updatedAt: string | null): number {
  if (!updatedAt) return 99999
  return (Date.now() - new Date(updatedAt).getTime()) / 86_400_000
}

export interface PriceRowData {
  id: number
  name: string
  slug: string | null
  brandName: string
  price: number | null
  price_updated_at: string | null
  affiliate_url: string | null
  is_active: boolean | null
  clicks30d: number
  group: 'A' | 'B' | 'C'
  last_sync_status: string | null
  last_sync_at: string | null
  fora_de_linha: boolean
}

interface Summary {
  groupA: number
  stale30d: number
  neverUpdated: number
}

function stripAffiliateParams(url: string): string {
  try { const u = new URL(url); return u.origin + u.pathname } catch { return url }
}

function SyncStatusBadge({ status }: { status: string | null }) {
  if (!status || status === 'ok') return null
  if (status === 'no_price')
    return <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-200 rounded px-1.5 py-0.5 font-medium">sem preço</span>
  if (status === 'error_429')
    return <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5 font-medium">429</span>
  if (status === 'timeout')
    return <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5 font-medium">timeout</span>
  return <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5 font-medium">erro</span>
}

function StalenessLabel({ updatedAt }: { updatedAt: string | null }) {
  if (!updatedAt) return <span className="text-[10px] text-red-500 font-semibold">⏰ nunca</span>

  const ts   = new Date(updatedAt)
  const days = Math.floor((Date.now() - ts.getTime()) / 86_400_000)
  const time = ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
  const label = days === 0
    ? `hoje ${time}`
    : days === 1
    ? `ontem ${time}`
    : `${ts.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`

  if (days > 30) return <span className="text-[10px] text-red-500 font-medium">⚠️ {label}</span>
  if (days > 15) return <span className="text-[10px] text-yellow-600 font-medium">📅 {label}</span>
  return <span className="text-[10px] text-green-600 font-medium">✓ {label}</span>
}

function PriceRow({ row }: { row: PriceRowData }) {
  const [priceStr, setPriceStr] = useState(row.price?.toString() ?? '')
  const [status, setStatus]     = useState<null | 'saving' | 'ok' | 'touched' | string>(null)
  const [savedAt, setSavedAt]   = useState(row.price_updated_at)
  const [foraLinha, setForaLinha] = useState(row.fora_de_linha)
  const [flPending, setFlPending] = useState(false)

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
      const data = await res.json() as { error?: string; price_updated_at?: string }
      if (!res.ok) {
        setStatus(data.error ?? 'Erro ao salvar')
      } else {
        setSavedAt(data.price_updated_at ?? new Date().toISOString())
        setStatus('ok')
        setTimeout(() => setStatus(null), 4000)
      }
    } catch {
      setStatus('Erro de rede')
    }
  }

  async function touch() {
    setStatus('saving')
    try {
      const res = await fetch('/api/admin/price', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, touch: true }),
      })
      const data = await res.json() as { error?: string; price_updated_at?: string }
      if (!res.ok) {
        setStatus(data.error ?? 'Erro')
      } else {
        setSavedAt(data.price_updated_at ?? new Date().toISOString())
        setStatus('touched')
        setTimeout(() => setStatus(null), 4000)
      }
    } catch {
      setStatus('Erro de rede')
    }
  }

  async function toggleForaLinha() {
    setFlPending(true)
    try {
      await setFaraLinha(row.id, !foraLinha)
      setForaLinha(v => !v)
    } catch {
      // falha silenciosa — estado local não muda
    } finally {
      setFlPending(false)
    }
  }

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50/60">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-800 text-sm leading-tight">{row.name}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">{row.brandName}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {row.affiliate_url && (
            <a
              href={stripAffiliateParams(row.affiliate_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-teal-600 hover:underline"
            >
              ↗ ver no ML
            </a>
          )}
          {row.slug ? (
            <a
              href={`/raquetes/${row.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-500 hover:underline"
            >
              ↗ ver no site
            </a>
          ) : (
            <span className="text-[10px] text-gray-300 cursor-default">↗ ver no site</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center whitespace-nowrap">
        {row.clicks30d > 0
          ? <span className="text-xs font-bold text-teal-700">💰 {row.clicks30d}</span>
          : <span className="text-xs text-gray-300">—</span>
        }
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <StalenessLabel updatedAt={savedAt} />
          {foraLinha ? (
            <>
              <span className="text-[10px] bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 font-medium">⛔ fora de linha</span>
              <button
                onClick={toggleForaLinha}
                disabled={flPending}
                className="text-[10px] text-gray-400 hover:text-teal-600 transition-colors text-left disabled:opacity-40"
              >
                {flPending ? '...' : '↩ reativar'}
              </button>
            </>
          ) : (
            <>
              <SyncStatusBadge status={row.last_sync_status} />
              {row.last_sync_status !== 'ok' && (
                <button
                  onClick={toggleForaLinha}
                  disabled={flPending}
                  className="text-[10px] text-gray-400 hover:text-orange-500 transition-colors text-left disabled:opacity-40"
                >
                  {flPending ? '...' : '⛔ fora de linha'}
                </button>
              )}
            </>
          )}
        </div>
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
          {row.affiliate_url && (
            <button
              onClick={touch}
              disabled={status === 'saving'}
              title="Preço confere — só atualiza a data de revisão"
              className="text-[10px] text-gray-400 hover:text-teal-600 transition-colors whitespace-nowrap shrink-0 px-1"
            >
              ✓ revisada
            </button>
          )}
        </div>
        {status === 'ok' && (
          <p className="text-[10px] text-green-600 mt-1">✓ Salvo</p>
        )}
        {status === 'touched' && (
          <p className="text-[10px] text-green-600 mt-1">✓ Marcada como revisada hoje</p>
        )}
        {status && status !== 'ok' && status !== 'touched' && status !== 'saving' && (
          <p className="text-[10px] text-red-500 mt-1">{status}</p>
        )}
      </td>
    </tr>
  )
}

function SortTh({ col, align, active, dir, onSort, className, children }: {
  col: SortKey; align: 'left' | 'center' | 'right'
  active: SortKey | null; dir: SortDir
  onSort: (k: SortKey) => void
  className?: string; children: React.ReactNode
}) {
  const isActive = active === col
  return (
    <th
      onClick={() => onSort(col)}
      className={`font-semibold cursor-pointer select-none hover:bg-gray-100 transition-colors text-${align} ${className ?? ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className={`text-[9px] ${isActive ? 'text-teal-600' : 'text-gray-300'}`}>
          {isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  )
}

type FilterKey = 'priority' | 'afiliado' | 'all' | 'failed'

export default function PrecosClient({ rows, summary }: { rows: PriceRowData[]; summary: Summary }) {
  const [q, setQ]           = useState('')
  const [filter, setFilter] = useState<FilterKey>('priority')
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key }
      setSortDir(key === 'name' ? 'asc' : 'desc')
      return key
    })
  }, [])

  const counts = useMemo(() => ({
    priority: rows.filter(r => r.group === 'A').length,
    afiliado: rows.filter(r => r.group === 'A' || r.group === 'B').length,
    all:      rows.length,
    failed:   rows.filter(r => r.last_sync_status !== null && r.last_sync_status !== 'ok' && !r.fora_de_linha).length,
  }), [rows])

  const displayed = useMemo(() => {
    let out = rows
    if (q) out = out.filter(r =>
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.brandName.toLowerCase().includes(q.toLowerCase())
    )
    if (filter === 'priority') out = out.filter(r => r.group === 'A')
    if (filter === 'afiliado') out = out.filter(r => r.group !== 'C')
    if (filter === 'failed')   out = out.filter(r => r.last_sync_status !== null && r.last_sync_status !== 'ok' && !r.fora_de_linha)
    if (sortKey) {
      out = [...out].sort((a, b) => {
        let diff = 0
        if (sortKey === 'name')      diff = a.name.localeCompare(b.name, 'pt-BR')
        if (sortKey === 'clicks')    diff = a.clicks30d - b.clicks30d
        if (sortKey === 'staleness') diff = staleDaysClient(b.price_updated_at) - staleDaysClient(a.price_updated_at)
        if (sortKey === 'price')     diff = (a.price ?? 0) - (b.price ?? 0)
        return sortDir === 'asc' ? diff : -diff
      })
    }
    return out
  }, [rows, q, filter, sortKey, sortDir])

  const FILTER_LABELS: Record<FilterKey, string> = {
    priority: '🔥 Prioritárias',
    afiliado: '💰 Todas com afiliado',
    all:      'Todas',
    failed:   '⚠️ Falharam',
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Summary bar */}
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <span className="font-semibold text-gray-800">
          🔥 {summary.groupA} prioritárias a revisar
        </span>
        {summary.stale30d > 0 && (
          <span className="text-red-500 font-medium">⚠️ {summary.stale30d} com preço &gt;30d</span>
        )}
        {summary.neverUpdated > 0 && (
          <span className="text-orange-500 font-medium">⏰ {summary.neverUpdated} nunca atualizadas</span>
        )}
        {counts.failed > 0 && (
          <button onClick={() => setFilter('failed')} className="text-red-500 font-medium hover:underline text-sm">
            ⚠️ {counts.failed} falharam no sync
          </button>
        )}
        {summary.stale30d === 0 && summary.neverUpdated === 0 && counts.failed === 0 && (
          <span className="text-green-600 text-xs">✓ Nenhuma com preço vencido</span>
        )}
      </div>

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

        {(['priority', 'afiliado', 'all', 'failed'] as FilterKey[]).map(f => (
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
              <SortTh col="name"      align="left"   active={sortKey} dir={sortDir} onSort={handleSort} className="px-4 py-2.5">Raquete</SortTh>
              <SortTh col="clicks"    align="center" active={sortKey} dir={sortDir} onSort={handleSort} className="px-4 py-2.5 whitespace-nowrap">Cliques 30d</SortTh>
              <SortTh col="staleness" align="left"   active={sortKey} dir={sortDir} onSort={handleSort} className="px-4 py-2.5 whitespace-nowrap">Últ. revisão</SortTh>
              <SortTh col="price"     align="left"   active={sortKey} dir={sortDir} onSort={handleSort} className="px-4 py-2.5">Preço</SortTh>
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
