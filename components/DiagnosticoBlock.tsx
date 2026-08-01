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
    <div className="mt-2 rounded-xl overflow-hidden">
      <div className="bg-coral px-3.5 py-1">
        <p className="text-white text-[10px] font-bold uppercase tracking-wider">Seu perfil ideal</p>
      </div>
      <div className="bg-tinta px-3.5 py-2 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-white text-[13px] font-bold">{faixa.peso_min}–{faixa.peso_max}g</span>
          <span className="text-white/30 text-[13px]">·</span>
          <span className="text-white/80 text-[13px]">{balanceRange}</span>
        </div>
        {faixa.prioridades.length > 0 && (
          <span className="text-white/60 text-[11px]">{faixa.prioridades.join(' · ')}</span>
        )}
      </div>
    </div>
  )
}
