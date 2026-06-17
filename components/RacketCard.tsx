'use client'
import { useState } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { RacketWithInsights } from '@/lib/recommend'
import InsightsModal from './InsightsModal'
import AthleteBadge from './AthleteBadge'
import { NIVEL_LABEL } from './SpecsGrid'
import { derivarNivel } from '@/lib/nivel'

interface Props {
  racket: RacketWithInsights
  razao: string
  sessionId?: string
  calce?: 'ideal' | 'encaixa' | null
  custoBeneficio?: boolean
}

function fireEvent(body: Record<string, unknown>) {
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export default function RacketCard({ racket, razao, sessionId, calce, custoBeneficio }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const hasLink  = !!(racket.affiliate_url ?? racket.source_url)
  const ctaHref  = hasLink ? `/ir/${racket.slug}` : null
  const linkTipo = racket.affiliate_url ? 'afiliado' : 'oficial'

  const price = racket.price
    ? `R$ ${racket.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
    : null

  const nameDisplay = racket.model_year && !racket.name.includes(String(racket.model_year))
    ? `${racket.name} ${racket.model_year}`
    : racket.name

  const athlete = (racket.specs_extra as Record<string, unknown> | null)?.atleta as string | undefined

  const ins = racket.racket_insights
  const topDims = ins
    ? [
        { label: 'Potência',     v: ins.power           },
        { label: 'Controle',     v: ins.control         },
        { label: 'Conforto',     v: ins.comfort         },
        { label: 'Manuseio',     v: ins.maneuverability },
        { label: 'Spin',         v: ins.spin            },
        { label: 'Estabilidade', v: ins.stability       },
        // forgiveness is internal — agent uses it in reasoning but never shown as a visible score
      ]
        .filter(d => d.v != null)
        .sort((a, b) => (b.v as number) - (a.v as number))
        .slice(0, 2)
    : []

  const handleOpenModal = () => {
    setModalOpen(true)
    sendGAEvent({ event: 'analise_aberta', racket: racket.slug })
    if (sessionId) fireEvent({ session_id: sessionId, event_type: 'ver_analise', racket_id: racket.id })
  }

  return (
    <>
      <div className="rounded-2xl border border-aqua/12 bg-white shadow-sm overflow-hidden w-full hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
        {/* Imagem + badge de atleta */}
        <div className="relative h-40 bg-gradient-to-b from-gray-50 to-gray-50/60 flex items-center justify-center overflow-hidden shrink-0">
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
          {athlete && (
            <div className="absolute top-2 left-2 z-10">
              <AthleteBadge athlete={athlete} />
            </div>
          )}
          {(calce || custoBeneficio) && (
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
              {calce && (
                <div className={`rounded-full text-[10px] font-semibold px-2.5 py-1 leading-none ${
                  calce === 'ideal'
                    ? 'bg-coral text-white shadow-sm'
                    : 'bg-white/90 text-tinta/60 border border-aqua/40'
                }`}>
                  {calce === 'ideal' ? 'Calce ideal' : 'Também encaixa'}
                </div>
              )}
              {custoBeneficio && (
                <div className="rounded-full text-[10px] font-semibold px-2.5 py-1 leading-none bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                  Melhor custo-benefício
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

          <p className="text-gray-600 text-xs leading-relaxed break-words">{razao}</p>

          {/* Pra quem */}
          {(() => {
            const nivel = derivarNivel(racket)
            return nivel ? (
              <p className="text-tinta/40 text-xs">
                Pra quem: <span className="text-tinta/60">{NIVEL_LABEL[nivel] ?? nivel}</span>
              </p>
            ) : null
          })()}

          {/* Top-2 dimensões */}
          {topDims.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-tinta/40 text-xs">Destaques:</span>
              {topDims.map(d => (
                <span
                  key={d.label}
                  className="bg-aqua/[0.08] text-tinta text-xs font-semibold px-2 py-0.5 rounded-full border border-aqua/20"
                >
                  {d.label} {d.v}
                </span>
              ))}
            </div>
          )}

          {ctaHref ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                sendGAEvent({ event: linkTipo === 'afiliado' ? 'clique_afiliado' : 'clique_loja_oficial', racket: racket.slug })
                if (sessionId) fireEvent({ session_id: sessionId, event_type: 'ver_na_loja', racket_id: racket.id })
              }}
              className="mt-1 w-full text-center rounded-lg bg-coral text-white text-xs font-heading font-semibold py-2 px-3 hover:scale-[1.02] hover:shadow-[0_4px_16px_rgba(255,94,58,0.30)] active:scale-[0.98] transition-all"
            >
              Ver na loja →
            </a>
          ) : (
            <span className="mt-1 w-full text-center rounded-lg bg-gray-100 text-gray-400 text-xs font-heading font-semibold py-2 px-3 cursor-not-allowed select-none block">
              Em breve nas lojas
            </span>
          )}

          {/* Botão de análise */}
          {ins && (
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 text-xs text-tinta/40 hover:text-aqua transition-colors mt-0.5 w-fit"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <polygon points="6.5,1 11.5,3.8 11.5,9.2 6.5,12 1.5,9.2 1.5,3.8"
                  stroke="currentColor" strokeWidth="1.2" fill="none" />
                <line x1="6.5" y1="4" x2="6.5" y2="9" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
                <line x1="3.7" y1="5.5" x2="9.3" y2="7.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
                <line x1="3.7" y1="7.5" x2="9.3" y2="5.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
              </svg>
              Ver análise completa
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
