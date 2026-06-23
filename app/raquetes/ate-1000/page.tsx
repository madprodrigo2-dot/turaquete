import type { Metadata } from 'next'
import { getRaquetasPorOrcamento } from '@/lib/recommend'
import DiscoveryPageLayout from '@/components/DiscoveryPageLayout'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Raquetes de Beach Tennis até R$1.000 | Turaquete',
  description: 'As melhores raquetes de beach tennis com preço até R$1.000. Curadoria com especificações reais, sem achismo.',
  alternates: { canonical: 'https://www.turaquete.com.br/raquetes/ate-1000' },
}

function IconOrcamento() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="6" width="20" height="14" rx="2.5" fill="#0CC0BE" opacity="0.15" stroke="#0CC0BE" strokeWidth="1.5"/>
      <line x1="2" y1="10" x2="22" y2="10" stroke="#0CC0BE" strokeWidth="1.5"/>
      <rect x="5" y="14" width="4" height="2.5" rx="0.75" fill="#0CC0BE"/>
      <rect x="11" y="14" width="3" height="2.5" rx="0.75" fill="#0CC0BE" opacity="0.6"/>
    </svg>
  )
}

export default async function Ate1000Page() {
  const rackets = await getRaquetasPorOrcamento(1000).catch(() => [])
  return (
    <DiscoveryPageLayout
      icon={<IconOrcamento />}
      title="Até R$1.000"
      subtitle="As melhores opções dentro desse orçamento. Ordenadas por preço para facilitar a comparação."
      rackets={rackets}
      emptyMessage="Nenhuma raquete nessa faixa de preço no momento."
    />
  )
}
