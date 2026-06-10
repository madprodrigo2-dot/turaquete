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

  return (
    <div className={`flex flex-col w-full msg-enter ${isAssistant ? 'items-start' : 'items-end'}`}>

      {/* Tury saludando — só no primeiro mensaje do agente, 90-110px */}
      {showTury && isAssistant && (
        <div className="pl-9 mb-1.5">
          <Image
            src="/tury-saludando.png"
            alt="Tury, a mascote da Turaquete, acenando boas-vindas"
            width={400}
            height={298}
            className="h-[88px] md:h-[108px] w-auto"
            style={{ width: 'auto' }}
          />
        </div>
      )}

      {/* Bubble row — avatar circular + mensagem */}
      <div className="flex items-end gap-2">

        {isAssistant && (
          <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-tinta flex items-center justify-center">
            <Image
              src="/turaquete-favicon.png"
              alt="Turaquete"
              width={22}
              height={22}
              className="object-contain"
            />
          </div>
        )}

        {/* Burbuja */}
        <div
          className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm md:text-[15px] leading-relaxed
            ${isAssistant
              ? 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
              : 'bg-tinta text-white rounded-tr-sm'
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

      {/* RacketCards — escalonadas sob a burbuja */}
      {isAssistant && recommendations && recommendations.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 pl-9 w-full">
          {recommendations.map((rec, i) => (
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
