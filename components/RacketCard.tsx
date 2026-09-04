'use client'
import { useState } from 'react'
// WARN: always sendGAEvent('event','name',params) — object form sendGAEvent({event}) is silently discarded by GA4 (v16.2.9 pushes arguments, not named args)
import { sendGAEvent } from '@next/third-parties/google'
import { RacketWithInsights } from '@/lib/recommend'
import InsightsModal from './InsightsModal'
import RacketBadgeOverlay from './RacketBadgeOverlay'
import { NIVEL_LABEL } from './SpecsGrid'
import { derivarNivel } from '@/lib/nivel'
import { getDisplayName } from '@/lib/displayName'
import { Hexagon } from '@phosphor-icons/react'

interface Props {
  racket: RacketWithInsights
  razao: string
  sessionId?: string
  calce?: { tier: 'ideal' | 'encaixa'; percent: number } | null
  custoBeneficio?: boolean
  userNivel?: 'iniciante' | 'intermediario' | 'avancado'
}

const NIVEL_ORDER: Record<string, number> = { iniciante: 0, intermediario: 1, avancado: 2 }

type ScoreDim = 'power' | 'control' | 'comfort' | 'maneuverability' | 'stability'

// Benefício em linguagem humana por faixa de score. Traduz literalmente as
// definições de lib/glossario.ts — não inventa característica nova.
function fraseConforto(v: number): string {
  if (v >= 9) return 'proteção máxima pro braço, quase sem vibração'
  return 'menos vibração, mais proteção pro braço'
}
function fraseManuseio(v: number): string {
  if (v >= 9) return 'extremamente ágil pra reagir e defender'
  return 'fácil de manejar, reage rápido nas trocas'
}
function fraseControle(v: number): string {
  if (v >= 9) return 'precisão de sobra pra colocar a bola onde quer'
  return 'bom controle pra mirar onde você quer'
}
function frasePotencia(v: number): string {
  if (v >= 9) return 'potência de sobra pra atacar sem esforço'
  return 'boa potência sem precisar forçar o braço'
}
function fraseEstabilidade(v: number): string {
  if (v >= 9) return 'muito firme, não torce nem em bolas fortes'
  return 'firme, não torce na mão'
}
const DIM_FRASE: Record<ScoreDim, (v: number) => string> = {
  comfort: fraseConforto,
  maneuverability: fraseManuseio,
  control: fraseControle,
  power: frasePotencia,
  stability: fraseEstabilidade,
}

function fireEvent(body: Record<string, unknown>) {
  const payload = JSON.stringify(body)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }))
  } else {
    fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }).catch(() => {})
  }
}

export default function RacketCard({ racket, razao, sessionId, calce, custoBeneficio, userNivel }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const hasLink  = !!(racket.affiliate_url ?? racket.source_url)
  const ctaHref  = hasLink
    ? `/ir/${racket.slug}${sessionId ? `?s=${sessionId}` : ''}`
    : null
  const linkTipo = racket.affiliate_url ? 'afiliado' : 'oficial'

  const price = racket.price
    ? `R$ ${racket.price.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
    : null

  const nameDisplay = getDisplayName(racket)

  const _athleteRaw = (racket.specs_extra as Record<string, unknown> | null)?.atleta
  const athlete: string | undefined = Array.isArray(_athleteRaw)
    ? (_athleteRaw as string[]).filter(Boolean).join(' & ') || undefined
    : typeof _athleteRaw === 'string' ? _athleteRaw : undefined

  const ins = racket.racket_insights
  // Candidate pool excludes spin (weight 0 in every scorer.ts profile — never
  // influences match_score, see lib/scorer.ts baseWeights) and forgiveness
  // (internal — agent uses it in reasoning but never shown as a visible score).
  // Threshold >=7 so the card only ever highlights an actual strength, never a
  // middling/weak score dressed up as one (24/264 rackets had a 2nd-highest
  // score <=6 under the old top-2-no-floor rule).
  const topDims = ins
    ? ([
        { dim: 'power' as const,           v: ins.power },
        { dim: 'control' as const,         v: ins.control },
        { dim: 'comfort' as const,         v: ins.comfort },
        { dim: 'maneuverability' as const, v: ins.maneuverability },
        { dim: 'stability' as const,       v: ins.stability },
      ] as { dim: ScoreDim; v: number | null }[])
        .filter((d): d is { dim: ScoreDim; v: number } => d.v != null && d.v >= 7)
        .sort((a, b) => b.v - a.v)
        .slice(0, 2)
    : []

  const handleOpenModal = () => {
    setModalOpen(true)
    sendGAEvent('event', 'analise_aberta', { racket: racket.slug })
    if (sessionId) fireEvent({ session_id: sessionId, event_type: 'ver_analise', racket_id: racket.id })
  }

  return (
    <>
      <div className="rounded-2xl bg-white overflow-hidden w-full shadow-card border border-[rgba(14,58,64,0.06)] hover:-translate-y-1 transition-all duration-200">
        {/* Imagem + badge de atleta */}
        <div className="relative h-40 bg-white flex items-center justify-center overflow-hidden shrink-0">
          {racket.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={racket.image_url}
              alt={racket.name}
              className="w-full h-full object-contain p-3"
            />
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <ellipse cx="12" cy="9.5" rx="6" ry="7.5" fill="#0CC0BE" opacity="0.3" />
              <rect x="10.5" y="16" width="3" height="7" rx="1.5" fill="#0CC0BE" opacity="0.3" />
            </svg>
          )}
          <RacketBadgeOverlay
            athlete={athlete}
            brandLogo={racket.brands?.logo_url}
            brandName={racket.brands?.name}
            brandCorner="left"
          />
          {(calce || custoBeneficio || (racket.weight_g != null && racket.weight_g >= 340)) && (
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
              {calce?.tier === 'ideal' && (
                <>
                  {/* Desktop: badge circular tipo anel de progresso */}
                  <div className="hidden md:flex flex-col items-center gap-1">
                    <div
                      className="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `conic-gradient(#FF5E3A ${calce.percent}%, rgba(255,94,58,.15) 0)` }}
                    >
                      <div className="w-[31px] h-[31px] rounded-full bg-white flex items-center justify-center">
                        <span className="font-heading font-extrabold text-coral text-[10.5px] leading-none">{calce.percent}%</span>
                      </div>
                    </div>
                    <span className="rounded-full text-[8.5px] font-bold px-2 py-[3px] bg-coral text-white leading-none whitespace-nowrap shadow-sm">
                      Calce ideal
                    </span>
                  </div>
                  {/* Mobile: pílula plana com porcentagem */}
                  <div className="md:hidden rounded-full text-[10px] font-semibold px-2.5 py-1 leading-none bg-coral text-white shadow-sm whitespace-nowrap">
                    Calce {calce.percent}%
                  </div>
                </>
              )}
              {calce?.tier === 'encaixa' && (
                <div className="rounded-full text-[10px] font-semibold px-2.5 py-1 leading-none bg-white/90 text-tinta/60 border border-aqua/40">
                  Também encaixa
                </div>
              )}
              {custoBeneficio && (
                <div className="rounded-full text-[10px] font-semibold px-2.5 py-1 leading-none bg-yellow/10 text-tinta/65 border border-yellow/30 shadow-sm">
                  Melhor custo-benefício
                </div>
              )}
              {racket.weight_g != null && racket.weight_g >= 340 && (
                <div className="rounded-full text-[10px] font-semibold px-2.5 py-1 leading-none bg-tinta/6 text-tinta/45 border border-tinta/10 shadow-sm">
                  Peso alto de fábrica
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <p className="font-heading font-semibold text-tinta text-sm leading-tight flex-1 min-w-0 truncate">{nameDisplay}</p>
            {price && (
              <span className="font-heading text-coral font-bold text-sm shrink-0">{price}</span>
            )}
          </div>

          <p className="text-tinta/65 text-xs leading-relaxed break-words">{razao}</p>

          {/* Pra quem — hide when the racket is above the user's level to avoid
              contradiction ("recomendamos esta" + "mas não é pra você"). */}
          {(() => {
            const nivel = derivarNivel(racket)
            if (!nivel) return null
            if (userNivel && (NIVEL_ORDER[nivel] ?? 0) > (NIVEL_ORDER[userNivel] ?? 0)) return null
            return (
              <p className="text-tinta/40 text-xs">
                Pra quem: <span className="text-tinta/60">{NIVEL_LABEL[nivel] ?? nivel}</span>
              </p>
            )
          })()}

          {/* Top-2 dimensões — score em destaque + benefício em linguagem humana */}
          {topDims.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {topDims.map(d => (
                <div
                  key={d.dim}
                  className="flex items-center gap-2 bg-tinta/5 rounded-full px-2.5 py-1.5 border border-tinta/10"
                >
                  <span className="bg-tinta text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0">
                    {d.v}
                  </span>
                  <span className="text-tinta text-xs">{DIM_FRASE[d.dim](d.v)}</span>
                </div>
              ))}
            </div>
          )}

          {ctaHref ? (
            <a
              href={ctaHref}
              target="_blank"
              rel={`noopener noreferrer${linkTipo === 'afiliado' ? ' sponsored' : ''}`}
              onClick={() => {
                sendGAEvent('event', linkTipo === 'afiliado' ? 'clique_afiliado' : 'clique_loja_oficial', { racket: racket.slug })
                if (sessionId) fireEvent({ session_id: sessionId, event_type: 'ver_na_loja', racket_id: racket.id })
              }}
              className="mt-1 w-full text-center rounded-full bg-coral text-white text-xs font-heading font-semibold py-2 px-3 shadow-cta hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(255,94,58,0.38)] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CC0BE] focus-visible:ring-offset-1"
            >
              Ver na loja →
            </a>
          ) : (
            <span className="mt-1 w-full text-center rounded-full bg-tinta/5 text-tinta/30 text-xs font-heading font-semibold py-2 px-3 cursor-not-allowed select-none block">
              Em breve nas lojas
            </span>
          )}

          {/* Link de análise — secundário, abaixo do CTA primário */}
          {ins && (
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 text-xs font-medium text-aqua underline underline-offset-2 hover:text-aqua/70 active:scale-[0.97] transition-colors mt-1 w-fit"
            >
              <Hexagon size={13} weight="regular" aria-hidden="true" />
              Por que essa combina? Ver radar
            </button>
          )}
        </div>
      </div>

      <InsightsModal
        racket={racket}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
