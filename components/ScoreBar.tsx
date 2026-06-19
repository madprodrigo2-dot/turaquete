import type { ReactNode } from 'react'

interface Props {
  label?: ReactNode
  sublabel?: ReactNode
  value: number | null
  color?: string
  badge?: string
  highlight?: boolean
  muted?: boolean
}

export default function ScoreBar({ label, sublabel, value, color = '#0CC0BE', badge, highlight, muted }: Props) {
  if (value === null) return null
  const hasLabel = label !== undefined || sublabel !== undefined
  const barColor  = muted ? '#CBD5E1' : color
  const trackColor = muted ? '#CBD5E133' : `${color}26`
  return (
    <div className="flex items-center gap-3">
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
          style={{ width: `${value * 10}%`, backgroundColor: barColor }}
        />
      </div>
      <span
        className={`text-sm w-5 text-right tabular-nums ${
          muted ? 'font-medium text-tinta/30' : highlight ? 'font-bold' : 'font-semibold text-tinta'
        }`}
        style={highlight && !muted ? { color } : undefined}
      >{value}</span>
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
