import type { Metadata } from 'next'
import Link from 'next/link'
import { listarRaquetas } from '@/lib/recommend'
import DiscoveryPageLayout from '@/components/DiscoveryPageLayout'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Buscar Raquetes de Beach Tennis | Turaquete',
  description: 'Encontre raquetes de beach tennis pelo nome ou marca. Busca em todo o catálogo Turaquete.',
}

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const rackets = await listarRaquetas().catch(() => [])
  const initialQuery = q?.trim() ?? ''

  return (
    <DiscoveryPageLayout
      icon={
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="7.5" stroke="#0CC0BE" strokeWidth="2" />
          <path d="M18 18l6 6" stroke="#0CC0BE" strokeWidth="2" strokeLinecap="round" />
        </svg>
      }
      title="Buscar raquetes"
      subtitle="Encontre pelo nome do modelo ou marca"
      rackets={rackets}
      defaultSort="menor-preco"
      showPrecoFilter={false}
      showTextSearch
      initialQuery={initialQuery}
    />
  )
}
