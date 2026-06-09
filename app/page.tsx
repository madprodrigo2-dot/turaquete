'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import ChatMessage from '@/components/ChatMessage'
import StartChips from '@/components/StartChips'
import ChatInput from '@/components/ChatInput'

const OPENING_MESSAGE =
  'Oi! Me conta como você joga: há quanto tempo pratica, se busca mais potência ou controle, ' +
  'se sente algum incômodo no braço e qual seu orçamento. Com isso eu te indico a raquete certa.'

type Message = { role: 'user' | 'assistant'; content: string }

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE },
  ])
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState<string>(() =>
    typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text: string) => {
    const updated: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(updated)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, sessionId }),
      })
      const data = await res.json()
      const reply = data.text ?? 'Desculpe, não consegui processar sua mensagem. Tente novamente.'
      setMessages([...updated, { role: 'assistant', content: reply }])
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <Image
          src="/turaquete-logo.svg"
          alt="Turaquete"
          width={140}
          height={36}
          priority
          className="h-8 w-auto"
        />
      </header>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl mx-auto w-full">
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} />
        ))}
        {loading && <ChatMessage role="assistant" content="" loading />}
        <div ref={bottomRef} />
      </div>

      {/* Chips de início — só antes da primeira mensagem do usuário */}
      {!hasUserMessages && !loading && (
        <StartChips onSelect={sendMessage} />
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  )
}
