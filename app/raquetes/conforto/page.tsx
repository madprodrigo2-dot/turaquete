import type { Metadata } from 'next'
import { getRaquetasConforto } from '@/lib/recommend'
import DiscoveryPageLayout from '@/components/DiscoveryPageLayout'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Raquetes de Beach Tennis para Cotovelo e Ombro | Turaquete',
  description: 'Raquetes de beach tennis leves nas articulações. Modelos com absorção de vibração e saída de bola suave, indicados para quem tem sensibilidade no cotovelo ou ombro.',
  alternates: { canonical: 'https://www.turaquete.com.br/raquetes/conforto' },
}

function IconConforto() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L4 5.5v5.5C4 16 7.5 20.5 12 22c4.5-1.5 8-6 8-11V5.5L12 2z" fill="#0CC0BE" opacity="0.15" stroke="#0CC0BE" strokeWidth="1.5"/>
      <path d="M8.5 12l2.5 2.5 4.5-4.5" stroke="#0CC0BE" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default async function ConfortoPage() {
  const rackets = await getRaquetasConforto().catch(() => [])
  return (
    <DiscoveryPageLayout
      icon={<IconConforto />}
      title="Leve nas articulações"
      subtitle="Raquetes indicadas para quem tem sensibilidade no cotovelo ou ombro. Modelos com absorção de vibração e saída de bola suave."
      rackets={rackets}
      emptyMessage="Nenhuma raquete com esse perfil catalogada ainda."
      pageNivel="conforto"
    />
  )
}
