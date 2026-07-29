'use client'

import { useRef, useEffect, useState, type ReactNode } from 'react'

interface Props {
  label?: ReactNode
  sublabel?: ReactNode
  value: number | null
  color?: string
  badge?: string
  highlight?: boolean
  muted?: boolean
  delay?: number
}

export default function ScoreBar({ label, sublabel, value, color = '#0CC0BE', badge, highlight, muted, delay = 0 }: Props) {
  if (value === null) return null

  const barColor   = muted ? '#CBD5E1' : color
  const trackColor = muted ? '#CBD5E133' : `${color}26`
  const hasLabel   = label !== undefined || sublabel !== undefined

  const ref    = useRef<HTMLDivElement>(null)
  const fired  = useRef(false)
  const [count,   setCount]   = useState(0)
  const [barPct,  setBarPct]  = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const run = () => {
      if (reduced) { setCount(value); setBarPct(value * 10); return }
      const dur  = 700
      const t0   = performance.now()
      const tick = (now: number) => {
        const p    = Math.min((now - t0) / dur, 1)
        const ease = 1 - Math.pow(1 - p, 3)
        setCount(Math.round(ease * value))
        setBarPct(ease * value * 10)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || fired.current) return
        fired.current = true
        if (delay) setTimeout(run, delay)
        else run()
        observer.disconnect()
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value, delay])

  return (
    <div ref={ref} className="flex items-center gap-3">
      {hasLabel && (
        <div className="w-28 shrink-0">
          {label}
          {sublabel !== undefined && (
            <div className="text-[10px] text-tinta/40 leading-tight">{sublabel}</div>
          )}
        </div>
      )}
      <div
        className="flex-1 rounded-full h-3 overflow-hidden"
        style={{ backgroundColor: trackColor }}
      >
        <div
          className="h-3 rounded-full"
          style={{
            width: `${barPct}%`,
            backgroundColor: barColor,
            transition: 'width 0ms',
          }}
        />
      </div>
      <span
        className={`text-sm w-5 text-right ${
          muted ? 'font-medium text-tinta/30' : highlight ? 'font-bold' : 'font-semibold text-tinta'
        }`}
        style={{
          fontVariantNumeric: 'tabular-nums',
          ...(highlight && !muted ? { color } : {}),
        }}
      >
        {count}
      </span>
      {badge && !muted && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}
