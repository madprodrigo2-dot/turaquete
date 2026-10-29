import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  getRaquetasPorSlug, getRaquetasPorNivel, getTopRaquetasPorNivel,
  getRaquetasConforto, getTopRaquetasConforto,
} from '@/lib/recommend'
import { derivarNivel } from '@/lib/nivel'
import CompareView from '@/components/CompareView'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/site'

export const revalidate = 300

interface Props {
  params: Promise<{ par: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { par } = await params
  const vsIdx = par.indexOf('-vs-')
  if (vsIdx === -1) return { title: 'Comparar Raquetes' }
  const slugs = [par.slice(0, vsIdx), par.slice(vsIdx + 4)]
  const rackets = await getRaquetasPorSlug(slugs)
  if (rackets.length < 2) return { title: 'Comparar Raquetes' }
  return {
    title: `${rackets[0].name} vs ${rackets[1].name}: Comparativo e Qual Escolher`,
    description: `Compare ${rackets[0].name} e ${rackets[1].name} lado a lado: peso, balance, material e preço. Descubra qual é a ideal para o seu jogo.`,
    alternates: { canonical: `${SITE_URL}/comparar/${par}` },
  }
}

export default async function CompararParPage({ params }: Props) {
  const { par } = await params
  const vsIdx = par.indexOf('-vs-')
  if (vsIdx === -1) redirect('/comparar')
  const slugs = [par.slice(0, vsIdx), par.slice(vsIdx + 4)]

  const rackets = await getRaquetasPorSlug(slugs)
  if (rackets.length < 2) redirect('/comparar')

  // Top Pick ativa — mesmo dado/lógica do CTA dourado na ficha de detalhe.
  // Busca cada pool (nível/conforto) só 1x mesmo que as 2 raquetes comparadas
  // compartilhem nível, ou que nenhuma precise do pool de conforto.
  const niveis = [...new Set(rackets.map(r => derivarNivel(r)).filter((n): n is 'iniciante' | 'intermediario' | 'avancado' => n != null))]
  const precisaConforto = rackets.some(r => r.racket_insights?.elbow_friendly)
  const [porNivel, porConforto] = await Promise.all([
    Promise.all(niveis.map(n => getRaquetasPorNivel(n).then(pool => getTopRaquetasPorNivel(n, pool, 4)).catch(() => []))),
    precisaConforto ? getRaquetasConforto().then(pool => getTopRaquetasConforto(pool, 4)).catch(() => []) : Promise.resolve([]),
  ])
  // Array, não Set — props de Server pra Client Component precisam ser
  // serializáveis (JSON), Set não passa pela ponte RSC.
  const topPickIds = [...new Set([...porNivel.flat(), ...porConforto].map(r => r.id))]

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Turaquete', url: SITE_URL },
    { name: 'Comparar', url: `${SITE_URL}/comparar` },
    { name: `${rackets[0].name} vs ${rackets[1].name}` },
  ])

  return (
    <div className="min-h-screen sand-texture">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="sticky top-0 z-30 bg-[#FBF6EF]/90 backdrop-blur-sm border-b border-[rgba(14,58,64,0.06)]">
        <div className="max-w-4xl lg:max-w-7xl mx-auto px-5 md:px-8 py-3">
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

      <div className="max-w-4xl lg:max-w-7xl mx-auto px-5 md:px-8 py-8">
        <CompareView rackets={rackets} topPickIds={topPickIds} />
      </div>
    </div>
  )
}
