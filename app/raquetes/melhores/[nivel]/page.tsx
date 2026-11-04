import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRankingPorNivel, buildFaqPorNivel } from '@/lib/ranking'
import RankingPageLayout from '@/components/RankingPageLayout'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/site'

export const revalidate = 300

type Nivel = 'iniciante' | 'intermediario' | 'avancado'
const NIVEIS: Nivel[] = ['iniciante', 'intermediario', 'avancado']

const NIVEL_LABEL: Record<Nivel, string> = {
  iniciante: 'Iniciantes',
  intermediario: 'Intermediários',
  avancado: 'Avançados',
}
const NIVEL_SUBTITLE: Record<Nivel, string> = {
  iniciante: 'raquetes com alto perdão de erro, fáceis de controlar e leves na articulação',
  intermediario: 'equilíbrio entre controle e potência, pra quem já domina o básico',
  avancado: 'potência e controle no limite, pra quem já joga com técnica',
}

export async function generateStaticParams() {
  return NIVEIS.map(nivel => ({ nivel }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ nivel: string }> }
): Promise<Metadata> {
  const { nivel } = await params
  if (!NIVEIS.includes(nivel as Nivel)) return {}
  const label = NIVEL_LABEL[nivel as Nivel]
  return {
    title: `As 10 Melhores Raquetes de Beach Tennis para ${label}`,
    description: `Ranking das 10 melhores raquetes de beach tennis pra nível ${nivel}, com nota técnica, peso e balance ideais, comparação de especificações e perguntas frequentes. Dados reais.`,
    alternates: { canonical: `${SITE_URL}/raquetes/melhores/${nivel}` },
  }
}

export default async function MelhoresPorNivelPage({
  params,
}: {
  params: Promise<{ nivel: string }>
}) {
  const { nivel: nivelParam } = await params
  if (!NIVEIS.includes(nivelParam as Nivel)) notFound()
  const nivel = nivelParam as Nivel

  const entries = await getRankingPorNivel(nivel, 10).catch(() => [])
  const faqItems = buildFaqPorNivel(nivel, entries)
  const updatedAtLabel = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
  })

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `As 10 Melhores Raquetes de Beach Tennis para ${NIVEL_LABEL[nivel]}`,
    itemListElement: entries.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/raquetes/${e.racket.slug}`,
      name: e.racket.name,
    })),
  }

  const faqPage = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  } : null

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Turaquete', url: SITE_URL },
    { name: `Melhores raquetes para ${NIVEL_LABEL[nivel].toLowerCase()}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      {faqPage && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <RankingPageLayout
        title={`As 10 melhores raquetes para ${NIVEL_LABEL[nivel].toLowerCase()}`}
        subtitle={`Ranking técnico — ${NIVEL_SUBTITLE[nivel]}.`}
        entries={entries}
        updatedAtLabel={updatedAtLabel}
        faqItems={faqItems}
      />
    </>
  )
}
