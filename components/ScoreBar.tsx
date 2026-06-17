import type { ReactNode } from 'react'

interface Props {
  label?: ReactNode
  sublabel?: ReactNode
  value: number | null
  color?: string
  badge?: string
}

export default function ScoreBar({ label, sublabel, value, color = '#0CC0BE', badge }: Props) {
  if (value === null) return null
  const hasLabel = label !== undefined || sublabel !== undefined
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
        style={{ backgroundColor: `${color}26` }}
      >
        <div
          className="h-3 rounded-full"
          style={{ width: `${value * 10}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-tinta font-semibold text-sm w-5 text-right tabular-nums">{value}</span>
      {badge && (
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
