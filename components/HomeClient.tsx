'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { sendGAEvent } from '@next/third-parties/google'
import LandingScreen from '@/components/LandingScreen'
import ChatMessage from '@/components/ChatMessage'
import StartChips from '@/components/StartChips'
import ChatInput from '@/components/ChatInput'
import { Brand, RecommendedRacket, RacketWithInsights } from '@/lib/recommend'

const OPENING_MESSAGE =
  'Oi! Me conta como você joga: há quanto tempo pratica, se busca mais potência ou controle, ' +
  'se sente algum incômodo no braço e qual seu orçamento. Com isso eu te indico a raquete certa.'

type Message = {
  role: 'user' | 'assistant'
  content: string
  recommendations?: RecommendedRacket[]
}

interface Props {
  brands: Brand[]
  featuredRackets: RacketWithInsights[]
}

export default function HomeClient({ brands, featuredRackets }: Props) {
  const [view, setView] = useState<'landing' | 'chat'>('landing')
  const [fading, setFading] = useState(false)

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE },
  ])
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState<string>(() =>
    typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (view === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, view])

  const handleStart = () => {
    sendGAEvent({ event: 'chat_iniciado' })
    setFading(true)
    setTimeout(() => {
      setView('chat')
      setFading(false)
    }, 150)
  }

  const sendMessage = async (text: string) => {
    const updated: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(updated)
    setLoading(true)

    try {
      const apiMessages = updated.map(({ role, content }) => ({ role, content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, sessionId }),
      })
      const data = await res.json()
      const reply = data.text ?? 'Desculpe, não consegui processar sua mensagem. Tente novamente.'
      if (data.recommendations?.length > 0) {
        sendGAEvent({ event: 'recomendacao_exibida', count: data.recommendations.length })
      }
      setMessages([
        ...updated,
        { role: 'assistant', content: reply, recommendations: data.recommendations ?? undefined },
      ])
    } catch {
      setMessages([
        ...updated,
        { role: 'assistant', content: 'Ops, tive um problema de conexão. Tente novamente.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const hasUserMessages = messages.some(m => m.role === 'user')

  return (
    <div className={`transition-opacity duration-150 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      {view === 'landing' ? (
        <LandingScreen brands={brands} featuredRackets={featuredRackets} onStart={handleStart} />
      ) : (
        <div className="h-screen flex flex-col bg-gray-50 md:bg-aqua-light">
          <div className="flex flex-col flex-1 min-h-0 w-full md:max-w-[760px] md:mx-auto md:bg-white md:shadow-sm">

            <header className="flex items-center px-4 py-3 md:px-6 md:py-4 bg-white border-b border-gray-100 shrink-0">
              <div className="flex flex-col">
                <Image
                  src="/turaquete-logo.png"
                  alt="Turaquete"
                  width={852}
                  height={474}
                  priority
                  className="h-9 md:h-12 w-auto"
                />
                <span className="hidden md:block text-tinta/50 text-xs mt-0.5 tracking-wide">
                  especialista em beach tennis
                </span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3 w-full">
              {messages.map((m, i) => (
                <ChatMessage
                  key={i}
                  role={m.role}
                  content={m.content}
                  recommendations={m.recommendations}
                />
              ))}
              {loading && <ChatMessage role="assistant" content="" loading />}
              <div ref={bottomRef} />
            </div>

            {!hasUserMessages && !loading && (
              <StartChips onSelect={sendMessage} />
            )}

            <ChatInput onSend={sendMessage} disabled={loading} />
          </div>
        </div>
      )}
    </div>
  )
}
