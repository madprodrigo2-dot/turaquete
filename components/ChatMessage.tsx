import Image from 'next/image'
import RacketCard from './RacketCard'
import CompareTable from './CompareTable'
import DiagnosticoBlock from './DiagnosticoBlock'
import TermoGlossario from './TermoGlossario'
import { RecommendedRacket } from '@/lib/recommend'
import type { FaixaIdeal } from '@/lib/scorer'
import { findGlossaryMatches } from '@/lib/glossario'

interface Props {
  role: 'user' | 'assistant'
  content: string
  recommendations?: RecommendedRacket[]
  loading?: boolean
  showTury?: boolean
  suggestions?: string[]
  isComparison?: boolean
  onSuggestion?: (s: string) => void
  diagnostico?: FaixaIdeal
  disableGlossary?: boolean
}

// Dimensões nativas dos PNGs para srcset correto
const TURY = {
  saludando:  { src: '/tury-saludando.png',  nW: 343, nH: 398, alt: 'Tury saludando'  },
  pensando:   { src: '/tury-pensando.png',   nW: 291, nH: 420, alt: 'Tury pensando'   },
  explicando: { src: '/tury-explicando.png', nW: 296, nH: 376, alt: 'Tury explicando' },
  apenada:    { src: '/tury-apenada.png',    nW: 292, nH: 416, alt: 'Tury triste'     },
} as const

const ERROR_PHRASES = ['Ops,', 'problema de conexão', 'não consegui processar']

function getPose(loading: boolean, isFirst: boolean, hasRecs: boolean, content: string) {
  if (loading)                                              return { p: TURY.pensando,   h: 60 }
  if (isFirst)                                             return { p: TURY.saludando,   h: 88 }
  if (hasRecs)                                             return { p: TURY.explicando,  h: 56 }
  if (ERROR_PHRASES.some(e => content.includes(e)))        return { p: TURY.apenada,     h: 44 }
  return null
}

function renderText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : part
  )
}

function renderAssistantText(text: string): React.ReactNode {
  const boldParts = text.split(/(\*\*[^*\n]+\*\*)/g)
  const trackedTerms = new Set<string>()
  const nodes: React.ReactNode[] = []

  boldParts.forEach((part, bi) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={`b${bi}`} className="font-semibold">{part.slice(2, -2)}</strong>)
      return
    }

    const matches = findGlossaryMatches(part, trackedTerms)
    if (matches.length === 0) {
      nodes.push(part)
      return
    }

    let cursor = 0
    matches.forEach((m, mi) => {
      if (m.start > cursor) nodes.push(part.slice(cursor, m.start))
      nodes.push(
        <TermoGlossario key={`g${bi}-${mi}`} entry={m.entry}>
          {m.matched}
        </TermoGlossario>
      )
      cursor = m.end
    })
    if (cursor < part.length) nodes.push(part.slice(cursor))
  })

  return nodes
}

export default function ChatMessage({ role, content, recommendations, loading = false, showTury = false, suggestions, isComparison, onSuggestion, diagnostico, disableGlossary = false }: Props) {
  const isAssistant = role === 'assistant'
  const hasRecs = (recommendations?.length ?? 0) > 0
  const turyConfig = getPose(loading, showTury, hasRecs, content)

  return (
    <div className={`flex flex-col w-full msg-enter ${isAssistant ? 'items-start' : 'items-end'}`}>

      {/* Precarrega as outras poses na primeira mensagem — troca instantânea */}
      {showTury && isAssistant && (
        <div aria-hidden className="absolute w-0 h-0 overflow-hidden pointer-events-none">
          <Image src={TURY.pensando.src}   alt="" width={TURY.pensando.nW}   height={TURY.pensando.nH}   />
          <Image src={TURY.explicando.src} alt="" width={TURY.explicando.nW} height={TURY.explicando.nH} />
          <Image src={TURY.apenada.src}    alt="" width={TURY.apenada.nW}    height={TURY.apenada.nH}    />
        </div>
      )}

      {/* Bubble row — Tury (corpo completo, sem máscara) + burbuja */}
      <div className="flex items-end gap-2">

        {isAssistant && turyConfig && (
          <Image
            src={turyConfig.p.src}
            alt={turyConfig.p.alt}
            width={turyConfig.p.nW}
            height={turyConfig.p.nH}
            priority={showTury}
            className="flex-shrink-0 self-end"
            style={{ height: `${turyConfig.h}px`, width: 'auto' }}
          />
        )}

        {/* Burbuja */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm md:text-[15px] leading-relaxed
            ${isAssistant
              ? `${turyConfig ? 'max-w-[85%]' : 'w-full'} bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100`
              : 'max-w-[85%] bg-tinta text-white rounded-tr-sm'
            }`}
        >
          {loading ? (
            <div className="flex items-center gap-1.5 py-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/turaquete-bola.svg" alt="" className="bt-ball" width={10} height={10} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/turaquete-bola.svg" alt="" className="bt-ball" width={10} height={10} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/turaquete-bola.svg" alt="" className="bt-ball" width={10} height={10} />
            </div>
          ) : (
            <span style={{ whiteSpace: 'pre-wrap' }}>
              {isAssistant && !disableGlossary
                ? renderAssistantText(content)
                : renderText(content)
              }
            </span>
          )}
        </div>
      </div>

      {/* Diagnóstico de fitting */}
      {isAssistant && diagnostico && (
        <div className="mt-2 pl-[68px] w-full">
          <DiagnosticoBlock faixa={diagnostico} />
        </div>
      )}

      {/* RacketCards — explicando (58px) + gap-2 (8px) = 66px de indent */}
      {isAssistant && hasRecs && (
        <div className="mt-3 pl-[68px] w-full flex flex-col gap-2">
          {isComparison && <CompareTable recommendations={recommendations!} />}
          <div className={
            recommendations!.length === 2
              ? 'grid grid-cols-2 gap-2'
              : 'flex flex-col gap-3'
          }>
            {recommendations!.map((rec, i) => (
              <div
                key={rec.racket.id}
                className="msg-enter"
                style={{ animationDelay: `${60 + i * 80}ms` }}
              >
                <RacketCard racket={rec.racket} razao={rec.razao} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick reply chips */}
      {isAssistant && suggestions && suggestions.length > 0 && onSuggestion && (
        <div className="mt-2 pl-[68px] flex flex-wrap gap-2">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-aqua/40 text-tinta/70 bg-white hover:bg-aqua/10 hover:border-aqua/60 active:scale-[0.97] transition-all shadow-sm"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
