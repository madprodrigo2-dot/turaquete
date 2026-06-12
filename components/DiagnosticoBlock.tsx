import type { FaixaIdeal } from '@/lib/scorer'

const BALANCE_LABEL: Record<string, string> = {
  'medio':           'Balance médio',
  'medio_ou_cabo':   'Balance médio ou ao cabo',
  'medio_ou_cabeca': 'Balance médio ou à cabeça',
  'leve_cabo':       'Balance ao cabo',
}

interface Props {
  faixa: FaixaIdeal
}

export default function DiagnosticoBlock({ faixa }: Props) {
  const balanceLabel = BALANCE_LABEL[faixa.balance_preferido] ?? faixa.balance_preferido

  return (
    <div className="mt-2 rounded-xl bg-aqua/10 border border-aqua/25 px-3.5 py-3 flex flex-col gap-1.5">
      <p className="text-tinta/40 text-[10px] font-semibold uppercase tracking-wider">Seu perfil ideal</p>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-tinta text-sm font-semibold">{faixa.peso_min}–{faixa.peso_max}g</span>
        <span className="text-tinta/25 text-sm">·</span>
        <span className="text-tinta/80 text-sm">{balanceLabel}</span>
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
