interface Props {
  updatedAt?: string | null
  affiliateUrl?: string | null
  className?: string
}

export default function PriceNote({ updatedAt, affiliateUrl, className = '' }: Props) {
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
      })
    : null

  return (
    <p className={`text-[10px] text-tinta/40 leading-snug ${className}`}>
      Preço de referência.{' '}
      {affiliateUrl ? (
        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-aqua transition-colors"
        >
          Confira o valor atual no Mercado Livre
        </a>
      ) : (
        'Confira o valor atual na loja'
      )}
      .
      {updatedLabel && (
        <span className="text-tinta/30"> Atualizado em {updatedLabel}.</span>
      )}
    </p>
  )
}
