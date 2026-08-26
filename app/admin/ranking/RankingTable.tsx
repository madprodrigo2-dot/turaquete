'use client'

import { useMemo, useState } from 'react'
import { InfoTooltip } from '../InfoTooltip'
import type { RowData } from './page'

type SortKey = 'recs' | 'clicks' | 'taxa' | 'avgConfidence' | 'avgRank'
type SortDir = 'asc' | 'desc'

function taxaValue(r: RowData): number {
  return r.recs > 0 ? r.clicks / r.recs : -1
}

// null sempre fica por último, em qualquer direção — não é um dado "baixo" nem "alto", é ausente.
function compareNullable(a: number | null, b: number | null, dir: SortDir): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return dir === 'asc' ? a - b : b - a
}

const SORTERS: Record<SortKey, (a: RowData, b: RowData, dir: SortDir) => number> = {
  recs:          (a, b, dir) => (dir === 'asc' ? a.recs - b.recs : b.recs - a.recs),
  clicks:        (a, b, dir) => (dir === 'asc' ? a.clicks - b.clicks : b.clicks - a.clicks),
  taxa:          (a, b, dir) => {
    const av = taxaValue(a), bv = taxaValue(b)
    return dir === 'asc' ? av - bv : bv - av
  },
  avgConfidence: (a, b, dir) => compareNullable(a.avgConfidence, b.avgConfidence, dir),
  avgRank:       (a, b, dir) => compareNullable(a.avgRank, b.avgRank, dir),
}

function pct(num: number, den: number): string {
  return den === 0 ? '—' : `${Math.round((num / den) * 100)}%`
}

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`inline-block ml-1 text-[9px] ${active ? 'text-teal-600' : 'text-gray-300'}`}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '▲▼'}
    </span>
  )
}

function SortableHeader({
  label, sortKey, activeKey, dir, onSort, tooltip,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
  tooltip: string
}) {
  const active = sortKey === activeKey
  return (
    <th className="text-right px-4 py-2">
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center hover:text-teal-600 transition-colors ${active ? 'text-teal-600' : ''}`}
      >
        {label}
        <SortArrow active={active} dir={dir} />
      </button>
      <InfoTooltip text={tooltip} />
    </th>
  )
}

export default function RankingTable({ rows }: { rows: RowData[] }) {
  // Default replica exatamente o sort original: recs desc, clicks desc como desempate.
  const [sortKey, setSortKey] = useState<SortKey>('recs')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedRows = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const primary = SORTERS[sortKey](a, b, sortDir)
      if (primary !== 0) return primary
      // Desempate: replica o default original (recs desc, clicks desc) quando a
      // coluna ativa é Recs; nas outras colunas, mesma dupla como critério estável.
      return sortKey === 'recs' ? b.clicks - a.clicks : b.recs - a.recs || b.clicks - a.clicks
    })
    return copy
  }, [rows, sortKey, sortDir])

  if (rows.length === 0) {
    return <p className="text-gray-400 italic text-xs">Sem dados no período.</p>
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden overflow-x-auto border border-gray-100">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-gray-50 text-gray-400 uppercase">
          <tr>
            <th className="text-left px-4 py-2">#</th>
            <th className="text-left px-4 py-2">Raquete</th>
            <SortableHeader
              label="Recs" sortKey="recs" activeKey={sortKey} dir={sortDir} onSort={handleSort}
              tooltip="Vezes que esta raquete foi incluída numa recomendação do assistente no período."
            />
            <SortableHeader
              label="Cliques" sortKey="clicks" activeKey={sortKey} dir={sortDir} onSort={handleSort}
              tooltip='Cliques em "Ver na loja" (rota /ir/) para esta raquete no período.'
            />
            <SortableHeader
              label="Taxa" sortKey="taxa" activeKey={sortKey} dir={sortDir} onSort={handleSort}
              tooltip="Conversão: % de recomendações que geraram pelo menos um clique (Cliques ÷ Recs)."
            />
            <SortableHeader
              label="Score med." sortKey="avgConfidence" activeKey={sortKey} dir={sortDir} onSort={handleSort}
              tooltip="Média do score de confiança calculado pelo scorer no momento da recomendação (escala 0–10). Quanto maior, mais alinhada estava a raquete com o perfil do usuário."
            />
            <SortableHeader
              label="Rank med." sortKey="avgRank" activeKey={sortKey} dir={sortDir} onSort={handleSort}
              tooltip="Posição média desta raquete nas recomendações (1 = sempre sugerida primeiro). Quanto menor, mais frequentemente aparece no topo."
            />
            <th className="text-center px-4 py-2">
              ML
              <InfoTooltip text="Indica se a raquete tem URL de afiliado do Mercado Livre cadastrada (rastreável)." />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r, i) => (
            <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/60">
              <td className="px-4 py-2 text-gray-400">{i + 1}</td>
              <td className="px-4 py-2 font-medium text-gray-800">
                <div>
                  <a href={`/raquetes/${r.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 hover:underline">
                    {r.name}
                  </a>
                </div>
                <div className="text-[10px] text-gray-400 font-mono">{r.slug}</div>
              </td>
              <td className="px-4 py-2 text-right font-semibold">{r.recs}</td>
              <td className="px-4 py-2 text-right">{r.clicks}</td>
              <td className="px-4 py-2 text-right text-gray-500">{pct(r.clicks, r.recs)}</td>
              <td className="px-4 py-2 text-right text-gray-500">{r.avgConfidence ?? '—'}</td>
              <td className="px-4 py-2 text-right text-gray-500">{r.avgRank ?? '—'}</td>
              <td className="px-4 py-2 text-center">
                {r.hasAffiliate
                  ? <span className="text-green-500 text-base" title="Tem afiliado ML">✓</span>
                  : <span className="text-gray-300">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-gray-300 px-4 py-2">{rows.length} raquetes com atividade no período</p>
    </div>
  )
}
