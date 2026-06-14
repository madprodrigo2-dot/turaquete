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
import DebugPanel, { DebugData } from '@/components/DebugPanel'
import FeedbackWidget from '@/components/FeedbackWidget'

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
  debug?: DebugData
  isFirstRec?: boolean   // true on the first assistant message that contains recommendations
  intencao?: string      // conversation intencao, stored here for persistence
  turnosAteRec?: number  // user turn count when this first rec was shown
  _isTimeout?: true  // internal flag: stripped from API payloads, triggers history rollback on retry
}

interface Props {
  brands: Brand[]
  featuredRackets: RacketWithInsights[]
  featuredSource: 'real' | 'curated'
  athleteRackets: RacketWithInsights[]
  recsCount: number
}

export default function HomeClient({ brands, featuredRackets, featuredSource, athleteRackets, recsCount }: Props) {
  const [view, setView] = useState<'landing' | 'chat'>('landing')
  const [fading, setFading] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [ballFling, setBallFling] = useState(false)

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE },
  ])
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string>(generateId)
  const bottomRef = useRef<HTMLDivElement>(null)
  // Guard against concurrent sends (double-tap, quick-reply race)
  const sendingRef = useRef(false)
  // AbortController for the in-flight fetch — cancelled on timeout or unmount
  const abortRef = useRef<AbortController | null>(null)
  // Tracks which start chip (if any) triggered the current send
  const starterUsadoRef = useRef<string | null>(null)
  // Counts consecutive timeouts — resets on success; ≥2 breaks the retry chip loop
  const consecutiveTimeoutsRef = useRef(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const pendingDebugRef = useRef<DebugData | null>(null)
  const [feedbackDone, setFeedbackDone] = useState(false)
  const firstRecShownRef = useRef(false)
  const intencaoConvRef = useRef<string | undefined>(undefined)
  const turnosAteRecRef = useRef(0)

  const STREAM_TIMEOUT_MS = 40_000

  // Paced text animation — buffer drains at human typing speed
  const [streamRawText, setStreamRawText] = useState('')
  const [streamIsDone, setStreamIsDone] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleAnimationChange = useCallback((v: boolean) => {
    setIsAnimating(v)
    if (!v) setStreamRawText('')
  }, [])

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

  // Scroll to bottom when animation finishes so that newly revealed cards are visible
  useEffect(() => {
    if (!isAnimating && streamRawText && view === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isAnimating, streamRawText, view])

  // Close confirm on outside interaction
  useEffect(() => {
    if (!confirmReset) return
    const dismiss = () => setConfirmReset(false)
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismiss() }, { once: true })
  }, [confirmReset])

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => r.json())
      .then((d: { isAdmin: boolean }) => { if (d.isAdmin) setIsAdmin(true) })
      .catch(() => {})
  }, [])

  function fireEvent(body: Record<string, unknown>) {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
  }

  const resetConversation = useCallback(() => {
    if (firstRecShownRef.current) {
      fireEvent({ session_id: sessionId, event_type: 'nova_conversa_pos_rec' })
    }
    firstRecShownRef.current = false
    intencaoConvRef.current = undefined
    turnosAteRecRef.current = 0
    setFeedbackDone(false)
    setMessages([{ role: 'assistant', content: OPENING_MESSAGE }])
    setSessionId(generateId())
    try { sessionStorage.removeItem(CHAT_STORAGE_KEY) } catch {}
    sendGAEvent({ event: 'conversa_reiniciada' })
    setConfirmReset(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const handleStart = () => {
    sendGAEvent({ event: 'chat_iniciado' })
    if (!ballFling && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBallFling(true)
    }
    setFading(true)
    setTimeout(() => {
      setView('chat')
      setFading(false)
    }, 150)
  }

  const TIMEOUT_MESSAGE = 'Opa, travei aqui. Pode mandar de novo?'

  const sendMessage = async (text: string) => {
    // Hard guard: reject if a request is already in flight
    if (sendingRef.current) return
    sendingRef.current = true

    // Rollback: if the last message is a timeout error, strip it (and the user
    // message that caused it, if it's the same text) before retrying. This
    // prevents the API from receiving a history polluted with error messages and
    // breaks the visual "timeout → chip → timeout → chip" loop.
    let baseMessages = messages
    if (baseMessages.at(-1)?._isTimeout) {
      baseMessages = baseMessages.slice(0, -1)
      if (baseMessages.at(-1)?.role === 'user' && baseMessages.at(-1)?.content === text) {
        baseMessages = baseMessages.slice(0, -1)
      }
    }

    const updated: Message[] = [...baseMessages, { role: 'user', content: text }]
    setMessages(updated)
    setLoading(true)
    setStreamRawText('')
    setStreamIsDone(false)
    pendingDebugRef.current = null

    const abort = new AbortController()
    abortRef.current = abort

    // 40-second timeout: cancel fetch + show friendly retry message
    const timeoutId = setTimeout(() => {
      abort.abort()
    }, STREAM_TIMEOUT_MS)

    try {
      const apiMessages = updated.map(({ role, content }) => ({ role, content }))
      const isFirstMessage = !baseMessages.some(m => m.role === 'user')
      const reqBody: Record<string, unknown> = { messages: apiMessages, sessionId }
      if (isFirstMessage) {
        reqBody.primeiraMensagem = text
        reqBody.starterUsado = starterUsadoRef.current ?? null
      }
      starterUsadoRef.current = null

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
        signal: abort.signal,
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
      let streamFinished = false

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return
        const payload = line.slice(6).trim()
        if (!payload) return
        let evt: { type: string; token?: string; recommendations?: RecommendedRacket[]; suggestions?: string[]; isComparison?: boolean; diagnostico?: FaixaIdeal; intencao?: string; message?: string } & Partial<DebugData>
        try { evt = JSON.parse(payload) } catch { return }

        if (evt.type === 'token' && evt.token !== undefined) {
          partialText += evt.token
          if (!streamStarted) {
            streamStarted = true
            setLoading(false)
            setIsStreaming(true)
          }
          setStreamRawText(partialText)
          setMessages([...updated, { role: 'assistant', content: partialText }])
        } else if (evt.type === 'debug') {
          pendingDebugRef.current = { thinking: evt.thinking, perfilInput: evt.perfilInput, scorerResults: evt.scorerResults, criteriosRelaxados: evt.criteriosRelaxados, diagnostico: evt.diagnostico, decisionTrace: evt.decisionTrace, usage: evt.usage }
        } else if (evt.type === 'done') {
          streamFinished = true
          consecutiveTimeoutsRef.current = 0
          const recs = evt.recommendations ?? undefined
          const sugs = evt.suggestions?.length ? evt.suggestions : undefined
          const isCmp = evt.isComparison ?? false
          const diag = evt.diagnostico ?? undefined
          const dbg = pendingDebugRef.current ?? undefined
          if (evt.intencao) {
            intencaoConvRef.current = evt.intencao
            sendGAEvent({ event: 'intencao_detectada', intencao: evt.intencao })
          }
          const isFirstRec = !!(recs && recs.length > 0 && !firstRecShownRef.current)
          if (isFirstRec) {
            firstRecShownRef.current = true
            turnosAteRecRef.current = updated.filter(m => m.role === 'user').length
          }
          setMessages([...updated, {
            role: 'assistant', content: partialText || '...',
            recommendations: recs, suggestions: sugs, isComparison: isCmp,
            diagnostico: diag, debug: dbg,
            isFirstRec: isFirstRec || undefined,
            intencao: isFirstRec ? intencaoConvRef.current : undefined,
            turnosAteRec: isFirstRec ? turnosAteRecRef.current : undefined,
          }])
          if (recs && recs.length > 0) {
            sendGAEvent({ event: 'recomendacao_exibida', count: recs.length })
          }
          if (isCmp && recs && recs.length > 0) {
            sendGAEvent({ event: 'comparacao_exibida', count: recs.length })
          }
          if (diag) {
            sendGAEvent({ event: 'diagnostico_exibido', nivel: diag.peso_min + '-' + diag.peso_max })
          }
          setStreamIsDone(true)
        } else if (evt.type === 'error') {
          streamFinished = true
          setMessages([...updated, { role: 'assistant', content: evt.message ?? 'Ops, tive um problema de conexão. Tente novamente.' }])
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        // Exit if stream ended OR if AbortController fired (handles environments
        // where aborting a fetch doesn't automatically reject reader.read())
        if (done || abort.signal.aborted) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        lines.forEach(processLine)
      }
      if (buffer) processLine(buffer)

      if (!streamFinished) {
        // Stream ended without a 'done' event: either never started (no tokens)
        // or started but connection dropped mid-response. Both need a retry prompt.
        consecutiveTimeoutsRef.current++
        const stuck = consecutiveTimeoutsRef.current >= 2
        setMessages([...updated, {
          role: 'assistant',
          content: stuck ? 'Parece que tô com lentidão no servidor agora. Aguarda uns minutinhos e tenta de novo.' : TIMEOUT_MESSAGE,
          suggestions: stuck ? undefined : [text],
          _isTimeout: true,
        }])
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError'
      if (isAbort) {
        consecutiveTimeoutsRef.current++
        const stuck = consecutiveTimeoutsRef.current >= 2
        setMessages([
          ...updated,
          {
            role: 'assistant',
            content: stuck ? 'Parece que tô com lentidão no servidor agora. Aguarda uns minutinhos e tenta de novo.' : TIMEOUT_MESSAGE,
            suggestions: stuck ? undefined : [text],
            _isTimeout: true,
          },
        ])
      } else {
        setMessages([
          ...updated,
          { role: 'assistant', content: 'Ops, tive um problema de conexão. Tente novamente.' },
        ])
      }
    } finally {
      clearTimeout(timeoutId)
      abortRef.current = null
      setLoading(false)
      setIsStreaming(false)
      sendingRef.current = false
    }
  }

  const hasUserMessages = messages.some(m => m.role === 'user')
  const atLimit = messages.length >= MESSAGE_LIMIT

  const lastMsg = messages[messages.length - 1]
  // Context chips and other reactive UI only appear after the full animation settles
  const contextChips = (!loading && !isStreaming && !isAnimating && !atLimit && lastMsg?.role === 'assistant')
    ? detectContextChips(lastMsg.content)
    : null

  return (
    <div className={`transition-opacity duration-150 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      {view === 'landing' ? (
        <LandingScreen brands={brands} featuredRackets={featuredRackets} featuredSource={featuredSource} athleteRackets={athleteRackets} recsCount={recsCount} onStart={handleStart} />
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
                  {(loading || isStreaming || isAnimating)
                    ? <span className="text-aqua/70 italic">digitando...</span>
                    : <span className="text-tinta/50">especialista em raquetes</span>
                  }
                </span>
              </div>

              {/* Nova conversa */}
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && (
                  <button
                    onClick={() => setDebugMode(m => !m)}
                    title="Toggle debug mode"
                    className={`text-[11px] px-2 py-1 rounded border font-mono transition-colors ${debugMode ? 'bg-yellow-50 border-yellow-400 text-yellow-700' : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
                  >
                    ⚙
                  </button>
                )}
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
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1
                const isPacing = (isStreaming || streamRawText !== '') && isLast && m.role === 'assistant'
                const showFeedback = m.isFirstRec && !feedbackDone && !loading && !isStreaming && !isAnimating
                return (
                  <div key={i} className="contents">
                    <ChatMessage
                      role={m.role}
                      content={m.content}
                      recommendations={m.recommendations}
                      suggestions={m.suggestions}
                      isComparison={m.isComparison}
                      diagnostico={m.diagnostico}
                      debug={m.debug}
                      debugMode={debugMode}
                      sessionId={sessionId}
                      onSuggestion={
                        isLast && !loading && !isStreaming && !isAnimating && !atLimit
                          ? sendMessage
                          : undefined
                      }
                      disableGlossary={(isStreaming || isAnimating) && isLast}
                      showTury={i === 0 && m.role === 'assistant'}
                      rawText={isPacing ? streamRawText : undefined}
                      streamIsDone={isPacing ? streamIsDone : undefined}
                      onAnimationChange={isPacing ? handleAnimationChange : undefined}
                    />
                    {showFeedback && (
                      <FeedbackWidget
                        sessionId={sessionId}
                        intencao={m.intencao}
                        turnosAteRec={m.turnosAteRec ?? 0}
                        decisionTrace={m.debug?.decisionTrace}
                        onDone={() => setFeedbackDone(true)}
                      />
                    )}
                  </div>
                )
              })}
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

            {!hasUserMessages && !loading && !isAnimating && (
              <StartChips onSelect={(chip) => {
                starterUsadoRef.current = chip
                sendMessage(chip)
              }} />
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

            <ChatInput onSend={sendMessage} disabled={loading || isStreaming || isAnimating || atLimit} />
          </div>
        </div>
      )}

      {/* Pelota — aparece ao clicar "Começar agora", anima paralelo à transição */}
      {ballFling && (
        <div
          aria-hidden="true"
          className="fixed pointer-events-none z-50"
          style={{ left: '10vw', top: '58vh' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/turaquete-bola.svg"
            alt=""
            width={48}
            height={48}
            className="ball-fling"
            onAnimationEnd={() => setBallFling(false)}
          />
        </div>
      )}
    </div>
  )
}
