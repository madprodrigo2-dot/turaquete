import type { Metadata } from 'next'
import { getRaquetasPorNivel } from '@/lib/recommend'
import DiscoveryPageLayout from '@/components/DiscoveryPageLayout'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Raquetes para Iniciantes — Beach Tennis | Turaquete',
  description: 'As melhores raquetes de beach tennis para quem está começando. Modelos com alto perdão de erro, fáceis de controlar e leves na articulação.',
  alternates: { canonical: 'https://www.turaquete.com.br/raquetes/iniciante' },
}

function IconIniciante() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2"   y="17" width="4" height="5" rx="1" fill="#0CC0BE" />
      <rect x="8.5" y="13" width="4" height="9" rx="1" fill="#0CC0BE" opacity="0.5" />
      <rect x="15"  y="9"  width="4" height="13" rx="1" fill="#0CC0BE" opacity="0.3" />
    </svg>
  )
}

export default async function InicirantePage() {
  const rackets = await getRaquetasPorNivel('iniciante').catch(() => [])
  return (
    <DiscoveryPageLayout
      icon={<IconIniciante />}
      title="Para iniciantes"
      subtitle="Raquetes com alto perdão de erro, controle fácil e saída de bola amigável — ideais para quem está começando no beach tennis."
      rackets={rackets}
      emptyMessage="Nenhuma raquete iniciante catalogada ainda."
      defaultSort="menor-preco"
    />
  )
}
