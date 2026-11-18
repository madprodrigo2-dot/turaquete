import type { RacketWithInsights } from '@/lib/recommend'
import { nivelRange, NIVEIS, NIVEL_NOME, type NivelFit } from '@/lib/nivelRange'

// Barra "nível recomendado": 3 segmentos (Iniciante - Intermediário - Avançado).
// Cheio = onde rende melhor; claro = funciona, mas não é o ponto forte; vazio =
// abaixo do piso. Derivada do motor (lib/nivelRange.ts), nada manual.

const SEG: Record<NivelFit, string> = {
  melhor: 'bg-aqua',
  ok: 'bg-aqua/25',
  fora: 'bg-tinta/10',
}

export default function PdpNivelBar({ racket }: { racket: RacketWithInsights }) {
  const range = nivelRange(racket)
  if (!range) return null

  return (
    <div className="flex flex-col gap-2" aria-label={`Nível recomendado: ${range.texto}`}>
      <div className="flex items-center justify-between">
        <p className="text-tinta font-semibold text-sm">Nível recomendado</p>
        <div className="flex items-center gap-3 text-[10px] text-tinta/50">
          <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-sm bg-aqua" aria-hidden="true" />rende melhor</span>
          <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-sm bg-aqua/25" aria-hidden="true" />funciona</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {NIVEIS.map(n => (
          <div key={n} className="flex flex-col gap-1">
            <div className={`h-2.5 rounded-full ${SEG[range.fit[n]]}`} />
            <span className={`text-[11px] text-center leading-tight ${range.fit[n] === 'melhor' ? 'text-tinta font-semibold' : range.fit[n] === 'ok' ? 'text-tinta/60' : 'text-tinta/30'}`}>
              {NIVEL_NOME[n]}
            </span>
          </div>
        ))}
      </div>
      <p className="text-tinta/70 text-xs leading-relaxed">{range.texto}.</p>
    </div>
  )
}
