'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { MotorRow } from './page'

const DIMS = ['spin', 'comfort', 'stability', 'power', 'control', 'maneuverability', 'forgiveness'] as const
type Dim = (typeof DIMS)[number]

type SortCol = 'name' | 'brand' | 'nivel' | 'faceGrade' | 'coreClass' | 'weight_g' | 'furos' | 'espessura_mm' | 'scoreGeral' | 'scoreIni' | 'scoreInt' | 'scoreAva' | Dim
type SortDir = 'asc' | 'desc'

function ScoreCell({ value, dim, overrides }: { value: number | null; dim: Dim; overrides: string[] }) {
  const hasOverride = overrides.includes(dim)
  if (value == null) return <td className="px-2 py-1 text-center text-gray-300">—</td>

  const color =
    value <= 3 ? 'text-blue-600' :
    value <= 5 ? 'text-gray-500' :
    value <= 7 ? 'text-teal-600' :
    'text-orange-500'

  return (
    <td className="px-2 py-1 text-center">
      <span className={`font-mono text-xs font-semibold ${color}`}>{value}</span>
      {hasOverride && (
        <span className="ml-0.5 text-[9px] font-bold text-amber-500 align-super">ovr</span>
      )}
    </td>
  )
}

function Th({
  col, active, dir, onSort, children,
}: {
  col: SortCol
  active: SortCol
  dir: SortDir
  onSort: (c: SortCol) => void
  children: React.ReactNode
}) {
  return (
    <th
      className="px-2 py-1.5 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-800 whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      {children}
      <span className="ml-0.5">
        {active === col ? (dir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}
      </span>
    </th>
  )
}

const GRADE_ABBR: Record<string, string> = {
  VIDRO: 'VDR',
  HYBRID_VIDRO: 'HYB',
  KEVLAR_PURE: 'KVL',
  KEVLAR_CARBON: 'K+C',
  CARBON_3K: '3K',
  CARBON_3K_METAL: '3K+M',
  CARBON_6K_15K: '12K',
  CARBON_24K: '24K',
  CARBON_18K: '18K',
}

const CORE_ABBR: Record<string, string> = {
  SUPERSOFT: 'SS',
  SOFT: 'S',
  MEDIUM: 'M',
  HARD: 'H',
}

const GRADE_COLOR: Record<string, string> = {
  VIDRO: 'bg-blue-50 text-blue-700',
  HYBRID_VIDRO: 'bg-cyan-50 text-cyan-700',
  KEVLAR_PURE: 'bg-yellow-50 text-yellow-700',
  KEVLAR_CARBON: 'bg-orange-50 text-orange-700',
  CARBON_3K: 'bg-gray-100 text-gray-600',
  CARBON_3K_METAL: 'bg-slate-100 text-slate-600',
  CARBON_6K_15K: 'bg-teal-50 text-teal-700',
  CARBON_24K: 'bg-violet-50 text-violet-700',
  CARBON_18K: 'bg-purple-50 text-purple-700',
}

const CORE_COLOR: Record<string, string> = {
  SUPERSOFT: 'bg-green-50 text-green-700',
  SOFT: 'bg-emerald-50 text-emerald-700',
  MEDIUM: 'bg-gray-100 text-gray-500',
  HARD: 'bg-red-50 text-red-700',
}

function profileScoreColor(v: number): string {
  return v >= 7.5 ? 'text-orange-500' : v >= 6.5 ? 'text-teal-600' : 'text-gray-400'
}

function sortVal(row: MotorRow, col: SortCol): string | number {
  if (col === 'name') return row.name.toLowerCase()
  if (col === 'brand') return row.brand.toLowerCase()
  if (col === 'faceGrade') return row.faceGrade
  if (col === 'coreClass') return row.coreClass
  if (col === 'weight_g') return row.weight_g ?? -1
  if (col === 'furos') return row.furos ?? -1
  if (col === 'espessura_mm') return row.espessura_mm ?? -1
  if (col === 'nivel') return row.nivel ?? ''
  if (col === 'scoreGeral') return row.scoreGeral ?? -1
  if (col === 'scoreIni') return row.scoreIni ?? -1
  if (col === 'scoreInt') return row.scoreInt ?? -1
  if (col === 'scoreAva') return row.scoreAva ?? -1
  return row[col] ?? -1
}

export default function MotorTable({ rows }: { rows: MotorRow[] }) {
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [search, setSearch] = useState('')

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const base = q
      ? rows.filter(r =>
          r.name.toLowerCase().includes(q) ||
          r.brand.toLowerCase().includes(q) ||
          r.faceGrade.toLowerCase().includes(q) ||
          r.coreClass.toLowerCase().includes(q) ||
          (r.nivel ?? '').includes(q)
        )
      : rows
    return [...base].sort((a, b) => {
      const va = sortVal(a, sortCol)
      const vb = sortVal(b, sortCol)
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, search, sortCol, sortDir])

  const ovrCount = rows.filter(r => r.overrides.length > 0).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold text-gray-900">Motor — Auditoria</h1>
        <p className="text-xs text-gray-400">
          {rows.length} raquetes publicadas &middot; {ovrCount} com overrides editoriais
        </p>
      </div>

      <input
        type="search"
        placeholder="Filtrar por nome, marca, face, core..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-teal-400"
      />

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <Th col="name" active={sortCol} dir={sortDir} onSort={handleSort}>Nome</Th>
              <Th col="brand" active={sortCol} dir={sortDir} onSort={handleSort}>Marca</Th>
              <Th col="nivel" active={sortCol} dir={sortDir} onSort={handleSort}>Nv</Th>
              <Th col="scoreIni" active={sortCol} dir={sortDir} onSort={handleSort}>I</Th>
              <Th col="scoreInt" active={sortCol} dir={sortDir} onSort={handleSort}>M</Th>
              <Th col="scoreAva" active={sortCol} dir={sortDir} onSort={handleSort}>A</Th>
              <Th col="faceGrade" active={sortCol} dir={sortDir} onSort={handleSort}>Face</Th>
              <Th col="coreClass" active={sortCol} dir={sortDir} onSort={handleSort}>Core</Th>
              <Th col="weight_g" active={sortCol} dir={sortDir} onSort={handleSort}>Peso</Th>
              <Th col="furos" active={sortCol} dir={sortDir} onSort={handleSort}>Furos</Th>
              <Th col="espessura_mm" active={sortCol} dir={sortDir} onSort={handleSort}>Esp</Th>
              <Th col="spin" active={sortCol} dir={sortDir} onSort={handleSort}>Spin</Th>
              <Th col="comfort" active={sortCol} dir={sortDir} onSort={handleSort}>Conf</Th>
              <Th col="stability" active={sortCol} dir={sortDir} onSort={handleSort}>Est</Th>
              <Th col="power" active={sortCol} dir={sortDir} onSort={handleSort}>Pwr</Th>
              <Th col="control" active={sortCol} dir={sortDir} onSort={handleSort}>Ctrl</Th>
              <Th col="maneuverability" active={sortCol} dir={sortDir} onSort={handleSort}>Man</Th>
              <Th col="forgiveness" active={sortCol} dir={sortDir} onSort={handleSort}>Forg</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr
                key={r.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}
              >
                <td className="px-2 py-1 max-w-[180px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Link
                      href={`/admin/rackets/${r.slug}`}
                      className="text-teal-700 hover:underline font-medium truncate"
                    >
                      {r.name}
                    </Link>
                    <Link
                      href={`/raquetes/${r.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-gray-300 hover:text-teal-500 transition-colors"
                      title="Ver na web"
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4.5 1.5H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6"/>
                        <path d="M7 1.5h2.5m0 0V4m0-2.5L5 6"/>
                      </svg>
                    </Link>
                  </div>
                </td>
                <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{r.brand}</td>
                <td className="px-2 py-1 text-center">
                  {r.nivel === 'avancado'      && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">AVA</span>}
                  {r.nivel === 'intermediario' && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700">INT</span>}
                  {r.nivel === 'iniciante'     && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700">INI</span>}
                  {r.nivel == null             && <span className="text-gray-300">—</span>}
                </td>
                <td className="px-2 py-1 text-center">
                  {r.scoreIni != null
                    ? <span className={`font-mono text-xs font-semibold ${profileScoreColor(r.scoreIni)}`}>{r.scoreIni}</span>
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="px-2 py-1 text-center">
                  {r.scoreInt != null
                    ? <span className={`font-mono text-xs font-semibold ${profileScoreColor(r.scoreInt)}`}>{r.scoreInt}</span>
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="px-2 py-1 text-center">
                  {r.scoreAva != null
                    ? <span className={`font-mono text-xs font-semibold ${profileScoreColor(r.scoreAva)}`}>{r.scoreAva}</span>
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="px-2 py-1">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${GRADE_COLOR[r.faceGrade] ?? 'bg-gray-100 text-gray-500'}`}
                    >
                      {GRADE_ABBR[r.faceGrade] ?? r.faceGrade}
                    </span>
                    {r.face_material && (
                      <span className="text-[9px] text-gray-400 leading-tight truncate max-w-[90px]" title={r.face_material}>
                        {r.face_material}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${CORE_COLOR[r.coreClass] ?? 'bg-gray-100 text-gray-500'}`}
                    title={r.core ?? undefined}
                  >
                    {CORE_ABBR[r.coreClass] ?? r.coreClass}
                  </span>
                </td>
                <td className="px-2 py-1 text-center text-gray-500 font-mono">{r.weight_g ?? '—'}</td>
                <td className="px-2 py-1 text-center text-gray-500 font-mono">{r.furos ?? '—'}</td>
                <td className="px-2 py-1 text-center text-gray-500 font-mono">{r.espessura_mm ?? '—'}</td>
                <ScoreCell value={r.spin} dim="spin" overrides={r.overrides} />
                <ScoreCell value={r.comfort} dim="comfort" overrides={r.overrides} />
                <ScoreCell value={r.stability} dim="stability" overrides={r.overrides} />
                <ScoreCell value={r.power} dim="power" overrides={r.overrides} />
                <ScoreCell value={r.control} dim="control" overrides={r.overrides} />
                <ScoreCell value={r.maneuverability} dim="maneuverability" overrides={r.overrides} />
                <ScoreCell value={r.forgiveness} dim="forgiveness" overrides={r.overrides} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
