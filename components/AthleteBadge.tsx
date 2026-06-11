interface Props {
  athlete: string
  variant?: 'overlay' | 'modal'
}

function parse(raw: string): { label: string; isSenna: boolean } {
  // Truncate before parenthesis: "Edição Ayrton Senna (embaixador: ...)" → "Edição Ayrton Senna"
  const label = raw.includes('(') ? raw.split('(')[0].trim() : raw.trim()
  return { label, isSenna: raw.toLowerCase().includes('senna') }
}

export default function AthleteBadge({ athlete, variant = 'overlay' }: Props) {
  const { label, isSenna } = parse(athlete)

  if (variant === 'modal') {
    return (
      <span className="flex items-center gap-1 text-tinta/50 text-xs mt-0.5">
        <span aria-hidden="true" style={{ fontSize: '9px' }}>★</span>
        Raquete assinada por {label}
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold leading-tight whitespace-nowrap"
      style={isSenna
        ? { background: '#FFC42E', color: '#0E3A40' }
        : { background: '#0E3A40', color: '#ffffff' }
      }
    >
      <span aria-hidden="true" style={{ fontSize: '8px' }}>{isSenna ? '✦' : '★'}</span>
      {label}
    </span>
  )
}
