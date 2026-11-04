import type { Metadata } from 'next'
import { getRankingGeral, buildFaqGeral } from '@/lib/ranking'
import RankingPageLayout from '@/components/RankingPageLayout'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/site'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'As 10 Melhores Raquetes de Beach Tennis — Ranking Atualizado',
  description: 'Ranking das 10 melhores raquetes de beach tennis do catálogo, com nota técnica, comparação de especificações e perguntas frequentes. Dados reais, sem patrocínio de marca.',
  alternates: { canonical: `${SITE_URL}/raquetes/melhores` },
}

export default async function MelhoresPage() {
  const entries = await getRankingGeral(10).catch(() => [])
  const faqItems = buildFaqGeral(entries)
  const updatedAtLabel = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
  })

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'As 10 Melhores Raquetes de Beach Tennis',
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
    { name: 'Melhores raquetes de beach tennis' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      {faqPage && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <RankingPageLayout
        title="As 10 melhores raquetes de beach tennis"
        subtitle="Ranking com nota técnica real, baseado em cliques e recomendações reais da Tury — sem patrocínio de marca."
        entries={entries}
        updatedAtLabel={updatedAtLabel}
        faqItems={faqItems}
      />
    </>
  )
}
