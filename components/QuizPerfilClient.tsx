'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  PERGUNTAS,
  ARQUETIPOS,
  RADAR_AXIS_ORDER,
  MAX_SCORE_PER_AXIS,
  calcularScores,
  calcularPerfil,
  type Resposta,
  type ArquetipoSlug,
  type ScoreMap,
} from '@/lib/quiz-perfil'
import { gerarStoryPNG } from '@/lib/quiz-story'

// ── Analytics ────────────────────────────────────────────────────────────────

function track(event: string, params?: Record<string, unknown>) {
  try {
    const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag
    if (typeof g === 'function') g('event', event, params ?? {})
  } catch {}
}

// ── Radar SVG ─────────────────────────────────────────────────────────────────

const CX = 110
const CY = 110
const R_MAX = 88
const R_GRID = [0.25, 0.5, 0.75, 1]
const LABEL_R = R_MAX + 18

function axisAngle(idx: number) {
  return ((-90 + idx * 60) * Math.PI) / 180
}

function radarPoint(idx: number, ratio: number) {
  const a = axisAngle(idx)
  return { x: CX + ratio * R_MAX * Math.cos(a), y: CY + ratio * R_MAX * Math.sin(a) }
}

const AXIS_LABELS: Record<ArquetipoSlug, string> = {
  muralha:          'Muralha',
  canhao:           'Canhão',
  finalizador:      'Finalizador',
  'dono-da-rede':   'Rede',
  'contra-atacante':'C-Atacante',
  camaleao:         'Camaleão',
}

interface RadarProps {
  scores: ScoreMap
  winner?: ArquetipoSlug
}

function RadarChart({ scores, winner }: RadarProps) {
  const hexPoints = (r: number) =>
    RADAR_AXIS_ORDER.map((_, i) => {
      const a = axisAngle(i)
      return `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`
    }).join(' ')

  const dataPoints = RADAR_AXIS_ORDER.map((slug, i) => {
    const ratio = Math.min(scores[slug] / MAX_SCORE_PER_AXIS, 1)
    const p = radarPoint(i, ratio)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg
      viewBox="0 0 220 220"
      className="w-full max-w-[280px] mx-auto"
      aria-label="Radar do perfil de jogador"
      role="img"
    >
      {/* Grid */}
      {R_GRID.map((f, i) => (
        <polygon
          key={i}
          points={hexPoints(R_MAX * f)}
          fill="none"
          stroke="#0CC0BE"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
      ))}

      {/* Axes */}
      {RADAR_AXIS_ORDER.map((_, i) => {
        const p = radarPoint(i, 1)
        return (
          <line
            key={i}
            x1={CX} y1={CY} x2={p.x} y2={p.y}
            stroke="#0CC0BE" strokeOpacity={0.2} strokeWidth={1}
          />
        )
      })}

      {/* Filled area */}
      <polygon
        points={dataPoints}
        fill="#0CC0BE"
        fillOpacity={0.25}
        stroke="#0CC0BE"
        strokeWidth={2}
        style={{ transition: 'all 0.35s ease' }}
      />

      {/* Winner vertex highlight */}
      {winner && (() => {
        const idx = RADAR_AXIS_ORDER.indexOf(winner)
        const ratio = Math.min(scores[winner] / MAX_SCORE_PER_AXIS, 1)
        const p = radarPoint(idx, ratio)
        return <circle cx={p.x} cy={p.y} r={5} fill="#FF5E3A" />
      })()}

      {/* Axis labels */}
      {RADAR_AXIS_ORDER.map((slug, i) => {
        const a = axisAngle(i)
        const x = CX + LABEL_R * Math.cos(a)
        const y = CY + LABEL_R * Math.sin(a)
        const isWinner = slug === winner
        return (
          <text
            key={slug}
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={isWinner ? 9.5 : 8.5}
            fontWeight={isWinner ? '700' : '400'}
            fill={isWinner ? '#FF5E3A' : '#0E3A40'}
            fillOpacity={isWinner ? 1 : 0.5}
            fontFamily="Poppins, sans-serif"
          >
            {AXIS_LABELS[slug]}
          </text>
        )
      })}
    </svg>
  )
}

// ── Landing ───────────────────────────────────────────────────────────────────

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 px-6 text-center max-w-md mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading font-bold text-tinta text-2xl md:text-3xl leading-tight">
          Qual é o seu perfil de jogador de beach tennis?
        </h1>
        <p className="text-tinta/60 text-sm">7 perguntas · menos de 2 minutos</p>
      </div>

      <p className="text-tinta/50 text-xs leading-relaxed italic max-w-sm">
        Baseado na classificação de estilos de jogo usada no tênis profissional (ATP),
        adaptada às dinâmicas do beach tennis.
      </p>

      <button
        onClick={onStart}
        className="bg-coral text-white font-semibold text-base px-10 py-4 rounded-2xl hover:opacity-90 active:scale-[0.97] transition-all shadow-md w-full max-w-xs"
      >
        Começar
      </button>

      <p className="text-tinta/30 text-xs">Sem cadastro. Resultado na hora.</p>
    </div>
  )
}

// ── Question ──────────────────────────────────────────────────────────────────

interface QuestionProps {
  qIdx: number
  scores: ScoreMap
  onAnswer: (opt: Resposta) => void
}

function Question({ qIdx, scores, onAnswer }: QuestionProps) {
  const pergunta = PERGUNTAS[qIdx]
  const progress = ((qIdx) / PERGUNTAS.length) * 100

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-5 py-6">
      {/* Progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[11px] text-tinta/40">
          <span>{qIdx + 1} de {PERGUNTAS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-1.5 bg-aqua/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-coral rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Radar ao vivo */}
      <div className="opacity-80">
        <RadarChart scores={scores} />
      </div>

      {/* Pergunta */}
      <p className="font-heading font-bold text-tinta text-lg md:text-xl text-center leading-snug">
        {pergunta.texto}
      </p>

      {/* Chips */}
      <div className="flex flex-col gap-3">
        {pergunta.opcoes.map((opcao, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i as Resposta)}
            className="w-full text-left px-5 py-4 rounded-2xl border-2 border-aqua/20 bg-white text-tinta font-medium text-sm md:text-base hover:border-aqua hover:bg-aqua/5 active:scale-[0.98] active:bg-aqua/10 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-aqua focus-visible:ring-offset-2"
          >
            {opcao.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Result ────────────────────────────────────────────────────────────────────

interface ResultProps {
  winner: ArquetipoSlug
  scores: ScoreMap
  onReset: () => void
}

function Result({ winner, scores, onReset }: ResultProps) {
  const arquetipo = ARQUETIPOS[winner]
  const utmUrl = `/?utm_source=quiz&utm_medium=perfil&utm_campaign=${winner}`

  const [isGenerating, setIsGenerating] = useState(false)
  const [storyBlob, setStoryBlob] = useState<Blob | null>(null)

  const handleShare = () => {
    const url = 'https://www.turaquete.com.br/perfil'
    const title = `Descobri que meu perfil de jogador é ${arquetipo.nome}!`
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title, url }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(url).catch(() => {})
    }
  }

  const getBlob = async (): Promise<Blob> => {
    if (storyBlob) return storyBlob
    setIsGenerating(true)
    try {
      const blob = await gerarStoryPNG(winner, scores)
      setStoryBlob(blob)
      return blob
    } finally {
      setIsGenerating(false)
    }
  }

  const triggerDownload = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meu-perfil-${winner}.png`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 100)
  }

  const handleShareStory = async () => {
    if (isGenerating) return
    track('quiz_share_image', { arquetipo: winner, metodo: 'share' })
    try {
      const blob = await getBlob()
      const file = new File([blob], `meu-perfil-${winner}.png`, { type: 'image/png' })
      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Meu perfil de jogo', text: 'Descubra o seu: turaquete.com.br/perfil' })
      } else {
        triggerDownload(blob)
      }
    } catch { /* user cancelled or generation failed */ }
  }

  const handleDownload = async () => {
    if (isGenerating) return
    track('quiz_share_image', { arquetipo: winner, metodo: 'download' })
    try {
      const blob = await getBlob()
      triggerDownload(blob)
    } catch { /* generation failed */ }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto px-5 py-6">
      {/* Arquetipo */}
      <div className="text-center flex flex-col gap-1">
        <span className="text-xs font-medium text-aqua bg-aqua/10 rounded-full px-3 py-1 w-fit mx-auto">
          {arquetipo.equivalente}
        </span>
        <h2 className="font-heading font-bold text-tinta text-3xl md:text-4xl leading-tight">
          {arquetipo.nome}
        </h2>
      </div>

      {/* Radar final */}
      <RadarChart scores={scores} winner={winner} />

      {/* Descrição */}
      <p className="text-tinta/70 text-sm md:text-base leading-relaxed text-center">
        {arquetipo.descricao}
      </p>

      {/* Pontos fortes */}
      <div className="bg-aqua/5 rounded-2xl p-4 flex flex-col gap-2.5">
        <p className="text-xs font-semibold text-aqua uppercase tracking-wide">Pontos fortes</p>
        {arquetipo.pontosFortres.map((pf, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5" aria-hidden="true">
              <circle cx="8" cy="8" r="7" fill="#0CC0BE" fillOpacity="0.15" />
              <path d="M5 8l2 2 4-4" stroke="#0CC0BE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm text-tinta/80">{pf}</span>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <Link
          href={utmUrl}
          onClick={() => track('quiz_cta_tury', { arquetipo: winner })}
          className="bg-coral text-white font-semibold text-sm md:text-base py-4 rounded-2xl text-center hover:opacity-90 active:scale-[0.97] transition-all shadow-md"
        >
          Descubra qual raquete combina com esse perfil
        </Link>

        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 border-2 border-tinta/15 text-tinta/60 font-medium text-sm py-3 rounded-2xl hover:border-tinta/30 hover:text-tinta/80 active:scale-[0.97] transition-all"
          >
            Refazer o quiz
          </button>
          <button
            onClick={handleShare}
            className="flex-1 border-2 border-aqua/30 text-aqua font-medium text-sm py-3 rounded-2xl hover:bg-aqua/5 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M10.5 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM4.5 5.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM10.5 8.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M6.3 6.4l2.4-1.4M6.3 8.6l2.4 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Compartilhar
          </button>
        </div>

        {/* Story image — generate on demand, cache blob */}
        <div className="flex gap-3 pt-1 border-t border-tinta/8">
          <button
            onClick={handleShareStory}
            disabled={isGenerating}
            className="flex-1 border-2 border-tinta/25 bg-tinta/5 text-tinta font-semibold text-sm py-3 rounded-2xl hover:bg-tinta/10 active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="animate-pulse">Gerando...</span>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect x="2.5" y="1" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="4" y="3.5" width="6" height="4.5" rx="0.75" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="4" y1="9.5" x2="10" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Story
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1 border-2 border-tinta/15 text-tinta/60 font-medium text-sm py-3 rounded-2xl hover:border-tinta/30 hover:text-tinta/80 active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="animate-pulse">Gerando...</span>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1.5v7M4.5 6l2.5 2.5L9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 11.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Baixar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function QuizPerfilClient() {
  const [phase, setPhase] = useState<'landing' | 'quiz' | 'result'>('landing')
  const [qIdx, setQIdx] = useState(0)
  const [respostas, setRespostas] = useState<Resposta[]>([])

  const scores = calcularScores(respostas)

  const handleStart = useCallback(() => {
    track('quiz_start')
    setPhase('quiz')
    setQIdx(0)
    setRespostas([])
  }, [])

  const handleAnswer = useCallback((opt: Resposta) => {
    const next = [...respostas, opt]
    setRespostas(next)
    if (next.length === PERGUNTAS.length) {
      const winner = calcularPerfil(next)
      track('quiz_complete', { arquetipo: winner })
      setPhase('result')
    } else {
      setQIdx(q => q + 1)
    }
  }, [respostas])

  const handleReset = useCallback(() => {
    setPhase('landing')
    setQIdx(0)
    setRespostas([])
  }, [])

  if (phase === 'landing') return <Landing onStart={handleStart} />
  if (phase === 'quiz') return <Question qIdx={qIdx} scores={scores} onAnswer={handleAnswer} />
  const winner = calcularPerfil(respostas)
  return <Result winner={winner} scores={scores} onReset={handleReset} />
}
