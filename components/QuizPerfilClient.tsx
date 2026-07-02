'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  PERGUNTAS,
  ARQUETIPOS,
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

// ── Barras de perfil — "Seu jogo em números" ──────────────────────────────────

const CORES_BARRAS = ['#0CC0BE', '#FF5E3A', 'rgba(14,58,64,0.3)']

function BarrasPerfil({ scores, winner }: { scores: ScoreMap; winner: ArquetipoSlug }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.25 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const top3 = (Object.entries(scores) as [ArquetipoSlug, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const maxScore = top3[0]?.[1] ?? 1

  return (
    <div ref={ref}>
      <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(14,58,64,0.5)' }}>
        Seu jogo em números
      </p>
      <div className="flex flex-col gap-3.5">
        {top3.map(([slug, score], i) => {
          const pct   = Math.round((score / maxScore) * 100)
          const nome  = ARQUETIPOS[slug].nome
          const cor   = CORES_BARRAS[i]
          const isW   = slug === winner
          const textC = i < 2 ? cor : 'rgba(14,58,64,0.38)'
          return (
            <div key={slug}>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontSize: '12px', fontWeight: isW ? 700 : 500, color: isW ? '#0E3A40' : 'rgba(14,58,64,0.6)' }}>
                  {nome}
                  {isW && (
                    <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(12,192,190,0.12)', color: '#0CC0BE' }}>
                      seu perfil
                    </span>
                  )}
                </span>
                <span className="font-mono font-bold text-xs" style={{ color: textC }}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: i < 2 ? `${cor}1A` : 'rgba(14,58,64,0.07)' }}>
                <div className="h-full rounded-full" style={{
                  width: visible ? `${pct}%` : '0%',
                  background: i < 2 ? cor : 'rgba(14,58,64,0.22)',
                  transition: `width ${0.5 + i * 0.12}s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.1}s`,
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
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

  // nameSize: escala pelo char mais longo para nunca transbordar no mobile
  const maxWordLen = Math.max(...parts.map(w => w.length))
  const nameVw     = Math.min(120 / maxWordLen, 22)
  const nameSize   = `clamp(${Math.max(28, Math.floor(nameVw * 3.6))}px, ${nameVw.toFixed(1)}vw, ${Math.floor(nameVw * 9)}px)`

  const acLabel = vis.ac === '#FFC42E' ? '#0E3A40' : vis.ac

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
    track('quiz_share_image', { arquetipo: winner, metodo: 'link' })
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
    track('quiz_share_image', { arquetipo: winner, metodo: 'story' })
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
      {/* ── HERO — compact (~40-55vh), bloco de cor + share row ─────────── */}
      <div className="relative overflow-hidden" style={bgStyle}>
        {/* Jersey number — decorativo, contido no bloco */}
        <div className="absolute bottom-0 right-0 pointer-events-none select-none" style={{ overflow: 'hidden' }} aria-hidden>
          <span className="font-heading font-bold" style={{
            fontSize: 'clamp(150px, 50vw, 380px)',
            color: vis.ac,
            opacity: 0.09,
            lineHeight: 0.82,
            display: 'block',
            marginRight: '-0.07em',
            marginBottom: '-0.1em',
          }}>{vis.numero}</span>
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col gap-4 px-7" style={{
          paddingTop: 'max(44px, env(safe-area-inset-top, 0px) + 14px)',
          paddingBottom: '8px',
        }}>
          <p className="text-xs font-bold tracking-[0.18em] uppercase" style={{ color: vis.ac }}>
            Meu Perfil de Jogo
          </p>

          <div>
            <p className="font-heading font-bold quiz-in" style={{
              fontSize: 'clamp(22px, 7vw, 42px)',
              color: vis.ac,
              opacity: 0.72,
              lineHeight: 1,
              marginBottom: '-0.05em',
              animationDelay: '0.08s',
            }}>O</p>

            {parts.map((word, i) => (
              <p key={word} className="font-heading font-bold quiz-in" style={{
                fontSize: nameSize,
                color: 'white',
                lineHeight: 0.88,
                textShadow: `3px 3px 0px ${vis.ac}`,
                animationDelay: `${0.16 + i * 0.1}s`,
              }}>{word}</p>
            ))}

            <div className="mt-3 quiz-in" style={{ animationDelay: '0.3s' }}>
              <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{
                border: `1.5px solid ${vis.ac}`,
                color: vis.ac,
                background: `${vis.ac}18`,
              }}>
                {arq.equivalente} · estilo do tênis pro
              </span>
            </div>
          </div>

          <p className="font-heading font-bold italic quiz-in" style={{
            fontSize: 'clamp(20px, 6.2vw, 36px)',
            color: 'rgba(255,255,255,0.88)',
            lineHeight: 1.22,
            animationDelay: '0.34s',
          }}>"{vis.quote}"</p>
        </div>

        {/* Share row — visível na primeira tela */}
        <div className="relative z-10 flex gap-2 px-6 pb-6 pt-4">
          <button
            onClick={handleShareStory}
            disabled={isGenerating}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-1.5"
            style={{ background: `${vis.ac}28`, color: vis.ac }}
          >
            {isGenerating
              ? <span className="animate-pulse text-xs">Gerando…</span>
              : <>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
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
            className="flex-1 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
          >
            {isGenerating
              ? <span className="animate-pulse text-xs">…</span>
              : <>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M7 1.5v7M4.5 6l2.5 2.5L9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 11.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Baixar
                </>}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M10 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM4 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M5.5 6.2l3-1.8M5.5 8l3 1.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Link
          </button>
        </div>
      </div>

      {/* ── DETALHES — descrição → barras → pontos → raquetes → CTA ──────── */}
      <div style={{ background: '#FBF6EF' }}>
        <div className="max-w-md mx-auto px-6 py-8 flex flex-col gap-5">
          {/* Descrição */}
          <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 16px rgba(14,58,64,0.07)' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(14,58,64,0.72)' }}>
              {arq.descricao}
            </p>
          </div>

          {/* Barras de perfil */}
          <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 16px rgba(14,58,64,0.07)' }}>
            <BarrasPerfil scores={scores} winner={winner} />
          </div>

          {/* Pontos Fortes */}
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

          {/* CTA + Refazer */}
          <div className="flex flex-col gap-3 pt-1">
            <Link
              href={utmUrl}
              onClick={() => track('quiz_cta_tury', { arquetipo: winner })}
              className="block text-center font-heading font-bold text-white text-base py-4 rounded-2xl transition-all hover:opacity-90 active:scale-[0.97]"
              style={{ background: '#FF5E3A', boxShadow: '0 8px 24px rgba(255,94,58,0.3)' }}
            >
              Qual raquete combina com esse perfil?
            </Link>

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
