import type { FaixaIdeal } from '@/lib/scorer'

// Balance range in cm by balance_preferido — setup guide for the user, not a filter.
// Derived from playing style; all catalog rackets are balance médio and are never excluded.
const BALANCE_CM: Record<string, string> = {
  'medio_ou_cabo':   'Balance 24.5–25.5 cm',
  'leve_cabo':       'Balance 24.0–25.0 cm',
  'medio':           'Balance 25.0–26.0 cm',
  'medio_ou_cabeca': 'Balance 25.5–26.5 cm',
}

// Rótulo curto pro grid — mesmo vocabulário de balance do CLAUDE.md.
const BALANCE_SHORT: Record<string, string> = {
  'medio_ou_cabo':   'méd/cabo',
  'leve_cabo':       'cabo',
  'medio':           'médio',
  'medio_ou_cabeca': 'méd/cabeça',
}

const NIVEL_SHORT: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Interm.',
  avancado: 'Avançado',
}

interface Props {
  faixa: FaixaIdeal
  nivel?: 'iniciante' | 'intermediario' | 'avancado'
}

export default function DiagnosticoBlock({ faixa, nivel }: Props) {
  const balanceRange = BALANCE_CM[faixa.balance_preferido] ?? 'Balance médio'
  const balanceShort = BALANCE_SHORT[faixa.balance_preferido] ?? 'médio'
  const pesoIdeal = Math.round((faixa.peso_min + faixa.peso_max) / 2)
  const prioridade = faixa.prioridades[0]

  return (
    <div className="mt-2 rounded-2xl overflow-hidden border border-aqua/30">
      <div className="bg-[#F4F8F7] px-3.5 py-2 border-b border-aqua/20">
        <span className="text-tinta/50 text-[9px] font-bold uppercase tracking-wider">Seu perfil calculado</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-tinta/[0.09]">
        <div className="bg-white px-3 py-2.5">
          <p className="text-tinta/40 text-[8px] font-bold uppercase tracking-wider">Peso ideal</p>
          <p className="font-heading font-bold text-tinta text-[14px] md:text-[17px] mt-1">{pesoIdeal} g</p>
        </div>
        <div className="bg-white px-3 py-2.5">
          <p className="text-tinta/40 text-[8px] font-bold uppercase tracking-wider">Balance</p>
          <p className="font-heading font-bold text-tinta text-[14px] md:text-[17px] mt-1">{balanceShort}</p>
        </div>
        <div className="bg-white px-3 py-2.5">
          <p className="text-tinta/40 text-[8px] font-bold uppercase tracking-wider">Nível</p>
          <p className="font-heading font-bold text-tinta text-[14px] md:text-[17px] mt-1">{nivel ? NIVEL_SHORT[nivel] ?? nivel : '—'}</p>
        </div>
        <div className="bg-white px-3 py-2.5 min-w-0">
          <p className="text-tinta/40 text-[8px] font-bold uppercase tracking-wider">Prioridade</p>
          <p className="font-heading font-bold text-tinta text-[12px] md:text-[14px] leading-tight mt-1 capitalize break-words">{prioridade ?? '—'}</p>
        </div>
      </div>
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
