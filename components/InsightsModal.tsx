'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import { RacketWithInsights } from '@/lib/recommend'
import { gerarExplicacoes } from '@/lib/explicador'
import AthleteBadge from './AthleteBadge'
import SpecsGrid, { buildSpecRows } from './SpecsGrid'

interface Props {
  racket: RacketWithInsights
  open: boolean
  onClose: () => void
}

const GLOSSARY: [string, string][] = [
  ['Potência',     'força que a raquete devolve no ataque com swing rápido (o teto dela). Se seu swing é mais suave, olhe também a Saída de bola.'],
  ['Controle',     'precisão pra colocar a bola onde você quer.'],
  ['Conforto',     'quanto ela absorve o impacto e protege seu braço.'],
  ['Manuseio',     'rapidez e leveza pra reagir no jogo de rede e na defesa.'],
  ['Spin',         'capacidade de gerar efeito na bola.'],
  ['Estabilidade', 'firmeza no impacto: golpes consistentes, sem torcer na mão.'],
]

export default function InsightsModal({ racket, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [glossaryOpen, setGlossaryOpen] = useState(false)
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
  const saidaDeBolaRaw = extra.saida_de_bola as string | undefined
  const saidaDeBola = saidaDeBolaRaw === 'rascunho_pendente' ? undefined : saidaDeBolaRaw
  const power = ins.power ?? 0

  const saidaChipClass = saidaDeBola === 'fácil'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : saidaDeBola === 'exigente'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-100 text-gray-600 border-gray-200'

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

          {/* Saída de bola chip + nota Potência */}
          {saidaDeBola && (
            <div className="flex flex-col gap-2 -mt-1">
              <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full border ${saidaChipClass}`}>
                Saída de bola: {saidaDeBola.charAt(0).toUpperCase() + saidaDeBola.slice(1)}
              </span>
              <div className="flex items-start gap-2 bg-aqua-light border border-aqua/20 rounded-xl px-3 py-2.5">
                <span className="text-aqua shrink-0 mt-0.5 text-sm">ℹ</span>
                <div className="flex flex-col gap-1.5">
                  <p className="text-tinta/70 text-xs leading-relaxed">
                    Potência mede o teto da raquete com swing rápido e técnico. Saída de bola mostra o quanto ela rende com swing mais suave.
                  </p>
                  {power >= 8 && saidaDeBola === 'exigente' && (
                    <p className="text-amber-700 text-xs leading-relaxed">
                      Essa só entrega a potência toda com técnica. Pra swing suave, ela rende menos que uma macia.
                    </p>
                  )}
                  {saidaDeBola === 'fácil' && (
                    <p className="text-emerald-700 text-xs leading-relaxed">
                      Rende bem mesmo com swing suave, ideal pra quem tá evoluindo.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Glossário de dimensões */}
          <div className="border border-aqua/20 rounded-xl overflow-hidden -mt-1">
            <button
              className="flex items-center justify-between w-full px-3 py-2.5 text-xs text-tinta/50 hover:text-tinta/70 transition-colors"
              onClick={() => setGlossaryOpen(o => !o)}
            >
              <span>O que significa cada dimensão?</span>
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
                className={`transition-transform duration-150 ${glossaryOpen ? 'rotate-180' : ''}`}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {glossaryOpen && (
              <div className="px-3 pb-3 flex flex-col gap-1.5 border-t border-aqua/10 pt-2.5">
                {GLOSSARY.map(([dim, desc]) => (
                  <p key={dim} className="text-xs text-tinta/60 leading-relaxed">
                    <span className="font-semibold text-tinta/80">{dim}:</span> {desc}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Nota spin */}
          {tratamentoFabrica === false && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 -mt-1">
              <span className="text-amber-500 shrink-0 mt-0.5 text-sm">ℹ</span>
              <p className="text-amber-800 text-xs leading-relaxed">
                <strong className="font-semibold">Spin:</strong> superfície lisa de fábrica. Dá pra aumentar com areado aplicado depois da compra.
              </p>
            </div>
          )}

          {/* Perfil resumo */}
          {ins.perfil_resumo && (
            <div className="bg-aqua-light rounded-xl p-4">
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
