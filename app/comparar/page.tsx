import type { Metadata } from 'next'
import Link from 'next/link'
import { listarRaquetas } from '@/lib/recommend'
import ComparePicker from '@/components/ComparePicker'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Comparar Raquetes de Beach Tennis | Turaquete',
  description: 'Compare raquetes de beach tennis lado a lado. Veja pontuacoes, especificacoes e precos para escolher a melhor opcao para o seu jogo.',
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>
}) {
  const { a } = await searchParams
  const rackets = await listarRaquetas().catch(() => [])
  const initialSlotA = a ? rackets.find(r => r.slug === a) : undefined

  return (
    <div className="min-h-screen sand-texture">
      <div className="sticky top-0 z-30 bg-aqua-light/90 backdrop-blur-sm border-b border-aqua/20 px-5 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-tinta text-sm font-medium hover:text-aqua transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Inicio
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-bold text-tinta">Comparar raquetes</h1>
          <p className="text-tinta/60 text-sm">
            {initialSlotA
              ? `${initialSlotA.name} já está no slot A — escolha a segunda raquete.`
              : 'Escolha duas raquetes para comparar pontuacoes e especificacoes lado a lado.'}
          </p>
        </div>
        <ComparePicker rackets={rackets} initialSlotA={initialSlotA} />
      </div>
    </div>
  )
}
