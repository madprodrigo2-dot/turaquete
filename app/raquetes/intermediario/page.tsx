import type { Metadata } from 'next'
import { getRaquetasPorNivel } from '@/lib/recommend'
import DiscoveryPageLayout from '@/components/DiscoveryPageLayout'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Raquetes para Jogadores Intermediários — Beach Tennis | Turaquete',
  description: 'Raquetes de beach tennis para intermediários: equilíbrio entre controle e potência, com especificações técnicas reais e avaliação honesta.',
  alternates: { canonical: 'https://www.turaquete.com.br/raquetes/intermediario' },
}

function IconIntermediario() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2"   y="17" width="4" height="5" rx="1" fill="#0CC0BE" opacity="0.4" />
      <rect x="8.5" y="11" width="4" height="11" rx="1" fill="#0CC0BE" />
      <rect x="15"  y="9"  width="4" height="13" rx="1" fill="#0CC0BE" opacity="0.4" />
    </svg>
  )
}

export default async function IntermediarioPage() {
  const rackets = await getRaquetasPorNivel('intermediario').catch(() => [])
  return (
    <DiscoveryPageLayout
      icon={<IconIntermediario />}
      title="Intermediários"
      subtitle="Equilíbrio entre controle e potência. Para quem já domina o básico e quer evoluir sem abrir mão da consistência."
      rackets={rackets}
      emptyMessage="Nenhuma raquete intermediária catalogada ainda."
      pageNivel="intermediario"
    />
  )
}
