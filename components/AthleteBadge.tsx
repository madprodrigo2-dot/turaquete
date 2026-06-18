interface Props {
  athlete: string
  variant?: 'overlay' | 'modal'
}

function parse(raw: string): { label: string; isSenna: boolean } {
  // Truncate before parenthesis: "Edição Ayrton Senna (embaixador: ...)" → "Edição Ayrton Senna"
  const label = raw.includes('(') ? raw.split('(')[0].trim() : raw.trim()
  return { label, isSenna: raw.toLowerCase().includes('senna') }
}

function splitAthletes(raw: string): string[] {
  return raw.split(/[&/]/).map(s => s.trim()).filter(Boolean)
}

function Pill({ name, compact = false }: { name: string; compact?: boolean }) {
  const { label, isSenna } = parse(name)
  return (
    <span
      className={`inline-flex items-center gap-1 ${compact ? 'px-1.5' : 'px-2'} py-0.5 rounded-full text-[11px] font-semibold leading-tight`}
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

export default function AthleteBadge({ athlete, variant = 'overlay' }: Props) {
  if (variant === 'modal') {
    const { label } = parse(athlete)
    return (
      <span className="flex items-center gap-1 text-tinta/50 text-xs mt-0.5">
        <span aria-hidden="true" style={{ fontSize: '9px' }}>★</span>
        Raquete assinada por {label}
      </span>
    )
  }

  const names = splitAthletes(athlete)

  if (names.length === 1) {
    return <Pill name={names[0]} />
  }

  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name, i) => (
        <Pill key={i} name={name} compact />
      ))}
    </div>
  )
}
