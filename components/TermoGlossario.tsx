'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
// WARN: always sendGAEvent('event','name',params) — object form sendGAEvent({event}) is silently discarded by GA4 (v16.2.9 pushes arguments, not named args)
import { sendGAEvent } from '@next/third-parties/google'
import type { GlossarioEntry } from '@/lib/glossario'
import { X, ArrowUpRight } from '@phosphor-icons/react'

interface Props {
  entry: GlossarioEntry
  children: React.ReactNode
  className?: string
}

interface TooltipPos {
  top: number
  left: number
  above: boolean
}

function AnatomiaOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="relative max-w-sm w-full mx-4"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/anatomia-raquete.webp"
          alt="Anatomia da raquete de beach tennis"
          className="w-full rounded-2xl shadow-2xl"
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          aria-label="Fechar"
        >
          <X size={12} weight="regular" />
        </button>
      </div>
    </div>,
    document.body
  )
}

function Tooltip({ entry, triggerRef, onClose }: {
  entry: GlossarioEntry
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const [pos, setPos] = useState<TooltipPos | null>(null)
  const [showAnatomia, setShowAnatomia] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const above = rect.top > 140
    setPos({
      top: above ? rect.top - 8 : rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - 240),
      above,
    })
  }, [triggerRef])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, triggerRef])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!pos) return null

  return createPortal(
    <>
      <div
        ref={tooltipRef}
        role="tooltip"
        className="fixed z-[9000] w-56 rounded-xl bg-white shadow-lg border border-gray-100 px-3.5 py-3 text-sm leading-snug"
        style={{
          top: pos.above ? undefined : pos.top,
          bottom: pos.above ? window.innerHeight - pos.top : undefined,
          left: pos.left,
        }}
      >
        <p className="font-semibold text-tinta text-xs mb-1">{entry.termo}</p>
        <p className="text-tinta/70 text-xs leading-relaxed">{entry.definicao}</p>
        {entry.noAnatomia && (
          <button
            onClick={() => setShowAnatomia(true)}
            className="mt-2 text-[10px] font-medium text-aqua hover:text-aqua/70 transition-colors flex items-center gap-1"
          >
            <ArrowUpRight size={10} weight="regular" />
            ver no desenho da raquete
          </button>
        )}
      </div>
      {showAnatomia && <AnatomiaOverlay onClose={() => setShowAnatomia(false)} />}
    </>,
    document.body
  )
}

export default function TermoGlossario({ entry, children, className }: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const handleOpen = useCallback(() => {
    if (open) { setOpen(false); return }
    setOpen(true)
    sendGAEvent('event', 'glossario_aberto', { termo: entry.termo })
  }, [open, entry.termo])

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className={className ?? "inline border-b border-dashed border-aqua/50 text-inherit hover:border-aqua transition-colors focus:outline-none"}
        aria-expanded={open}
        aria-label={`Definição: ${entry.termo}`}
      >
        {children}
      </button>
      {open && (
        <Tooltip
          entry={entry}
          triggerRef={triggerRef}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
