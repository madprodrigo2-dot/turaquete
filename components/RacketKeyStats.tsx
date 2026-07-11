import { RacketWithInsights } from '@/lib/recommend'
import { getSweetSpotCopy, getSweetSpotChipClass } from '@/lib/sweetSpot'

interface Props {
  racket: RacketWithInsights
}

export default function RacketKeyStats({ racket }: Props) {
  const ins = racket.racket_insights
  if (!ins) return null

  const extra = (racket.specs_extra ?? {}) as Record<string, unknown>
  const saidaDeBolaRaw = extra.saida_de_bola as string | undefined
  const saidaDeBola = saidaDeBolaRaw === 'rascunho_pendente' ? undefined : saidaDeBolaRaw
  const power = ins.power ?? 0

  // specs_extra.sweet_spot deprecated — derivado em runtime de ins.forgiveness
  const sweetSpotCopy = getSweetSpotCopy(ins.forgiveness)
  const sweetSpotChipClass = getSweetSpotChipClass(ins.forgiveness)

  if (!saidaDeBola && !sweetSpotCopy) return null

  const saidaChipClass = saidaDeBola === 'fácil'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : saidaDeBola === 'exigente'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-100 text-gray-600 border-gray-200'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {saidaDeBola && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${saidaChipClass}`}>
            Saída de bola:{' '}
            {saidaDeBola === 'fácil'
              ? 'fácil (devolve sem esforço)'
              : saidaDeBola === 'exigente'
              ? 'exigente (exige batida forte)'
              : 'média (pede batida moderada)'}
          </span>
        )}
        {sweetSpotCopy && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sweetSpotChipClass}`}>
            Sweet spot: {sweetSpotCopy.chip}
          </span>
        )}
      </div>
      {saidaDeBola && (
        <div className="flex items-start gap-2 bg-[#FBF6EF] border border-[rgba(14,58,64,0.06)] rounded-xl px-3 py-2.5">
          <span className="text-aqua shrink-0 mt-0.5 text-sm">ℹ</span>
          <div className="flex flex-col gap-1.5">
            <p className="text-tinta/70 text-xs leading-relaxed">
              Potência mede o teto da raquete com batida rápida e técnica. Saída de bola mostra o quanto ela rende com batida mais suave.
            </p>
            {power >= 8 && saidaDeBola === 'exigente' && (
              <p className="text-amber-700 text-xs leading-relaxed">
                Essa só entrega a potência toda com técnica. Com batida suave, ela rende menos que uma macia.
              </p>
            )}
            {saidaDeBola === 'fácil' && (
              <p className="text-emerald-700 text-xs leading-relaxed">
                Rende bem mesmo com batida suave, ideal pra quem tá evoluindo.
              </p>
            )}
          </div>
        </div>
      )}
      {sweetSpotCopy && (
        <div className="flex items-start gap-2 bg-[#FBF6EF] border border-[rgba(14,58,64,0.06)] rounded-xl px-3 py-2.5">
          <span className="text-aqua shrink-0 mt-0.5 text-sm">ℹ</span>
          <p className="text-tinta/70 text-xs leading-relaxed">{sweetSpotCopy.descricao}</p>
        </div>
      )}
    </div>
  )
}
