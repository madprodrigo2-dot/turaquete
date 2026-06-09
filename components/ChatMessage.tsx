interface Props {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

export default function ChatMessage({ role, content, loading = false }: Props) {
  const isAssistant = role === 'assistant'

  return (
    <div className={`flex w-full ${isAssistant ? 'justify-start' : 'justify-end'}`}>
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
    </div>
  )
}
