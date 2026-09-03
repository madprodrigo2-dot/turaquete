import type { Metadata } from 'next'
import { getRaquetasPorOrcamento } from '@/lib/recommend'
import DiscoveryPageLayout from '@/components/DiscoveryPageLayout'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Raquetes de Beach Tennis até R$1.000 | Turaquete',
  description: 'As melhores raquetes de beach tennis com preço até R$1.000. Curadoria com especificações reais, sem achismo.',
  alternates: { canonical: 'https://www.turaquete.com.br/raquetes/ate-1000' },
}

export default async function Ate1000Page() {
  const rackets = await getRaquetasPorOrcamento(1000).catch(() => [])
  return (
    <DiscoveryPageLayout
      imageUrl="/ilustracoes/ate-1000.webp"
      title="Até R$1.000"
      subtitle="As melhores opções dentro desse orçamento. Ordenadas por preço para facilitar a comparação."
      rackets={rackets}
      emptyMessage="Nenhuma raquete nessa faixa de preço no momento."
      defaultSort="menor-preco"
      showPrecoFilter={false}
    />
  )
}
