import type { FaixaIdeal } from '@/lib/scorer'

// Balance range in cm by balance_preferido — setup guide for the user, not a filter.
// Derived from playing style; all catalog rackets are balance médio and are never excluded.
const BALANCE_CM: Record<string, string> = {
  'medio_ou_cabo':   'Balance 24.5–25.5 cm',
  'leve_cabo':       'Balance 24.0–25.0 cm',
  'medio':           'Balance 25.0–26.0 cm',
  'medio_ou_cabeca': 'Balance 25.5–26.5 cm',
}

interface Props {
  faixa: FaixaIdeal
}

export default function DiagnosticoBlock({ faixa }: Props) {
  const balanceRange = BALANCE_CM[faixa.balance_preferido] ?? 'Balance médio'

  return (
    <div className="mt-2 rounded-xl bg-aqua/10 border border-aqua/25 px-3.5 py-3 flex flex-col gap-1.5">
      <p className="text-tinta/40 text-[10px] font-semibold uppercase tracking-wider">Seu perfil ideal</p>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-tinta text-sm font-semibold">{faixa.peso_min}–{faixa.peso_max}g</span>
        <span className="text-tinta/25 text-sm">·</span>
        <span className="text-tinta/80 text-sm">{balanceRange}</span>
        {faixa.prioridades.length > 0 && (
          <>
            <span className="text-tinta/25 text-sm">·</span>
            <span className="text-tinta/60 text-sm">{faixa.prioridades.join(', ')}</span>
          </>
        )}
      </div>
    </div>
  )
}
