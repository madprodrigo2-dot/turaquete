import RacketCard from './RacketCard'
import { RecommendedRacket } from '@/lib/recommend'

interface Props {
  role: 'user' | 'assistant'
  content: string
  recommendations?: RecommendedRacket[]
  loading?: boolean
}

export default function ChatMessage({ role, content, recommendations, loading = false }: Props) {
  const isAssistant = role === 'assistant'

  return (
    <div className={`flex flex-col w-full ${isAssistant ? 'items-start' : 'items-end'}`}>
      {/* Burbuja de texto */}
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isAssistant
            ? 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
            : 'bg-emerald-600 text-white rounded-tr-sm'
          }
          ${loading ? 'animate-pulse' : ''}`}
      >
        {loading ? (
          <span className="text-gray-400 tracking-widest">●●●</span>
        ) : (
          <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
        )}
      </div>

      {/* Tarjetas de recomendación (solo mensajes del agente) */}
      {isAssistant && recommendations && recommendations.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 w-full max-w-sm">
          {recommendations.map(rec => (
            <RacketCard key={rec.racket.id} racket={rec.racket} razao={rec.razao} />
          ))}
        </div>
      )}
    </div>
  )
}
