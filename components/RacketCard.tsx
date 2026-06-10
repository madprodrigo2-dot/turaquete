import { RacketWithInsights } from '@/lib/recommend'

interface Props {
  racket: RacketWithInsights
  razao: string
}

export default function RacketCard({ racket, razao }: Props) {
  // Botão: affiliate_url > source_url > sem botão
  const ctaUrl = racket.affiliate_url ?? racket.source_url ?? null
  const ctaLabel = racket.affiliate_url ? 'Ver no Mercado Livre' : 'Ver na loja'

  const price = racket.price
    ? `R$ ${racket.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
    : null

  const nameDisplay = racket.model_year
    ? `${racket.name} ${racket.model_year}`
    : racket.name

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden w-full max-w-sm">
      {/* Imagem */}
      {racket.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={racket.image_url}
          alt={racket.name}
          className="w-full h-40 object-contain bg-gray-50 p-3"
        />
      ) : (
        <div className="w-full h-40 bg-gray-50 flex items-center justify-center text-4xl select-none">
          🏓
        </div>
      )}

      {/* Conteúdo */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-900 text-sm leading-tight">{nameDisplay}</p>
          {price && (
            <span className="text-emerald-700 font-semibold text-sm shrink-0">{price}</span>
          )}
        </div>

        <p className="text-gray-600 text-xs leading-relaxed">{razao}</p>

        {racket.weight_g && (
          <p className="text-gray-400 text-xs">{racket.weight_g}g · {racket.balance ?? ''}</p>
        )}

        {ctaUrl && (
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 w-full text-center rounded-lg bg-emerald-600 text-white text-xs font-medium py-2 px-3 hover:bg-emerald-700 active:scale-95 transition-all"
          >
            {ctaLabel} →
          </a>
        )}
      </div>
    </div>
  )
}
