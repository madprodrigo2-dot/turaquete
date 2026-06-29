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
const WARN_AT       = 20

const BUDGET_CHIPS = ['Até R$1.000', 'R$1.000 a R$2.000', 'R$2.000 a R$3.000', 'Mais de R$3.000', 'Tanto faz / me mostra opções']
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
  marcaListPending?: boolean  // true when the last assistant message is a brand-list prompt
  _isTimeout?: true  // internal flag: stripped from API payloads, triggers history rollback on retry
  _retryText?: string  // original user text to resend when retry chip is tapped
}

interface Props {
  brands: Brand[]
  featuredRackets: RacketWithInsights[]
  featuredSource: 'real' | 'curated'
  athleteRackets: RacketWithInsights[]
  recsCount: number
  exampleRacket?: RacketWithInsights
  compareRacket?: RacketWithInsights
}

export default function HomeClient({ brands, featuredRackets, featuredSource, athleteRackets, recsCount, exampleRacket, compareRacket }: Props) {
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
  // Guard against concurrent sends (double-tap, quick-reply race)
  const sendingRef = useRef(false)
  // AbortController for the in-flight fetch — cancelled on timeout or unmount
  const abortRef = useRef<AbortController | null>(null)
  // Tracks which start chip (if any) triggered the current send
  const starterUsadoRef = useRef<string | null>(null)
  // Counts consecutive timeouts — resets on success; ≥2 breaks the retry chip loop
  const consecutiveTimeoutsRef = useRef(0)
  const origemRef = useRef<{ referrer?: string; utm_source?: string; utm_medium?: string }>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const pendingDebugRef = useRef<DebugData | null>(null)
  const [feedbackDone, setFeedbackDone] = useState(false)
  const [showBrandPicker, setShowBrandPicker] = useState(false)
  const firstRecShownRef = useRef(false)
  const intencaoConvRef = useRef<string | undefined>(undefined)
  const turnosAteRecRef = useRef(0)
  const viewRef = useRef(view)

  const STREAM_TIMEOUT_MS = 40_000

  // Paced text animation — buffer drains at human typing speed
  const [streamRawText, setStreamRawText] = useState('')
  const [streamIsDone, setStreamIsDone] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleAnimationChange = useCallback((v: boolean) => {
    setIsAnimating(v)
    if (!v) setStreamRawText('')
  }, [])

  // Capture referrer + UTM on mount (only available client-side)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = document.referrer
    // Explicit UTM params take priority; fall back to auto-detection via click IDs
    const src = params.get('utm_source')
      ?? (params.get('gclid') ? 'google' : null)
      ?? (params.get('fbclid') ? 'instagram' : null)
    const med = params.get('utm_medium')
      ?? (params.get('gclid') ? 'cpc' : null)
      ?? (params.get('fbclid') ? 'paid' : null)
    origemRef.current = {
      ...(ref ? { referrer: ref } : {}),
      ...(src ? { utm_source: src } : {}),
      ...(med ? { utm_medium: med } : {}),
    }
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

  // Keep viewRef in sync so the popstate handler never sees a stale closure
  useEffect(() => { viewRef.current = view }, [view])

  // Android/browser back button: if user is in chat, return to landing instead of exiting the site.
  // handleStart pushes a history entry; popstate fires when the user navigates back.
  useEffect(() => {
    const onPopState = () => {
      if (viewRef.current === 'chat') {
        setFading(true)
        setTimeout(() => {
          setView('landing')
          setFading(false)
          window.scrollTo(0, 0)
        }, 150)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

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
    history.pushState({ view: 'chat' }, '')
    setFading(true)
    setTimeout(() => {
      setView('chat')
      setFading(false)
    }, 150)
  }

  // Auto-open chat when arriving from a ?chat=1 link (racket/compare pages)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('chat') === '1') {
      handleStart()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      // Post-rec context: send shown IDs and shown brands across ALL rec turns so
      // "Outra marca" never re-offers a brand that was already shown in any turn.
      const allShownIds = baseMessages.flatMap(m => m.recommendations?.map(r => r.racket.id) ?? [])
      if (allShownIds.length > 0) {
        const shownBrands = [...new Set(
          baseMessages.flatMap(m => m.recommendations?.flatMap(r => r.racket.brands?.name ? [r.racket.brands.name] : []) ?? [])
        )]
        const lastAssistantMsg = [...baseMessages].reverse().find(m => m.role === 'assistant')
        const marcaListPending = lastAssistantMsg?.marcaListPending ?? false
        reqBody.postRecContext = { shownIds: allShownIds, shownBrands, ...(marcaListPending ? { marcaListPending: true } : {}) }
      }
      if (isFirstMessage) {
        reqBody.primeiraMensagem = text
        reqBody.starterUsado = starterUsadoRef.current ?? null
        const o = origemRef.current
        if (o.referrer)   reqBody.origemReferrer  = o.referrer
        if (o.utm_source) reqBody.origemUtmSource = o.utm_source
        if (o.utm_medium) reqBody.origemUtmMedium = o.utm_medium
      }

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
        let evt: { type: string; token?: string; recommendations?: RecommendedRacket[]; suggestions?: string[]; isComparison?: boolean; diagnostico?: FaixaIdeal; intencao?: string; marcaListPending?: boolean; message?: string } & Partial<DebugData>
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
          pendingDebugRef.current = { thinking: evt.thinking, perfilInput: evt.perfilInput, scorerResults: evt.scorerResults, criteriosRelaxados: evt.criteriosRelaxados, diagnostico: evt.diagnostico, decisionTrace: evt.decisionTrace, confidenceInfo: evt.confidenceInfo, usage: evt.usage, limites: evt.limites }
        } else if (evt.type === 'done') {
          streamFinished = true
          consecutiveTimeoutsRef.current = 0
          if (isFirstMessage) starterUsadoRef.current = null
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
            role: 'assistant', content: partialText,
            recommendations: recs, suggestions: sugs, isComparison: isCmp,
            diagnostico: diag, debug: dbg,
            isFirstRec: isFirstRec || undefined,
            intencao: isFirstRec ? intencaoConvRef.current : undefined,
            turnosAteRec: isFirstRec ? turnosAteRecRef.current : undefined,
            marcaListPending: evt.marcaListPending || undefined,
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
          suggestions: stuck ? undefined : ['↻ Tentar de novo'],
          _retryText: stuck ? undefined : text,
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
            suggestions: stuck ? undefined : ['↻ Tentar de novo'],
            _retryText: stuck ? undefined : text,
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
  const atLimit   = messages.length >= MESSAGE_LIMIT
  const nearLimit = !atLimit && messages.length >= WARN_AT

  const lastMsg = messages[messages.length - 1]
  // Context chips and other reactive UI only appear after the full animation settles
  // Suppress detectContextChips when the Akinator already provided inline chips (suggestions):
  // showing both at once duplicates the same question in two places with different labels.
  const hasAkinatorChips = !!(lastMsg?.suggestions?.length)
  const contextChips = (!loading && !isStreaming && !isAnimating && !atLimit && lastMsg?.role === 'assistant' && !hasAkinatorChips && !lastMsg?.recommendations)
    ? detectContextChips(lastMsg.content)
    : null

  return (
    <div className={`transition-opacity duration-150 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      {view === 'landing' ? (
        <LandingScreen brands={brands} featuredRackets={featuredRackets} featuredSource={featuredSource} athleteRackets={athleteRackets} recsCount={recsCount} exampleRacket={exampleRacket} compareRacket={compareRacket} onStart={handleStart} />
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
                  onClick={e => { e.preventDefault(); history.back() }}
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

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4 space-y-3 w-full bg-[#EAF7F6]">
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
                          ? (s) => {
                              if (s === 'Ver todas as marcas') { setShowBrandPicker(true); return }
                              if (s === 'Outras marcas') { setShowBrandPicker(true); return }
                              if (m._retryText && s === '↻ Tentar de novo') {
                                const turnos = messages.filter(x => x.role === 'user').length
                                fireEvent({ session_id: sessionId, event_type: 'timeout_retry', motivo: `turno_${turnos + 1}` })
                                sendMessage(m._retryText)
                              } else {
                                sendMessage(s)
                              }
                            }
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

              {/* Total acumulado da conversa — admin/debug only */}
              {debugMode && isAdmin && (() => {
                const usages = messages.flatMap(m => m.debug?.usage ? [m.debug.usage] : [])
                if (usages.length === 0) return null
                const tot = usages.reduce(
                  (acc, u) => ({
                    input:      acc.input      + u.input,
                    output:     acc.output     + u.output,
                    cacheWrite: acc.cacheWrite + u.cacheWrite,
                    cacheRead:  acc.cacheRead  + u.cacheRead,
                    usd:        acc.usd        + u.usd,
                    brl:        acc.brl        + u.brl,
                  }),
                  { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, usd: 0, brl: 0 }
                )
                return (
                  <div className="font-mono text-xs bg-gray-800 text-gray-200 rounded-lg border border-yellow-600/40 px-3 py-2">
                    <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-1.5">
                      ∑ Total da conversa · {usages.length} {usages.length === 1 ? 'turno' : 'turnos'}
                    </div>
                    <div className="space-y-0.5 tabular-nums text-[11px]">
                      <div><span className="text-gray-400">input: </span><span>{tot.input.toLocaleString()}</span></div>
                      <div><span className="text-gray-400">output: </span><span>{tot.output.toLocaleString()}</span></div>
                      <div><span className="text-gray-400">cache↑: </span><span>{tot.cacheWrite.toLocaleString()}</span></div>
                      <div><span className="text-gray-400">cache↓: </span><span>{tot.cacheRead.toLocaleString()}</span></div>
                      <div className="mt-1 text-green-300 font-semibold text-[12px]">
                        US${tot.usd.toFixed(4)} / R${tot.brl.toFixed(3)}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Aviso de aproximação do limite */}
              {nearLimit && !loading && !isStreaming && (
                <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
                  Estamos chegando ao fim desta conversa, ainda dá pra trocar mais {MESSAGE_LIMIT - messages.length} mensagens. Se quiser continuar de outro ângulo, você pode{' '}
                  <button onClick={resetConversation} className="underline font-semibold hover:text-amber-900 transition-colors">recomeçar a qualquer hora</button>.
                </div>
              )}

              {/* Limite de mensagens */}
              {atLimit && !loading && (
                <div className="flex flex-col items-center gap-3 py-4 text-center px-4">
                  <p className="text-tinta/60 text-sm leading-relaxed max-w-xs">
                    Acho que já exploramos bastante juntos! Que tal começar uma conversa nova do zero?
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

            {(!hasUserMessages || (!loading && !isStreaming && !isAnimating && !hasAkinatorChips)) && (
              <ChatInput onSend={sendMessage} disabled={loading || isStreaming || isAnimating || atLimit} />
            )}
          </div>
        </div>
      )}


      {/* Brand picker overlay — opened by "Ver todas as marcas" chip */}
      {showBrandPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
          onClick={() => setShowBrandPicker(false)}
        >
          <div
            className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl max-h-[72vh] flex flex-col shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <span className="font-semibold text-tinta text-base">Qual marca?</span>
              <button
                onClick={() => setShowBrandPicker(false)}
                className="p-1.5 rounded-lg text-tinta/40 hover:text-tinta/70 hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-2 py-2">
              {brands
                .filter(b => b.status === 'disponivel')
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => { sendMessage(brand.name); setShowBrandPicker(false) }}
                    className="w-full text-left px-4 py-3 rounded-xl text-tinta font-medium text-sm hover:bg-aqua/10 active:bg-aqua/20 transition-colors"
                  >
                    {brand.name}
                  </button>
                ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setShowBrandPicker(false)}
                className="w-full py-2.5 rounded-xl text-sm text-tinta/50 hover:text-tinta/70 hover:bg-gray-50 transition-colors font-medium"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
