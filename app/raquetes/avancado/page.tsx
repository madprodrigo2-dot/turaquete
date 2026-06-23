import type { Metadata } from 'next'
import { getRaquetasPorNivel } from '@/lib/recommend'
import DiscoveryPageLayout from '@/components/DiscoveryPageLayout'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Raquetes para Jogadores Avançados — Beach Tennis | Turaquete',
  description: 'Raquetes de beach tennis de alto desempenho para jogadores avançados. Potência máxima, controle preciso e materiais premium.',
  alternates: { canonical: 'https://www.turaquete.com.br/raquetes/avancado' },
}

function IconAvancado() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2"   y="17" width="4" height="5" rx="1" fill="#0CC0BE" opacity="0.3" />
      <rect x="8.5" y="11" width="4" height="11" rx="1" fill="#0CC0BE" opacity="0.5" />
      <rect x="15"  y="4"  width="4" height="18" rx="1" fill="#0CC0BE" />
    </svg>
  )
}

export default async function AvancadoPage() {
  const rackets = await getRaquetasPorNivel('avancado').catch(() => [])
  return (
    <DiscoveryPageLayout
      icon={<IconAvancado />}
      title="Avançados"
      subtitle="Alta performance para quem joga no limite. Modelos com materiais premium e saída de bola exigente — exigem técnica para aproveitar o máximo."
      rackets={rackets}
      emptyMessage="Nenhuma raquete avançada catalogada ainda."
      pageNivel="avancado"
    />
  )
}
