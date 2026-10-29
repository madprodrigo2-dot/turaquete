import type { Metadata } from 'next'
import { getRaquetasPorNivel, getTopRaquetasPorNivel } from '@/lib/recommend'
import DiscoveryPageLayout from '@/components/DiscoveryPageLayout'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Raquetes para Jogadores Avançados — Beach Tennis',
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
  // topN=4: desktop mostra 4 numa grade fechada (sem buraco), mobile corta pra
  // 3 na lista compacta — ver TopPicksSection.tsx.
  const topPicks = await getTopRaquetasPorNivel('avancado', rackets, 4).catch(() => [])
  return (
    <DiscoveryPageLayout
      imageUrl="/ilustracoes/perfil-avancado.webp"
      title="Avançados"
      subtitle="Exigem técnica e oferecem potência máxima. Para quem já joga no limite."
      rackets={rackets}
      emptyMessage="Nenhuma raquete avançada catalogada ainda."
      defaultSort="potencia"
      topPicks={topPicks}
      topPicksTitle="Mais recomendadas para avançados"
      topPicksSubtitle="as escolhas mais frequentes do consultor pra quem já joga no limite"
    />
  )
}
