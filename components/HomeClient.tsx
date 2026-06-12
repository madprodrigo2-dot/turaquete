'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { sendGAEvent } from '@next/third-parties/google'
import LandingScreen from '@/components/LandingScreen'
import ChatMessage from '@/components/ChatMessage'
import StartChips from '@/components/StartChips'
import ChatInput from '@/components/ChatInput'
import { Brand, RecommendedRacket, RacketWithInsights } from '@/lib/recommend'
import type { FaixaIdeal } from '@/lib/scorer'

const OPENING_MESSAGE =
  'Oi! Conta pra mim: há quanto tempo você joga, como costuma jogar na quadra, se algo incomoda ' +
  '— braço, controle, potência... Do seu jeito, sem formulário.'

const CHAT_STORAGE_KEY = 'turaquete_chat_messages'
const MESSAGE_LIMIT = 25

const BUDGET_CHIPS = ['Até R$1.500', 'R$1.500–2.500', 'R$2.500–3.500', 'Acima de R$3.500']
const LEVEL_CHIPS  = ['Iniciante', 'Intermediário', 'Avançado']

function detectContextChips(text: string): string[] | null {
  const t = text.toLowerCase()
  if (t.includes('?') && (
    t.includes('orçamento') || t.includes('orcamento') || t.includes('investir') || t.includes('custo')
  )) return BUDGET_CHIPS
  if (t.includes('?') && (
    t.includes('nível') || t.includes('nivel') ||
    (t.includes('quanto tempo') && t.includes('jog'))
  )) return LEVEL_CHIPS
  return null
}

function generateId() {
  return typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  recommendations?: RecommendedRacket[]
  suggestions?: string[]
  isComparison?: boolean
  diagnostico?: FaixaIdeal
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
  const [confirmReset, setConfirmReset] = useState(false)

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE },
  ])
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string>(generateId)
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

  // Close confirm on outside interaction
  useEffect(() => {
    if (!confirmReset) return
    const dismiss = () => setConfirmReset(false)
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismiss() }, { once: true })
  }, [confirmReset])

  const resetConversation = useCallback(() => {
    setMessages([{ role: 'assistant', content: OPENING_MESSAGE }])
    setSessionId(generateId())
    try { sessionStorage.removeItem(CHAT_STORAGE_KEY) } catch {}
    sendGAEvent({ event: 'conversa_reiniciada' })
    setConfirmReset(false)
  }, [])

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

      if (res.status === 429) {
        const data = await res.json() as { error?: string }
        setMessages([...updated, { role: 'assistant', content: data.error ?? 'Muitas mensagens. Tenta de novo em alguns minutos.' }])
        return
      }
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let partialText = ''
      let streamStarted = false

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return
        const payload = line.slice(6).trim()
        if (!payload) return
        let evt: { type: string; token?: string; recommendations?: RecommendedRacket[]; suggestions?: string[]; isComparison?: boolean; diagnostico?: FaixaIdeal; message?: string }
        try { evt = JSON.parse(payload) } catch { return }

        if (evt.type === 'token' && evt.token !== undefined) {
          partialText += evt.token
          if (!streamStarted) {
            streamStarted = true
            setLoading(false)
            setIsStreaming(true)
          }
          setMessages([...updated, { role: 'assistant', content: partialText }])
        } else if (evt.type === 'done') {
          const recs = evt.recommendations ?? undefined
          const sugs = evt.suggestions?.length ? evt.suggestions : undefined
          const isCmp = evt.isComparison ?? false
          const diag = evt.diagnostico ?? undefined
          setMessages([...updated, { role: 'assistant', content: partialText || '...', recommendations: recs, suggestions: sugs, isComparison: isCmp, diagnostico: diag }])
          if (recs && recs.length > 0) {
            sendGAEvent({ event: 'recomendacao_exibida', count: recs.length })
          }
          if (isCmp && recs && recs.length > 0) {
            sendGAEvent({ event: 'comparacao_exibida', count: recs.length })
          }
          if (diag) {
            sendGAEvent({ event: 'diagnostico_exibido', nivel: diag.peso_min + '-' + diag.peso_max })
          }
        } else if (evt.type === 'error') {
          setMessages([...updated, { role: 'assistant', content: evt.message ?? 'Ops, tive um problema de conexão. Tente novamente.' }])
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        lines.forEach(processLine)
      }
      if (buffer) processLine(buffer)

      if (!streamStarted) {
        setMessages([...updated, { role: 'assistant', content: 'Desculpe, não consegui processar sua mensagem. Tente novamente.' }])
      }
    } catch {
      setMessages([
        ...updated,
        { role: 'assistant', content: 'Ops, tive um problema de conexão. Tente novamente.' },
      ])
    } finally {
      setLoading(false)
      setIsStreaming(false)
    }
  }

  const hasUserMessages = messages.some(m => m.role === 'user')
  const atLimit = messages.length >= MESSAGE_LIMIT

  const lastMsg = messages[messages.length - 1]
  const contextChips = (!loading && !isStreaming && !atLimit && lastMsg?.role === 'assistant')
    ? detectContextChips(lastMsg.content)
    : null

  return (
    <div className={`transition-opacity duration-150 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      {view === 'landing' ? (
        <LandingScreen brands={brands} featuredRackets={featuredRackets} featuredSource={featuredSource} previewRacket={previewRacket} onStart={handleStart} />
      ) : (
        <div className="h-screen flex flex-col bg-gray-50 md:bg-aqua-light">
          <div className="flex flex-col flex-1 min-h-0 w-full md:max-w-[760px] md:mx-auto md:bg-white md:shadow-sm">

            <header className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 bg-white border-b border-gray-100 shrink-0">
              {/* Logo */}
              <div className="flex flex-col items-start">
                <Link
                  href="/"
                  aria-label="Voltar à página inicial"
                  className="cursor-pointer"
                  onClick={e => { e.preventDefault(); setView('landing'); window.scrollTo(0, 0) }}
                >
                  <Image
                    src="/logo-header.png"
                    alt="Turaquete"
                    width={322}
                    height={128}
                    priority
                    className="h-9 md:h-12 w-auto"
                    style={{ width: 'auto' }}
                  />
                </Link>
                <span className="hidden md:block font-heading text-xs mt-0.5 tracking-wide transition-colors duration-300">
                  {(loading || isStreaming)
                    ? <span className="text-aqua/70 italic">digitando...</span>
                    : <span className="text-tinta/50">especialista em raquetes</span>
                  }
                </span>
              </div>

              {/* Nova conversa */}
              <div className="flex items-center gap-2 shrink-0">
                {confirmReset ? (
                  <>
                    <span className="text-tinta/50 text-xs hidden sm:block leading-tight max-w-[120px]">
                      A conversa atual será apagada.
                    </span>
                    <button
                      onClick={resetConversation}
                      className="text-xs font-semibold text-white bg-tinta px-3 py-1.5 rounded-lg hover:bg-tinta/80 transition-colors"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="text-xs text-tinta/50 hover:text-tinta/80 px-2 py-1.5 transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="flex items-center gap-1.5 text-tinta/40 hover:text-tinta/70 transition-colors py-1.5 px-2 rounded-lg hover:bg-gray-50"
                    aria-label="Nova conversa"
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                      <path d="M13 7.5a5.5 5.5 0 1 1-1.6-3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <path d="M11.4 2.4v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="hidden sm:block text-xs font-medium">Nova conversa</span>
                  </button>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4 space-y-3 w-full">
              {messages.map((m, i) => (
                <ChatMessage
                  key={i}
                  role={m.role}
                  content={m.content}
                  recommendations={m.recommendations}
                  suggestions={m.suggestions}
                  isComparison={m.isComparison}
                  diagnostico={m.diagnostico}
                  onSuggestion={
                    i === messages.length - 1 && !loading && !isStreaming && !atLimit
                      ? sendMessage
                      : undefined
                  }
                  showTury={i === 0 && m.role === 'assistant'}
                />
              ))}
              {loading && <ChatMessage role="assistant" content="" loading />}

              {/* Limite de mensagens */}
              {atLimit && !loading && (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <p className="text-tinta/50 text-sm leading-relaxed max-w-xs">
                    Chegamos ao limite desta consultoria. Quer começar uma nova?
                  </p>
                  <button
                    onClick={resetConversation}
                    className="flex items-center gap-1.5 bg-tinta text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-tinta/80 active:scale-[0.98] transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                      <path d="M13 7.5a5.5 5.5 0 1 1-1.6-3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <path d="M11.4 2.4v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Recomeçar
                  </button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {!hasUserMessages && !loading && (
              <StartChips onSelect={sendMessage} />
            )}

            {contextChips && (
              <div className="flex flex-wrap gap-2 px-4 md:px-6 py-2 border-t border-gray-100">
                {contextChips.map(chip => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-aqua/30 text-tinta/70 hover:bg-aqua/10 hover:border-aqua/50 active:scale-[0.97] transition-all"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <ChatInput onSend={sendMessage} disabled={loading || isStreaming || atLimit} />
          </div>
        </div>
      )}
    </div>
  )
}
