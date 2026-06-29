'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export function InfoTooltip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const show = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ x: r.left + r.width / 2, y: r.top - 8 })
  }

  const tooltip = pos && mounted ? createPortal(
    <span
      className="fixed z-[9999] w-56 bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-2xl pointer-events-none leading-relaxed whitespace-normal"
      style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
    >
      {text}
      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </span>,
    document.body
  ) : null

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={btnRef}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onFocus={show}
        onBlur={() => setPos(null)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold ml-1 cursor-help hover:bg-gray-300 transition-colors"
        tabIndex={-1}
        aria-label={text}
      >
        ?
      </button>
      {tooltip}
    </span>
  )
}
