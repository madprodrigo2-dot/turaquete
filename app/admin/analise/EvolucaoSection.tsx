'use client'

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid,
} from 'recharts'
import { useAdminTheme } from '../AdminShell'

type Granularity = 'dia' | 'semana'
type Range = 30 | 90

export interface EvolucaoPoint {
  date: string  // YYYY-MM-DD em BRT
  conversas: number
  recomendacoes: number
  cliques: number
}

interface Props {
  rawData: EvolucaoPoint[]  // 180 dias pré-agregados pelo servidor
}

const SERIES = [
  { key: 'conversas'     as const, label: 'Conversas',        color: '#0d9488' },
  { key: 'recomendacoes' as const, label: 'Com recomendacao', color: '#7c3aed' },
  { key: 'cliques'       as const, label: 'Cliques afiliado', color: '#d97706' },
]

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const dow = d.getUTCDay()
  const delta = dow === 0 ? -6 : 1 - dow
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function fmtLabel(dateStr: string): string {
  const [, mm, dd] = dateStr.split('-')
  return `${dd}/${mm}`
}

const zero = () => ({ conversas: 0, recomendacoes: 0, cliques: 0 })

function buildChart(rawData: EvolucaoPoint[], granularity: Granularity, rangeDays: number) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const startCurr = addDays(todayStr, -(rangeDays - 1))
  const startPrev = addDays(todayStr, -(rangeDays * 2 - 1))

  const dataMap = new Map(rawData.map(p => [p.date, p]))

  // Previous period totals
  const prevTotals = zero()
  let d = startPrev
  while (d < startCurr) {
    const p = dataMap.get(d) ?? zero()
    prevTotals.conversas     += p.conversas
    prevTotals.recomendacoes += p.recomendacoes
    prevTotals.cliques       += p.cliques
    d = addDays(d, 1)
  }

  if (granularity === 'dia') {
    const points: { label: string; conversas: number; recomendacoes: number; cliques: number }[] = []
    let d = startCurr
    while (d <= todayStr) {
      const p = dataMap.get(d) ?? zero()
      points.push({ label: fmtLabel(d), ...p })
      d = addDays(d, 1)
    }
    return { points, prevTotals }
  }

  // Semanal
  const weekMap = new Map<string, { conversas: number; recomendacoes: number; cliques: number }>()
  let wd = startCurr
  while (wd <= todayStr) {
    const wk = mondayOf(wd)
    const p  = dataMap.get(wd) ?? zero()
    const ex = weekMap.get(wk) ?? zero()
    weekMap.set(wk, {
      conversas:     ex.conversas     + p.conversas,
      recomendacoes: ex.recomendacoes + p.recomendacoes,
      cliques:       ex.cliques       + p.cliques,
    })
    wd = addDays(wd, 1)
  }
  const points = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([wk, v]) => ({ label: fmtLabel(wk), ...v }))
  return { points, prevTotals }
}

function fmtDelta(curr: number, prev: number): { text: string; cls: string } {
  if (prev === 0 && curr === 0) return { text: '—', cls: 'text-gray-400' }
  if (prev === 0) return { text: 'novo', cls: 'text-emerald-600' }
  const d = Math.round(((curr - prev) / prev) * 100)
  return {
    text: `${d > 0 ? '+' : ''}${d}%`,
    cls: d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-500' : 'text-gray-400',
  }
}

export function EvolucaoSection({ rawData }: Props) {
  const { dark } = useAdminTheme()
  const [granularity, setGranularity] = useState<Granularity>('semana')
  const [range, setRange]             = useState<Range>(30)

  const { points, prevTotals } = useMemo(
    () => buildChart(rawData, granularity, range),
    [rawData, granularity, range],
  )

  const currTotals = useMemo(() =>
    points.reduce((a, p) => ({
      conversas:     a.conversas     + p.conversas,
      recomendacoes: a.recomendacoes + p.recomendacoes,
      cliques:       a.cliques       + p.cliques,
    }), zero()),
    [points],
  )

  const axisColor   = dark ? '#6b7280' : '#9ca3af'
  const gridColor   = dark ? '#374151' : '#f3f4f6'
  const tooltipBg   = dark ? '#1f2937' : '#ffffff'
  const tooltipBdr  = dark ? '#374151' : '#e5e7eb'
  const tooltipText = dark ? '#f9fafb' : '#111827'

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Evolucao</h2>
        <div className="flex gap-1.5 flex-wrap">
          {/* Granularidade */}
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {(['dia', 'semana'] as Granularity[]).map(g => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                  granularity === g
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {g === 'dia' ? 'Por dia' : 'Por semana'}
              </button>
            ))}
          </div>
          {/* Rango */}
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {([30, 90] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                  range === r
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r} dias
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grafico */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: axisColor }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: axisColor }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: `1px solid ${tooltipBdr}`,
                backgroundColor: tooltipBg,
                color: tooltipText,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4, color: tooltipText }}
              itemStyle={{ padding: '1px 0' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              iconType="plainline"
              iconSize={16}
            />
            {SERIES.map(s => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {SERIES.map(s => {
          const curr = currTotals[s.key]
          const prev = prevTotals[s.key]
          const { text, cls } = fmtDelta(curr, prev)
          return (
            <div key={s.key} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight truncate">{s.label}</p>
              </div>
              <p className="text-lg font-bold text-gray-900">{curr.toLocaleString('pt-BR')}</p>
              <p className={`text-[11px] font-medium ${cls}`}>{text} vs anterior</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
