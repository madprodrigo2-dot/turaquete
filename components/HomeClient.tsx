'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { sendGAEvent } from '@next/third-parties/google'
import LandingScreen from '@/components/LandingScreen'
import ChatMessage from '@/components/ChatMessage'
import StartChips from '@/components/StartChips'
import ChatInput from '@/components/ChatInput'
import { Brand, RecommendedRacket, RacketWithInsights } from '@/lib/recommend'

const OPENING_MESSAGE =
  'Oi! Me conta como você joga: há quanto tempo pratica, se busca mais potência ou controle, ' +
  'se sente algum incômodo no braço e qual seu orçamento. Com isso eu te indico a raquete certa.'

const CHAT_STORAGE_KEY = 'turaquete_chat_messages'

type Message = {
  role: 'user' | 'assistant'
  content: string
  recommendations?: RecommendedRacket[]
}

interface Props {
  brands: Brand[]
  featuredRackets: RacketWithInsights[]
  featuredSource: 'real' | 'curated'
  previewRacket?: RacketWithInsights
}

export default function HomeClient({ brands, featuredRackets, featuredSource, previewRacket }: Props) {
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

  // Restore conversation from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CHAT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Message[]
        if (Array.isArray(parsed) && parsed.length > 1) {
          setMessages(parsed)
        }
      }
    } catch {}
  }, [])

  // Persist conversation to sessionStorage whenever messages update
  useEffect(() => {
    if (messages.length > 1) {
      try {
        sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
      } catch {}
    }
  }, [messages])

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
        <LandingScreen brands={brands} featuredRackets={featuredRackets} featuredSource={featuredSource} previewRacket={previewRacket} onStart={handleStart} />
      ) : (
        <div className="h-screen flex flex-col bg-gray-50 md:bg-aqua-light">
          <div className="flex flex-col flex-1 min-h-0 w-full md:max-w-[760px] md:mx-auto md:bg-white md:shadow-sm">

            <header className="flex items-center px-4 py-3 md:px-6 md:py-4 bg-white border-b border-gray-100 shrink-0">
              <div className="flex flex-col items-start">
                <Link
                  href="/"
                  aria-label="Voltar à página inicial"
                  className="cursor-pointer"
                  onClick={e => { e.preventDefault(); setView('landing'); window.scrollTo(0, 0) }}
                >
                  <Image
                    src="/turaquete-logo.png"
                    alt="Turaquete"
                    width={852}
                    height={474}
                    priority
                    className="h-9 md:h-12 w-auto"
                    style={{ width: 'auto' }}
                  />
                </Link>
                <span className="hidden md:block font-heading text-xs mt-0.5 tracking-wide transition-colors duration-300">
                  {loading
                    ? <span className="text-aqua/70 italic">digitando...</span>
                    : <span className="text-tinta/50">especialista em raquetes</span>
                  }
                </span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4 space-y-3 w-full">
              {messages.map((m, i) => (
                <ChatMessage
                  key={i}
                  role={m.role}
                  content={m.content}
                  recommendations={m.recommendations}
                  showTury={i === 0 && m.role === 'assistant'}
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
