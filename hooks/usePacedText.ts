'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// Base typing speed in chars/sec (human fast typing ~60-70 cps).
const CHARS_PER_SEC = 62
// Chars per drain step. We advance this many chars then wait delayMs before the next step.
const STEP = 3
// Base delay between steps at CHARS_PER_SEC.
const BASE_DELAY_MS = (STEP / CHARS_PER_SEC) * 1000  // ≈48ms

// Max time to finish draining after stream ends (adaptive acceleration target).
const DRAIN_TARGET_MS = 1500

function computeStep(
  text: string,
  pos: number,
  isDone: boolean
): { nextPos: number; delayMs: number } {
  const remaining = text.length - pos
  if (remaining <= 0) return { nextPos: pos, delayMs: 0 }

  // Adaptive: if stream is done, scale step so buffer drains in ≤DRAIN_TARGET_MS
  let step = STEP
  if (isDone && remaining > 0) {
    const maxSteps = DRAIN_TARGET_MS / BASE_DELAY_MS  // ≈31 steps
    step = Math.max(STEP, Math.ceil(remaining / maxSteps))
  }

  // Advance, then snap forward to next word boundary (space) within a short lookahead
  let nextPos = Math.min(pos + step, text.length)
  if (nextPos < text.length) {
    const spaceIdx = text.indexOf(' ', nextPos)
    if (spaceIdx !== -1 && spaceIdx - nextPos <= 6) nextPos = spaceIdx + 1
  }
  nextPos = Math.min(nextPos, text.length)

  const chunk = text.slice(pos, nextPos)
  let delayMs = ((nextPos - pos) / CHARS_PER_SEC) * 1000

  // Micro-pauses at punctuation in the just-revealed chunk.
  // Check the last non-whitespace character of the new content.
  const lastChar = chunk.trimEnd().slice(-1)
  if (/[.?!]/.test(lastChar)) {
    delayMs += 150 + Math.random() * 100  // 150-250ms after sentence endings
  } else if (/[,;:]/.test(lastChar)) {
    delayMs += 50 + Math.random() * 50    // 50-100ms after clause breaks
  }

  return { nextPos, delayMs }
}

export interface PacedTextResult {
  /** The progressively-revealed text to display. */
  displayedText: string
  /** True while the buffer is still draining (text not fully shown yet). */
  isAnimating: boolean
  /** Call to instantly reveal all remaining text (tap-to-skip). */
  flush: () => void
}

/**
 * Reveals rawText progressively at human typing speed.
 *
 * - rawText grows as stream tokens arrive; the hook drains the buffer
 *   at ~60 chars/sec, snapping to word boundaries.
 * - isDone=true signals the stream ended; drain accelerates to finish
 *   within DRAIN_TARGET_MS (1.5s).
 * - Respects prefers-reduced-motion: shows full text instantly with no animation.
 * - flush() skips remaining animation (tap/click to skip, like a dialog).
 */
export function usePacedText(rawText: string, isDone: boolean): PacedTextResult {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [displayedText, setDisplayedText] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  // Mutable refs — read by the RAF loop without triggering re-renders
  const rafRef      = useRef(0)
  const posRef      = useRef(0)
  const nextFlushAt = useRef(0)
  const startedRef  = useRef(false)
  const rawTextRef  = useRef(rawText)
  const isDoneRef   = useRef(isDone)

  // Keep refs current every render
  rawTextRef.current = rawText
  isDoneRef.current  = isDone

  const flush = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const full = rawTextRef.current
    posRef.current = full.length
    setDisplayedText(full)
    setIsAnimating(false)
    startedRef.current = false
  }, [])

  // Effect that starts/resets the RAF loop.
  // Dependency !!rawText: runs when animation begins ('' → non-empty) or resets (non-empty → '').
  useEffect(() => {
    // Reset when rawText is cleared (new message started)
    if (!rawText) {
      cancelAnimationFrame(rafRef.current)
      posRef.current     = 0
      nextFlushAt.current = 0
      startedRef.current = false
      setDisplayedText('')
      setIsAnimating(false)
      return
    }

    // Reduced-motion: show full text instantly, no animation
    if (prefersReduced) {
      setDisplayedText(rawText)
      setIsAnimating(false)
      return
    }

    // Guard against React StrictMode double-invoke
    if (startedRef.current) return
    startedRef.current = true
    setIsAnimating(true)

    const tick = (now: number) => {
      // Wait if we're in a micro-pause
      if (now < nextFlushAt.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const text = rawTextRef.current
      const done = isDoneRef.current
      const pos  = posRef.current

      // Buffer is empty — wait for more tokens or finish if done
      if (pos >= text.length) {
        if (done) {
          setIsAnimating(false)
          startedRef.current = false
          return
        }
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const { nextPos, delayMs } = computeStep(text, pos, done)
      posRef.current     = nextPos
      nextFlushAt.current = now + delayMs

      setDisplayedText(text.slice(0, nextPos))
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      startedRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!rawText, prefersReduced])

  return { displayedText, isAnimating, flush }
}
