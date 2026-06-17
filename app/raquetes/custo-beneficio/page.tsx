import type { Metadata } from 'next'
import { getRaquetasPorOrcamento } from '@/lib/recommend'
import DiscoveryPageLayout from '@/components/DiscoveryPageLayout'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Raquetes de Beach Tennis Custo-Benefício | Turaquete',
  description: 'Raquetes de beach tennis com o melhor custo-benefício. Bom desempenho real sem precisar gastar muito. Especificações verificadas.',
}

function IconCustoBeneficio() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#0CC0BE" opacity="0.12" stroke="#0CC0BE" strokeWidth="1.5"/>
      <path d="M12 7v1.5M12 15.5V17M9.5 9.5C9.5 8.4 10.6 7.5 12 7.5s2.5.9 2.5 2c0 2-2.5 2.5-2.5 4.5M12 15.5h.01" stroke="#0CC0BE" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

export default async function CustoBeneficioPage() {
  const rackets = await getRaquetasPorOrcamento(850).catch(() => [])
  return (
    <DiscoveryPageLayout
      icon={<IconCustoBeneficio />}
      title="Custo-benefício"
      subtitle="Bom desempenho real sem gastar o máximo. Modelos que entregam acima do esperado pelo preço — ordenados do mais acessível ao topo da faixa."
      rackets={rackets}
      emptyMessage="Nenhuma raquete nessa faixa de preço no momento."
    />
  )
}
