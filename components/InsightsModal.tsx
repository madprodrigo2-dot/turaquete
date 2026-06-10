'use client'
import { useEffect } from 'react'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import { RacketWithInsights } from '@/lib/recommend'
import { gerarExplicacoes } from '@/lib/explicador'

interface Props {
  racket: RacketWithInsights
  open: boolean
  onClose: () => void
}

export default function InsightsModal({ racket, open, onClose }: Props) {
  const ins = racket.racket_insights

  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open, onClose])

  if (!open || !ins) return null

  const radarData = [
    { subject: 'Potência',     value: ins.power          ?? 0 },
    { subject: 'Controle',     value: ins.control        ?? 0 },
    { subject: 'Conforto',     value: ins.comfort        ?? 0 },
    { subject: 'Manuseio',     value: ins.maneuverability ?? 0 },
    { subject: 'Spin',         value: ins.spin           ?? 0 },
    { subject: 'Estabilidade', value: ins.stability      ?? 0 },
  ]

  const explicacoes = gerarExplicacoes(racket)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[88vh] overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-2">
          <div>
            <p className="font-semibold text-tinta text-sm leading-snug">{racket.name}</p>
            <p className="text-tinta/50 text-xs mt-0.5">Análise detalhada</p>
          </div>
          <button
            onClick={onClose}
            className="text-tinta/40 hover:text-tinta transition-colors p-1 -mr-1 mt-0.5 shrink-0"
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-6 flex flex-col gap-5">

          {/* Radar chart */}
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
              <PolarGrid stroke="#C9EEEC" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#0E3A40', fontSize: 11, fontWeight: 500 }}
              />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              <Radar
                dataKey="value"
                stroke="#0CC0BE"
                fill="#0CC0BE"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Perfil resumo */}
          {ins.perfil_resumo && (
            <div className="bg-aqua-light rounded-xl p-4">
              <p className="text-tinta text-sm leading-relaxed">{ins.perfil_resumo}</p>
            </div>
          )}

          {/* Explicações determinísticas */}
          {explicacoes.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-tinta/60 font-semibold text-xs uppercase tracking-wider">
                O que explica essas notas
              </p>
              <ul className="flex flex-col gap-2">
                {explicacoes.map((linha, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-tinta/80 leading-snug">
                    <span className="text-aqua shrink-0 mt-0.5">–</span>
                    {linha}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
