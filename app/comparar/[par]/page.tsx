import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getRaquetasPorSlug } from '@/lib/recommend'
import CompareView from '@/components/CompareView'

export const revalidate = 300

interface Props {
  params: Promise<{ par: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { par } = await params
  const vsIdx = par.indexOf('-vs-')
  if (vsIdx === -1) return { title: 'Comparar Raquetes | Turaquete' }
  const slugs = [par.slice(0, vsIdx), par.slice(vsIdx + 4)]
  const rackets = await getRaquetasPorSlug(slugs)
  if (rackets.length < 2) return { title: 'Comparar Raquetes | Turaquete' }
  return {
    title: `${rackets[0].name} vs ${rackets[1].name} | Turaquete`,
    description: `Compare ${rackets[0].name} e ${rackets[1].name}: pontuacoes, especificacoes e precos.`,
  }
}

export default async function CompararParPage({ params }: Props) {
  const { par } = await params
  const vsIdx = par.indexOf('-vs-')
  if (vsIdx === -1) redirect('/comparar')
  const slugs = [par.slice(0, vsIdx), par.slice(vsIdx + 4)]

  const rackets = await getRaquetasPorSlug(slugs)
  if (rackets.length < 2) redirect('/comparar')

  return (
    <div className="min-h-screen sand-texture">
      <div className="sticky top-0 z-30 bg-[#FBF6EF]/90 backdrop-blur-sm border-b border-[rgba(14,58,64,0.06)]">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-3">
          <Link
            href="/comparar"
            className="flex items-center gap-2 text-tinta text-sm font-medium hover:text-aqua transition-colors w-fit"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Comparar
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 md:px-8 py-8">
        <CompareView rackets={rackets} />
      </div>
    </div>
  )
}
