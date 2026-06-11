'use client'
import { useState } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { RacketWithInsights } from '@/lib/recommend'
import InsightsModal from './InsightsModal'

interface Props {
  racket: RacketWithInsights
  razao: string
}

export default function RacketCard({ racket, razao }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const ctaUrl   = racket.affiliate_url ?? racket.source_url ?? null
  const ctaLabel = racket.affiliate_url ? 'Ver no Mercado Livre' : 'Ver na loja'

  const price = racket.price
    ? `R$ ${racket.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
    : null

  const nameDisplay = racket.model_year && !racket.name.includes(String(racket.model_year))
    ? `${racket.name} ${racket.model_year}`
    : racket.name

  const ins = racket.racket_insights
  const topDims = ins
    ? [
        { label: 'potência',     v: ins.power           },
        { label: 'controle',     v: ins.control         },
        { label: 'conforto',     v: ins.comfort         },
        { label: 'manuseio',     v: ins.maneuverability },
        { label: 'spin',         v: ins.spin            },
        { label: 'estabilidade', v: ins.stability       },
        { label: 'perdão',       v: ins.forgiveness     },
      ]
        .filter(d => d.v != null)
        .sort((a, b) => (b.v as number) - (a.v as number))
        .slice(0, 2)
    : []

  const handleOpenModal = () => {
    setModalOpen(true)
    sendGAEvent({ event: 'analise_aberta', racket: racket.slug })
  }

  return (
    <>
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden w-full">
        {/* Imagem */}
        {racket.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={racket.image_url}
            alt={racket.name}
            className="w-full h-40 object-contain bg-gray-50 p-3"
          />
        ) : (
          <div className="w-full h-40 bg-gray-50 flex items-center justify-center select-none">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <ellipse cx="12" cy="9.5" rx="6" ry="7.5" fill="#0CC0BE" opacity="0.3" />
              <rect x="10.5" y="16" width="3" height="7" rx="1.5" fill="#0CC0BE" opacity="0.3" />
            </svg>
          </div>
        )}

        {/* Conteúdo */}
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <p className="font-heading font-semibold text-tinta text-sm leading-tight flex-1 min-w-0 truncate">{nameDisplay}</p>
            {price && (
              <span className="font-heading text-coral font-bold text-sm shrink-0">{price}</span>
            )}
          </div>

          <p className="text-gray-600 text-xs leading-relaxed break-words">{razao}</p>

          {/* Top-2 dimensões */}
          {topDims.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-tinta/40 text-xs">Destaques:</span>
              {topDims.map(d => (
                <span
                  key={d.label}
                  className="bg-aqua-light text-tinta text-xs font-medium px-2 py-0.5 rounded-full"
                >
                  {d.label} {d.v}
                </span>
              ))}
            </div>
          )}

          {ctaUrl && (
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 w-full text-center rounded-lg bg-coral text-white text-xs font-heading font-semibold py-2 px-3 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] transition-all"
            >
              {ctaLabel} →
            </a>
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
