import type { Metadata } from 'next'
import { getRaquetasPorOrcamento } from '@/lib/recommend'
import DiscoveryPageLayout from '@/components/DiscoveryPageLayout'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Raquetes de Beach Tennis Custo-Benefício | Turaquete',
  description: 'Raquetes de beach tennis com o melhor custo-benefício. Bom desempenho real sem precisar gastar muito. Especificações verificadas.',
  alternates: { canonical: 'https://www.turaquete.com.br/raquetes/custo-beneficio' },
}

export default async function CustoBeneficioPage() {
  const rackets = await getRaquetasPorOrcamento(850).catch(() => [])
  return (
    <DiscoveryPageLayout
      imageUrl="/ilustracoes/custo-beneficio.webp"
      title="Custo-benefício"
      subtitle="Bom desempenho real sem gastar o máximo. Modelos que entregam acima do esperado pelo preço — ordenados do mais acessível ao topo da faixa."
      rackets={rackets}
      emptyMessage="Nenhuma raquete nessa faixa de preço no momento."
      defaultSort="menor-preco"
      showPrecoFilter={false}
    />
  )
}
