'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
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
  const [mounted, setMounted] = useState(false)
  const ins = racket.racket_insights

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handle)
    }
  }, [open, onClose])

  if (!open || !ins || !mounted) return null

  const radarData = [
    { subject: 'Potência',     value: ins.power           ?? 0 },
    { subject: 'Controle',     value: ins.control         ?? 0 },
    { subject: 'Conforto',     value: ins.comfort         ?? 0 },
    { subject: 'Manuseio',     value: ins.maneuverability ?? 0 },
    { subject: 'Spin',         value: ins.spin            ?? 0 },
    { subject: 'Estabilidade', value: ins.stability       ?? 0 },
  ]

  const explicacoes = gerarExplicacoes(racket)

  const tratamentoFabrica = (racket.specs_extra as Record<string, unknown> | null)?.tratamento_fabrica
  const specItems = [
    racket.weight_g ? `${racket.weight_g}g` : null,
    racket.balance  ? racket.balance         : null,
    racket.face_material                     ?? null,
    racket.core                              ?? null,
    tratamentoFabrica === false ? 'Superfície: lisa (sem tratamento de fábrica)' : null,
  ].filter((s): s is string => s != null && s.trim() !== '')

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-[480px] max-h-[88vh] overflow-y-auto flex flex-col"
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
            <p className="text-tinta/50 text-xs mt-0.5">Análise completa</p>
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

          {/* Subtítulo do sistema */}
          <p className="text-tinta/50 text-xs leading-relaxed -mt-1">
            Analisamos cada raquete em 6 dimensões (0–10) com base nas suas especificações reais.
          </p>

          {/* Specs linha */}
          {specItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {specItems.map(s => (
                <span key={s} className="bg-gray-100 text-tinta/60 text-xs px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          )}

          {/* Radar chart */}
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={radarData} margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
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

          {/* Nota de spin / superfície lisa */}
          {tratamentoFabrica === false && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 -mt-1">
              <span className="text-amber-500 shrink-0 mt-0.5 text-sm">ℹ</span>
              <p className="text-amber-800 text-xs leading-relaxed">
                <strong className="font-semibold">Spin:</strong> superfície lisa de fábrica — dá pra aumentar com tratamento (areado) aplicado depois da compra.
              </p>
            </div>
          )}

          {/* Perfil resumo */}
          {ins.perfil_resumo && (
            <div className="bg-aqua-light rounded-xl p-4">
              <p className="text-tinta text-sm leading-relaxed">{ins.perfil_resumo}</p>
            </div>
          )}

          {/* Explicações determinísticas */}
          {explicacoes.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Image
                  src="/tury-explicando.png"
                  alt="Tury explicando"
                  width={128}
                  height={128}
                  className="w-[52px] md:w-[64px] h-auto shrink-0"
                />
                <p className="text-tinta/60 font-semibold text-xs uppercase tracking-wider">
                  O que explica essas notas
                </p>
              </div>
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
    </div>,
    document.body
  )
}
