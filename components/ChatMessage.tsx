import Image from 'next/image'
import RacketCard from './RacketCard'
import { RecommendedRacket } from '@/lib/recommend'

interface Props {
  role: 'user' | 'assistant'
  content: string
  recommendations?: RecommendedRacket[]
  loading?: boolean
  showTury?: boolean
}

// Dimensões nativas dos PNGs para srcset correto
const TURY = {
  saludando:  { src: '/tury-saludando.png',  nW: 400, nH: 298, alt: 'Tury saludando'  },
  pensando:   { src: '/tury-pensando.png',   nW: 297, nH: 296, alt: 'Tury pensando'   },
  explicando: { src: '/tury-explicando.png', nW: 286, nH: 276, alt: 'Tury explicando' },
  apenada:    { src: '/tury-apenada.png',    nW: 289, nH: 275, alt: 'Tury triste'     },
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

export default function ChatMessage({ role, content, recommendations, loading = false, showTury = false }: Props) {
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
            <span style={{ whiteSpace: 'pre-wrap' }}>{renderText(content)}</span>
          )}
        </div>
      </div>

      {/* RacketCards — explicando (58px) + gap-2 (8px) = 66px de indent */}
      {isAssistant && hasRecs && (
        <div className="mt-3 flex flex-col gap-3 pl-[68px] w-full">
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
      )}
    </div>
  )
}
