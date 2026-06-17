'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { sendGAEvent } from '@next/third-parties/google'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import { RacketWithInsights } from '@/lib/recommend'
import { gerarExplicacoes } from '@/lib/explicador'
import AthleteBadge from './AthleteBadge'
import SpecsGrid, { buildSpecRows } from './SpecsGrid'
import ScoreSection from './ScoreSection'
import RacketKeyStats from './RacketKeyStats'

interface Props {
  racket: RacketWithInsights
  open: boolean
  onClose: () => void
}

export default function InsightsModal({ racket, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [anatomiaOpen, setAnatomiaOpen] = useState(false)
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

  const RadarTick = (props: {
    x?: number; y?: number; payload?: { value: string }
    textAnchor?: 'start' | 'middle' | 'end' | 'inherit'
  }) => {
    const { x = 0, y = 0, payload, textAnchor = 'middle' } = props
    const score = radarData.find(d => d.subject === payload?.value)?.value ?? 0
    return (
      <text x={x} y={y} textAnchor={textAnchor} dy="0.355em">
        <tspan fill="#0E3A40" fontSize={11} fontWeight={500}>{payload?.value} </tspan>
        <tspan fill="#0CC0BE" fontSize={11} fontWeight={700}>{score}</tspan>
      </text>
    )
  }

  const explicacoes = gerarExplicacoes(racket)
  const specRows = buildSpecRows(racket)
  const extra = (racket.specs_extra ?? {}) as Record<string, unknown>
  const tratamentoFabrica = extra.tratamento_fabrica
  const athlete = extra.atleta as string | undefined

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
            {athlete
              ? <AthleteBadge athlete={athlete} variant="modal" />
              : <p className="text-tinta/50 text-xs mt-0.5">Análise completa</p>
            }
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

          {/* Subtítulo */}
          <p className="text-tinta/50 text-xs leading-relaxed -mt-1">
            Analisamos cada raquete em 6 dimensões (0–10) com base nas suas especificações reais.
          </p>

          {/* Radar chart */}
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={radarData} margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
              <PolarGrid stroke="#C9EEEC" />
              <PolarAngleAxis
                dataKey="subject"
                tick={<RadarTick />}
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

          {/* Saída de bola + Sweet spot */}
          <RacketKeyStats racket={racket} />

          {/* Pontuações com tooltips por dimensão */}
          <ScoreSection
            power={ins.power}
            control={ins.control}
            comfort={ins.comfort}
            maneuverability={ins.maneuverability}
            spin={ins.spin}
            stability={ins.stability}
            tratamentoFabrica={tratamentoFabrica as boolean | undefined}
          />

          {/* Anatomia da raquete */}
          <div className="border border-[rgba(14,58,64,0.08)] rounded-xl overflow-hidden -mt-1">
            <button
              className="flex items-center justify-between w-full px-3 py-2.5 text-xs text-tinta/50 hover:text-tinta/70 transition-colors"
              onClick={() => {
                const next = !anatomiaOpen
                setAnatomiaOpen(next)
                if (next) sendGAEvent({ event: 'anatomia_aberta', racket: racket.slug })
              }}
            >
              <span>Anatomia da raquete</span>
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
                className={`transition-transform duration-150 ${anatomiaOpen ? 'rotate-180' : ''}`}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {anatomiaOpen && (
              <div className="border-t border-aqua/10">
                <Image
                  src="/anatomia-raquete.webp"
                  alt="Diagrama com as partes da raquete de beach tennis: moldura, face, núcleo EVA, furos, coração, cabo e espessura"
                  width={1264}
                  height={778}
                  className="w-full h-auto"
                  priority={false}
                />
              </div>
            )}
          </div>

          {/* Perfil resumo */}
          {ins.perfil_resumo && (
            <div className="bg-[#FBF6EF] rounded-xl p-4 border border-[rgba(14,58,64,0.06)]">
              <p className="text-tinta text-sm leading-relaxed">{ins.perfil_resumo}</p>
            </div>
          )}

          {/* Especificações */}
          {specRows.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <p className="text-tinta/40 font-semibold text-[10px] uppercase tracking-wider">
                Especificações
              </p>
              <SpecsGrid racket={racket} variant="modal" />
            </div>
          )}

          {/* Explicações determinísticas */}
          {explicacoes.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Image
                  src="/tury-explicando.png"
                  alt="Tury explicando"
                  width={296}
                  height={376}
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
