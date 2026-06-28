'use client'
import { useState } from 'react'

export function InfoTooltip({ text, side = 'top' }: { text: string; side?: 'top' | 'bottom' }) {
  const [show, setShow] = useState(false)
  const isTop = side === 'top'
  return (
    <span className="relative inline-flex align-middle">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold ml-1 cursor-help hover:bg-gray-300 transition-colors"
        tabIndex={-1}
        aria-label={text}
      >
        ?
      </button>
      {show && (
        <span
          className={`absolute ${isTop ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 z-50 w-52 bg-gray-800 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl pointer-events-none leading-relaxed whitespace-normal`}
        >
          {text}
          <span
            className={`absolute ${isTop ? 'top-full border-t-gray-800' : 'bottom-full border-b-gray-800'} left-1/2 -translate-x-1/2 border-4 border-transparent`}
          />
        </span>
      )}
    </span>
  )
}
