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
import { QUIZ_RAQUETES, type QuizRaqueteCard } from '@/lib/quiz-raquetes'

// ── Analytics ─────────────────────────────────────────────────────────────────

function track(event: string, params?: Record<string, unknown>) {
  try {
    const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag
    if (typeof g === 'function') g('event', event, params ?? {})
  } catch {}
}

// ── Visual identity per archetype (mirrors quiz-story.ts) ─────────────────────

const VIS: Record<ArquetipoSlug, {
  bg: string
  ac: string
  numero: string
  quote: string
  grad?: true
}> = {
  muralha:           { bg: '#0E3A40', ac: '#0CC0BE', numero: '00', quote: 'Comigo não passa.'            },
  'contra-atacante': { bg: '#087F7D', ac: '#FFC42E', numero: '07', quote: 'Deixa vir.'                   },
  canhao:            { bg: '#E8492A', ac: '#FFC42E', numero: '09', quote: 'Se subiu, desceu.'             },
  'dono-da-rede':    { bg: '#0E3A40', ac: '#FF5E3A', numero: '01', quote: 'A rede tem dono.'              },
  finalizador:       { bg: '#143C46', ac: '#FFC42E', numero: '10', quote: 'Ponto curto, papo reto.'       },
  camaleao:          { bg: '#0E3A40', ac: '#FFC42E', numero: '23', quote: 'Eu jogo o jogo que o jogo pede.', grad: true },
}

// Poster name split per archetype
const NAME_PARTS: Record<ArquetipoSlug, string[]> = {
  muralha:           ['MURALHA'],
  'contra-atacante': ['CONTRA-', 'ATACANTE'],
  canhao:            ['CANHÃO'],
  'dono-da-rede':    ['DONO', 'DA REDE'],
  finalizador:       ['FINALIZADOR'],
  camaleao:          ['CAMALEÃO'],
}

// ── Radar SVG ─────────────────────────────────────────────────────────────────

const CX = 110, CY = 110, R_MAX = 88, LABEL_R = R_MAX + 18
const R_GRID = [0.25, 0.5, 0.75, 1]
const AXIS_LABELS: Record<ArquetipoSlug, string> = {
  muralha: 'Muralha', canhao: 'Canhão', finalizador: 'Finalizador',
  'dono-da-rede': 'Rede', 'contra-atacante': 'C-Atacante', camaleao: 'Camaleão',
}

function axisAngle(i: number) { return ((-90 + i * 60) * Math.PI) / 180 }
function radarPt(i: number, r: number) {
  const a = axisAngle(i)
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

function RadarChart({ scores, winner, ac }: { scores: ScoreMap; winner?: ArquetipoSlug; ac: string }) {
  const hexPts = (r: number) =>
    RADAR_AXIS_ORDER.map((_, i) => {
      const a = axisAngle(i)
      return `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`
    }).join(' ')

  const dataPts = RADAR_AXIS_ORDER.map((slug, i) => {
    const ratio = Math.min(scores[slug] / MAX_SCORE_PER_AXIS, 1)
    const p = radarPt(i, ratio * R_MAX)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[200px] mx-auto" aria-label="Radar do perfil" role="img">
      {R_GRID.map((f, i) => (
        <polygon key={i} points={hexPts(R_MAX * f)} fill="none" stroke={ac} strokeOpacity={0.2} strokeWidth={1} />
      ))}
      {RADAR_AXIS_ORDER.map((_, i) => {
        const p = radarPt(i, R_MAX)
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke={ac} strokeOpacity={0.25} strokeWidth={1} />
      })}
      <polygon
        points={dataPts}
        fill={ac} fillOpacity={0.3}
        stroke={ac} strokeWidth={2}
        style={{ transition: 'all 0.4s ease' }}
      />
      {winner && (() => {
        const idx = RADAR_AXIS_ORDER.indexOf(winner)
        const ratio = Math.min(scores[winner] / MAX_SCORE_PER_AXIS, 1)
        const p = radarPt(idx, ratio * R_MAX)
        return <circle cx={p.x} cy={p.y} r={6} fill="white" fillOpacity={0.9} />
      })()}
      {RADAR_AXIS_ORDER.map((slug, i) => {
        const a = axisAngle(i), x = CX + LABEL_R * Math.cos(a), y = CY + LABEL_R * Math.sin(a)
        const isW = slug === winner
        return (
          <text key={slug} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize={isW ? 9.5 : 8} fontWeight={isW ? '700' : '400'}
            fill="white" fillOpacity={isW ? 1 : 0.55}>
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
    <div className="relative min-h-dvh flex flex-col overflow-hidden quiz-in" style={{ background: '#0E3A40' }}>
      {/* Giant "?" jersey bg */}
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none select-none" aria-hidden>
        <span className="font-heading font-bold" style={{
          fontSize: 'clamp(280px, 78vw, 580px)',
          color: '#0CC0BE',
          opacity: 0.055,
          lineHeight: 1,
          marginRight: '-0.1em',
        }}>?</span>
      </div>

      {/* Back */}
      <div className="relative z-10 pt-5 px-6">
        <Link href="/" className="text-sm font-medium transition-opacity hover:opacity-70" style={{ color: 'rgba(12,192,190,0.65)' }}>
          ← Voltar
        </Link>
      </div>

      {/* Main */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-8 pb-10 gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#0CC0BE' }}>
            Turaquete · Beach Tennis
          </p>
          <h1 className="font-heading font-bold text-white leading-tight" style={{ fontSize: 'clamp(28px, 8.5vw, 48px)' }}>
            Qual é o seu perfil de jogador?
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
            Baseado na classificação de estilos do tênis profissional (ATP), adaptada ao beach tennis.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['7 perguntas', '~2 minutos', 'Sem cadastro'].map(b => (
            <span key={b} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{
              border: '1.5px solid rgba(12,192,190,0.22)',
              color: '#0CC0BE',
              background: 'rgba(12,192,190,0.07)',
            }}>{b}</span>
          ))}
        </div>

        <button
          onClick={onStart}
          className="font-heading font-bold text-white text-lg py-4 px-8 rounded-2xl w-full max-w-sm transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ background: '#FF5E3A', boxShadow: '0 8px 32px rgba(255,94,58,0.45), 0 2px 8px rgba(255,94,58,0.3)' }}
        >
          Descobrir meu perfil
        </button>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Resultado na hora · Grátis
        </p>
      </div>
    </div>
  )
}

// ── Question ──────────────────────────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C']

function Question({
  qIdx,
  onAnswer,
  selected,
}: {
  qIdx: number
  onAnswer: (opt: Resposta) => void
  selected: number | null
}) {
  const q = PERGUNTAS[qIdx]
  const total = PERGUNTAS.length
  const pct = Math.round((qIdx / total) * 100)

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#FBF6EF' }}>
      {/* Progress header */}
      <div className="pt-5 px-6 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-medium transition-opacity hover:opacity-60" style={{ color: 'rgba(14,58,64,0.3)' }}>
            ← Voltar
          </Link>
          <span className="font-heading font-bold text-xs" style={{ color: '#0CC0BE' }}>
            {qIdx + 1}
            <span style={{ color: 'rgba(14,58,64,0.28)', fontWeight: 400 }}> / {total}</span>
          </span>
        </div>

        {/* Thin progress bar */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(12,192,190,0.1)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #0CC0BE 0%, #0CC0BE 55%, #FF5E3A 100%)',
              transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
        </div>

        {/* Segment dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                height: '3px',
                flex: i === qIdx ? '2.5' : '1',
                background: i < qIdx ? '#0CC0BE' : i === qIdx ? '#FF5E3A' : 'rgba(14,58,64,0.1)',
                transition: 'flex 0.4s ease, background 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Question + options */}
      <div className="flex-1 flex flex-col px-6 pb-8 gap-6">
        <div className="quiz-slide" style={{ animationDelay: '0.04s' }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FF5E3A', opacity: 0.6 }}>
            Pergunta {qIdx + 1}
          </span>
          <h2
            className="font-heading font-bold mt-2 leading-snug"
            style={{ fontSize: 'clamp(20px, 5.8vw, 28px)', color: '#0E3A40' }}
          >
            {q.texto}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {q.opcoes.map((opcao, i) => {
            const isSel = selected === i
            const isDim = selected !== null && !isSel
            return (
              <button
                key={i}
                onClick={() => selected === null && onAnswer(i as Resposta)}
                disabled={selected !== null}
                className="w-full text-left rounded-2xl quiz-slide"
                style={{
                  animationDelay: `${0.08 + i * 0.06}s`,
                  border: isSel ? '2.5px solid #0CC0BE' : '2px solid rgba(14,58,64,0.09)',
                  background: isSel ? 'rgba(12,192,190,0.09)' : 'white',
                  boxShadow: isSel
                    ? '0 0 0 4px rgba(12,192,190,0.1), 0 4px 16px rgba(14,58,64,0.07)'
                    : '0 2px 8px rgba(14,58,64,0.05)',
                  opacity: isDim ? 0.3 : 1,
                  transform: isSel ? 'scale(0.983)' : 'scale(1)',
                  transition: 'opacity 0.2s ease, transform 0.2s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                  cursor: selected !== null ? 'default' : 'pointer',
                }}
              >
                <div className="flex items-center gap-4 p-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-heading font-bold text-sm"
                    style={{
                      background: isSel ? '#0CC0BE' : 'rgba(12,192,190,0.08)',
                      color: isSel ? 'white' : '#0CC0BE',
                      transition: 'background 0.15s ease, color 0.15s ease',
                    }}
                  >
                    {LETTERS[i]}
                  </div>
                  <span className="font-medium text-sm leading-snug" style={{ color: '#0E3A40' }}>
                    {opcao.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Raquetes Section ──────────────────────────────────────────────────────────

function RaquetesMiniCard({ card, winner }: { card: QuizRaqueteCard; winner: ArquetipoSlug }) {
  const price = card.price
    ? `R$ ${card.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
    : null

  const handleClick = () => {
    track('quiz_raquete_click', { arquetipo: winner, racket_slug: card.slug })
  }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{
      background: 'white',
      border: '1px solid rgba(14,58,64,0.07)',
      boxShadow: '0 2px 10px rgba(14,58,64,0.06)',
    }}>
      {/* Image */}
      <div className="relative h-28 flex items-center justify-center bg-white px-2 pt-2">
        {card.custoBeneficio && (
          <div className="absolute top-2 right-2 z-10">
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full leading-none" style={{
              background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A',
            }}>
              Custo-benefício
            </span>
          </div>
        )}
        {card.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.image_url} alt={card.name} className="w-full h-full object-contain" />
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
            <ellipse cx="12" cy="9.5" rx="6" ry="7.5" fill="#0CC0BE" opacity="0.3" />
            <rect x="10.5" y="16" width="3" height="7" rx="1.5" fill="#0CC0BE" opacity="0.3" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <div>
          <p className="font-heading font-semibold text-xs leading-tight" style={{ color: '#0E3A40' }}>{card.name}</p>
          <p className="text-xs" style={{ color: 'rgba(14,58,64,0.45)' }}>{card.marca}</p>
        </div>

        {price && (
          <p className="font-heading font-bold text-xs" style={{ color: '#FF5E3A' }}>{price}</p>
        )}

        {card.destaques.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.destaques.map(d => (
              <span key={d.label} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{
                background: '#FBF6EF', color: '#0E3A40', border: '1px solid rgba(12,192,190,0.2)',
              }}>
                {d.label} {d.v}
              </span>
            ))}
          </div>
        )}

        <a
          href={`/ir/${card.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="mt-auto block text-center rounded-xl text-xs font-heading font-semibold py-2 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: '#FF5E3A', color: 'white' }}
        >
          Ver na loja →
        </a>
      </div>
    </div>
  )
}

function RaquetesSection({ winner }: { winner: ArquetipoSlug }) {
  const cards = QUIZ_RAQUETES[winner] ?? []
  if (cards.length === 0) return null

  return (
    <div>
      <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(14,58,64,0.5)' }}>
        Raquetes que combinam com esse estilo
      </p>

      <div className="grid grid-cols-3 gap-2.5">
        {cards.map(card => (
          <RaquetesMiniCard key={card.slug} card={card} winner={winner} />
        ))}
      </div>

      <p className="text-xs mt-3 leading-relaxed text-center" style={{ color: 'rgba(14,58,64,0.45)' }}>
        Essas combinam com o estilo. Pra uma recomendação exata pro seu nível e pro seu braço, fala com a Tury.
      </p>
    </div>
  )
}

// ── Result ────────────────────────────────────────────────────────────────────

function Result({ winner, scores, onReset }: { winner: ArquetipoSlug; scores: ScoreMap; onReset: () => void }) {
  const vis   = VIS[winner]
  const arq   = ARQUETIPOS[winner]
  const parts = NAME_PARTS[winner]
  const utmUrl = `/?utm_source=quiz&utm_medium=perfil&utm_campaign=${winner}`

  const [isGenerating, setIsGenerating] = useState(false)
  const [storyBlob, setStoryBlob]       = useState<Blob | null>(null)

  const bgStyle = vis.grad
    ? { background: 'linear-gradient(160deg, #0CC0BE 0%, #0E3A40 58%)' }
    : { background: vis.bg }

  const isMulti  = parts.length > 1
  const nameSize = `clamp(${isMulti ? '44px' : '62px'}, ${isMulti ? '14vw' : '20vw'}, ${isMulti ? '92px' : '122px'})`

  const acLabel = vis.ac === '#FFC42E' ? '#0E3A40' : vis.ac

  const armasCards = QUIZ_RAQUETES[winner] ?? []
  const armasLine  = armasCards.map(c => c.nome_curto).filter(Boolean).join(' · ')

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
    const a   = document.createElement('a')
    a.href = url; a.download = `meu-perfil-${winner}.png`; a.style.display = 'none'
    document.body.appendChild(a); a.click()
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 100)
  }

  const handleShare = () => {
    const url   = 'https://www.turaquete.com.br/perfil'
    const title = `Descobri que meu perfil de jogador é ${arq.nome}!`
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title, url }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(url).catch(() => {})
    }
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
    } catch { /* cancelled or unsupported */ }
  }

  const handleDownload = async () => {
    if (isGenerating) return
    track('quiz_share_image', { arquetipo: winner, metodo: 'download' })
    try { const blob = await getBlob(); triggerDownload(blob) } catch { /* failed */ }
  }

  return (
    <div className="quiz-result">
      {/* ── HERO — screenshot zone ───────────────────────────────────────── */}
      <div className="relative overflow-hidden flex flex-col" style={{ ...bgStyle, minHeight: '100dvh' }}>
        {/* Jersey number — mid-right, behind quote area */}
        <div className="absolute pointer-events-none select-none" style={{
          top: '38%', right: 0, bottom: 0, overflow: 'hidden',
        }} aria-hidden>
          <span className="font-heading font-bold" style={{
            fontSize: 'clamp(200px, 60vw, 480px)',
            color: vis.ac,
            opacity: 0.10,
            lineHeight: 0.82,
            display: 'block',
            marginRight: '-0.07em',
          }}>{vis.numero}</span>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col" style={{ minHeight: '100dvh' }}>
          {/* Header */}
          <div className="pt-12 px-7">
            <p className="text-xs font-bold tracking-[0.18em] uppercase" style={{ color: vis.ac }}>
              Meu Perfil de Jogo
            </p>
          </div>

          {/* Name + badge + quote — flows from top, no centering */}
          <div className="px-7 mt-5">
            {/* "O" tight above name */}
            <p className="font-heading font-bold quiz-in" style={{
              fontSize: 'clamp(36px, 10vw, 52px)',
              color: vis.ac,
              opacity: 0.75,
              lineHeight: 1,
              marginBottom: '-0.08em',
              animationDelay: '0.12s',
            }}>O</p>

            {parts.map((word, i) => (
              <p key={word} className="font-heading font-bold quiz-in" style={{
                fontSize: nameSize,
                color: 'white',
                lineHeight: 0.88,
                textShadow: `4px 4px 0px ${vis.ac}`,
                animationDelay: `${0.2 + i * 0.1}s`,
              }}>{word}</p>
            ))}

            {/* Badge */}
            <div className="mt-5 mb-6 quiz-in" style={{ animationDelay: '0.34s' }}>
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold" style={{
                border: `1.5px solid ${vis.ac}`,
                color: vis.ac,
                background: `${vis.ac}18`,
              }}>
                {arq.equivalente} · estilo do tênis pro
              </span>
            </div>

            {/* Quote — segunda voz, grande */}
            <p className="font-heading font-bold italic quiz-in" style={{
              fontSize: 'clamp(22px, 6.5vw, 36px)',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.25,
              animationDelay: '0.4s',
            }}>"{vis.quote}"</p>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom zone: minhas armas + hook + URL */}
          <div className="px-7 pb-14 flex flex-col gap-2">
            {armasLine && (
              <p className="text-xs overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.62)' }}>
                <span style={{ color: vis.ac, fontWeight: 600 }}>Minhas armas: </span>
                {armasLine}
              </p>
            )}
            <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>
              E você, joga como? · turaquete.com.br/perfil
            </p>
          </div>
        </div>
      </div>

      {/* ── SECOND SECTION — detail + CTAs ──────────────────────────────── */}
      <div style={{ background: '#FBF6EF' }}>
        <div className="max-w-md mx-auto px-6 py-8 flex flex-col gap-5">
          {/* Description */}
          <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 16px rgba(14,58,64,0.07)' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(14,58,64,0.72)' }}>
              {arq.descricao}
            </p>
          </div>

          {/* Radar — detalhe técnico */}
          <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 16px rgba(14,58,64,0.07)' }}>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: acLabel, opacity: 0.5 }}>
              Radar do perfil
            </p>
            <RadarChart scores={scores} winner={winner} ac={acLabel === '#0E3A40' ? '#0CC0BE' : acLabel} />
          </div>

          {/* Strengths */}
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-2.5" style={{ color: acLabel, opacity: 0.6 }}>
              Pontos Fortes
            </p>
            <div className="flex flex-col gap-2">
              {arq.pontosFortres.map((pf, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{
                  background: 'white',
                  border: '1px solid rgba(14,58,64,0.07)',
                  boxShadow: '0 1px 4px rgba(14,58,64,0.04)',
                }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: vis.ac === '#FFC42E' ? '#0CC0BE' : vis.ac }} />
                  <span className="text-sm font-medium" style={{ color: '#0E3A40' }}>{pf}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Raquetes que combinam */}
          <RaquetesSection winner={winner} />

          {/* CTAs */}
          <div className="flex flex-col gap-3 pt-1">
            <Link
              href={utmUrl}
              onClick={() => track('quiz_cta_tury', { arquetipo: winner })}
              className="block text-center font-heading font-bold text-white text-base py-4 rounded-2xl transition-all hover:opacity-90 active:scale-[0.97]"
              style={{ background: '#FF5E3A', boxShadow: '0 8px 24px rgba(255,94,58,0.3)' }}
            >
              Qual raquete combina com esse perfil?
            </Link>

            <div className="flex gap-2.5">
              <button
                onClick={handleShareStory}
                disabled={isGenerating}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: vis.bg, color: vis.ac }}
              >
                {isGenerating ? <span className="animate-pulse text-xs">Gerando...</span> : <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <rect x="2.5" y="1" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                    <rect x="4" y="3.5" width="6" height="4.5" rx="0.75" stroke="currentColor" strokeWidth="1.2"/>
                    <line x1="4" y1="9.5" x2="10" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  Story
                </>}
              </button>
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex-1 py-3 rounded-2xl font-medium text-sm transition-all active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'white', border: '1.5px solid rgba(14,58,64,0.1)', color: '#0E3A40' }}
              >
                {isGenerating ? <span className="animate-pulse text-xs">...</span> : <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M7 1.5v7M4.5 6l2.5 2.5L9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 11.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Baixar
                </>}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 py-3 rounded-2xl font-medium text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                style={{ background: 'white', border: '1.5px solid rgba(14,58,64,0.1)', color: '#0E3A40' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M10 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM4 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M5.5 6.2l3-1.8M5.5 8l3 1.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Link
              </button>
            </div>

            <button
              onClick={onReset}
              className="text-center text-sm font-medium py-2 transition-all hover:opacity-60"
              style={{ color: 'rgba(14,58,64,0.28)' }}
            >
              Refazer o quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function QuizPerfilClient() {
  const [phase, setPhase]       = useState<'landing' | 'quiz' | 'result'>('landing')
  const [qIdx, setQIdx]         = useState(0)
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [selected, setSelected]   = useState<number | null>(null)

  const scores = calcularScores(respostas)

  const handleStart = useCallback(() => {
    track('quiz_start')
    setPhase('quiz')
    setQIdx(0)
    setRespostas([])
    setSelected(null)
  }, [])

  const handleAnswer = useCallback((opt: Resposta) => {
    if (selected !== null) return
    setSelected(opt)
    setTimeout(() => {
      const next = [...respostas, opt]
      setRespostas(next)
      setSelected(null)
      if (next.length === PERGUNTAS.length) {
        const winner = calcularPerfil(next)
        track('quiz_complete', { arquetipo: winner })
        setPhase('result')
      } else {
        setQIdx(q => q + 1)
      }
    }, 380)
  }, [respostas, selected])

  const handleReset = useCallback(() => {
    setPhase('landing')
    setQIdx(0)
    setRespostas([])
    setSelected(null)
  }, [])

  if (phase === 'landing') return <Landing onStart={handleStart} />
  if (phase === 'quiz') {
    return (
      <Question
        key={qIdx}
        qIdx={qIdx}
        onAnswer={handleAnswer}
        selected={selected}
      />
    )
  }
  const winner = calcularPerfil(respostas)
  return <Result winner={winner} scores={scores} onReset={handleReset} />
}
