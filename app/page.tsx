import { listarMarcas, getTopRaquetas, getRaquetasComAtleta, getRaquetaPorSlug, getRandomExpensiveRacket } from '@/lib/recommend'
import { getRecsCount } from '@/lib/stats'
import HomeClient from '@/components/HomeClient'

// Regenerate every 5 min so the recommendation carousel reflects recent data.
// Edit CURATED_SLUGS in lib/recommend.ts to change the cold-start fallback.
export const revalidate = 300

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.turaquete.com.br/#website',
      url: 'https://www.turaquete.com.br',
      name: 'Turaquete',
      description: 'Especialista em raquetes de beach tennis',
      inLanguage: 'pt-BR',
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.turaquete.com.br/#organization',
      name: 'Turaquete',
      url: 'https://www.turaquete.com.br',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.turaquete.com.br/turaquete-logo.png',
        width: '400',
        height: '120',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://www.turaquete.com.br/#faqpage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'É grátis mesmo?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. Você conta como joga e recebe as recomendações na hora. Sem cadastro, sem plano, sem custo de nenhum tipo.',
          },
        },
        {
          '@type': 'Question',
          name: 'Como vocês escolhem as raquetes?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Com base nas especificações reais de cada raquete: peso, balance, material do núcleo e da face. Sem achismo, sem patrocínio.',
          },
        },
        {
          '@type': 'Question',
          name: 'Vocês vendem raquetes?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Não. Indicamos onde comprar (Mercado Livre e lojas parceiras) com o link direto. A Turaquete não tem estoque nem processa pagamentos.',
          },
        },
        {
          '@type': 'Question',
          name: 'Tenho uma loja ou marca de beach tennis. Posso aparecer aqui?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. Se você tem uma loja ou marca e quer que seus produtos apareçam nas indicações, veja como funciona a parceria em turaquete.com.br/para-lojas.',
          },
        },
      ],
    },
  ],
}

export default async function Page() {
  const [brands, featured, athleteRackets, recsCount, exampleRacket, compareRacket] = await Promise.all([
    listarMarcas().catch(() => []),
    getTopRaquetas().catch(() => ({ rackets: [], source: 'curated' as const })),
    getRaquetasComAtleta().catch(() => []),
    getRecsCount().catch(() => 0),
    getRaquetaPorSlug('beast-2023').catch(() => null),
    getRandomExpensiveRacket(2000).catch(() => null),
  ])
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient
        brands={brands}
        featuredRackets={featured.rackets}
        featuredSource={featured.source}
        athleteRackets={athleteRackets}
        recsCount={recsCount}
        exampleRacket={exampleRacket ?? undefined}
        compareRacket={compareRacket ?? undefined}
      />
    </>
  )
}
