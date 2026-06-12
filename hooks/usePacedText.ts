'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const BASE_CPS        = 38    // chars per second — comfortable human typing pace
const DRAIN_TARGET_MS = 1500  // drain remaining buffer in ≤this many ms after stream ends
const MAX_DT          = 0.05  // cap frame delta to prevent accumulator spike after tab-switch/pause

interface Options {
  onAnimationChange?: (animating: boolean) => void
}

/**
 * Drives a smooth, per-frame typing animation via requestAnimationFrame.
 *
 * API: the hook lives INSIDE ChatMessage so re-renders from text accumulation
 * are isolated to that component only — the parent (HomeClient) is never
 * re-rendered per character.
 *
 * Text is appended DIRECTLY to containerRef's DOM node (no React state for
 * each character). Each emitted word-chunk gets a `.char-fade` span so new
 * text dissolves in instead of snapping. Only two React state changes occur:
 * one at animation start, one at end.
 *
 * Fractional accumulator: on every frame, `cps * dt` chars are credited.
 * When the accumulator reaches ≥ 1 we emit and subtract. This gives
 * perfectly even inter-character timing regardless of frame rate.
 */
export function usePacedText(
  containerRef: React.RefObject<HTMLSpanElement | null>,
  rawText: string,
  isDone: boolean,
  options: Options = {}
): { isAnimating: boolean; flush: () => void } {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [isAnimating, setIsAnimating] = useState(false)

  const rafRef     = useRef(0)
  const accumRef   = useRef(0)    // fractional char accumulator
  const posRef     = useRef(0)    // chars already appended to DOM
  const pauseUntil = useRef(0)    // DOMHighResTimeStamp: pause until after punctuation
  const prevTS     = useRef(0)    // previous frame timestamp
  const startedRef = useRef(false)
  const rawTextRef = useRef(rawText)
  const isDoneRef  = useRef(isDone)
  const { onAnimationChange } = options

  // Keep refs current every render (RAF loop reads these without triggering re-renders)
  rawTextRef.current = rawText
  isDoneRef.current  = isDone

  const setAnim = useCallback((v: boolean) => {
    setIsAnimating(v)
    onAnimationChange?.(v)
  }, [onAnimationChange])

  const flush = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const text = rawTextRef.current
    const container = containerRef.current
    if (container) {
      // Replace all typed spans with plain text (instant reveal, no fade)
      container.innerHTML = ''
      container.textContent = text
    }
    posRef.current = text.length
    accumRef.current = 0
    startedRef.current = false
    setAnim(false)
  }, [containerRef, setAnim])

  useEffect(() => {
    // Cleared → reset for next animation
    if (!rawText) {
      cancelAnimationFrame(rafRef.current)
      const c = containerRef.current
      if (c) c.innerHTML = ''
      posRef.current = 0
      accumRef.current = 0
      pauseUntil.current = 0
      prevTS.current = 0
      startedRef.current = false
      setAnim(false)
      return
    }

    // prefers-reduced-motion: instant reveal, no RAF
    if (prefersReduced) {
      const c = containerRef.current
      if (c) c.textContent = rawText
      posRef.current = rawText.length
      setAnim(false)
      return
    }

    // StrictMode double-invoke guard
    if (startedRef.current) return
    startedRef.current = true
    setAnim(true)

    const tick = (ts: number) => {
      // Honor micro-pause (punctuation delay)
      if (ts < pauseUntil.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const dt = prevTS.current
        ? Math.min((ts - prevTS.current) / 1000, MAX_DT)
        : 0.016
      prevTS.current = ts

      const text = rawTextRef.current
      const done = isDoneRef.current
      const pos  = posRef.current
      const remaining = text.length - pos

      // Buffer caught up — wait for more tokens or finish
      if (remaining <= 0) {
        if (done) { setAnim(false); startedRef.current = false; return }
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // Adaptive CPS: when done, scale up to drain in DRAIN_TARGET_MS
      const cps = done
        ? Math.max(BASE_CPS, remaining / (DRAIN_TARGET_MS / 1000))
        : BASE_CPS

      accumRef.current += cps * dt

      if (accumRef.current >= 1) {
        const charsNow = Math.min(Math.floor(accumRef.current), remaining)
        accumRef.current -= charsNow

        // Snap to next word boundary within a short lookahead
        let endPos = pos + charsNow
        if (endPos < text.length) {
          const nextSpace = text.indexOf(' ', endPos)
          if (nextSpace !== -1 && nextSpace - endPos <= 8) endPos = nextSpace + 1
        }
        endPos = Math.min(endPos, text.length)

        const chunk = text.slice(pos, endPos)
        posRef.current = endPos

        // Append to DOM as a fading span — zero React state update
        const container = containerRef.current
        if (container && chunk) {
          const span = document.createElement('span')
          span.className = 'char-fade'
          span.textContent = chunk
          container.appendChild(span)
        }

        // Punctuation micro-pause
        const lastChar = chunk.trimEnd().slice(-1)
        if (/[.?!]/.test(lastChar)) {
          pauseUntil.current = ts + 150 + Math.random() * 100
          prevTS.current = 0  // reset dt so the pause gap isn't credited as typing time
        } else if (/[,;:]/.test(lastChar)) {
          pauseUntil.current = ts + 50 + Math.random() * 50
          prevTS.current = 0
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      startedRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!rawText, prefersReduced])

  return { isAnimating, flush }
}
