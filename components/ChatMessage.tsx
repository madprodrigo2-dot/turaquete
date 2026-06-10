import Image from 'next/image'
import RacketCard from './RacketCard'
import { RecommendedRacket } from '@/lib/recommend'

interface Props {
  role: 'user' | 'assistant'
  content: string
  recommendations?: RecommendedRacket[]
  loading?: boolean
}

function renderText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : part
  )
}

export default function ChatMessage({ role, content, recommendations, loading = false }: Props) {
  const isAssistant = role === 'assistant'

  return (
    <div className={`flex flex-col w-full msg-enter ${isAssistant ? 'items-start' : 'items-end'}`}>

      {/* Bubble row — avatar + message */}
      <div className="flex items-end gap-2">

        {/* Avatar do agente */}
        {isAssistant && (
          <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-tinta">
            <Image
              src="/turaquete-favicon.png"
              alt="Turaquete"
              width={28}
              height={28}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Burbuja */}
        <div
          className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm md:text-[15px] leading-relaxed
            ${isAssistant
              ? 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
              : 'bg-emerald-600 text-white rounded-tr-sm'
            }`}
        >
          {loading ? (
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="bt-ball" />
              <span className="bt-ball" />
              <span className="bt-ball" />
            </div>
          ) : (
            <span style={{ whiteSpace: 'pre-wrap' }}>{renderText(content)}</span>
          )}
        </div>
      </div>

      {/* RacketCards — escalonadas sob a burbuja */}
      {isAssistant && recommendations && recommendations.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 w-full max-w-sm ml-9">
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
