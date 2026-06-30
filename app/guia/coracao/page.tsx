import type { Metadata } from 'next'
import Link from 'next/link'
import TermoGlossario from '@/components/TermoGlossario'
import { GLOSSARIO } from '@/lib/glossario'

const BASE = 'https://www.turaquete.com.br'
const PAGE_URL = `${BASE}/guia/coracao`

export const metadata: Metadata = {
  title: 'Coração da raquete de beach tennis: a região que define o golpe',
  description: 'O coração é a região central da face da raquete de beach tennis. Entenda por que golpear no coração faz diferença e como o formato da raquete define essa área.',
  openGraph: {
    title: 'Coração da raquete de beach tennis: a região que define o golpe',
    description: 'Por que golpear no coração da raquete faz diferença e como isso se relaciona com o sweet spot.',
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coração da raquete de beach tennis: a região que define o golpe',
    description: 'Por que golpear no coração faz diferença e como isso se relaciona com o sweet spot.',
  },
  alternates: { canonical: PAGE_URL },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Coração da raquete de beach tennis: a região que define o golpe',
      url: PAGE_URL,
      author: { '@type': 'Organization', name: 'Turaquete', url: BASE },
      publisher: { '@type': 'Organization', name: 'Turaquete', url: BASE },
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${BASE}/guia#webpage` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início',          item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Guia da raquete', item: `${BASE}/guia` },
        { '@type': 'ListItem', position: 3, name: 'Coração',         item: PAGE_URL },
      ],
    },
  ],
}

const entCoracao    = GLOSSARIO.find(e => e.termo === 'coração')!
const entSweetSpot  = GLOSSARIO.find(e => e.termo === 'sweet spot')!
const entPotencia   = GLOSSARIO.find(e => e.termo === 'potência')!
const entControle   = GLOSSARIO.find(e => e.termo === 'controle')!
const entMoldura    = GLOSSARIO.find(e => e.termo === 'moldura')!

export default function CoracaoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-tinta/40 mb-6 flex-wrap">
          <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
          <span>/</span>
          <Link href="/guia" className="hover:text-aqua transition-colors">Guia da raquete</Link>
          <span>/</span>
          <span className="text-tinta/70">Coração</span>
        </nav>

        <header className="mb-10">
          <div className="inline-flex items-center bg-aqua/10 text-aqua text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Fator 7 de 10
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-tinta leading-tight mb-4">
            Coração da raquete de beach tennis
          </h1>
          <p className="text-tinta/70 text-lg leading-relaxed">
            O{' '}
            <TermoGlossario entry={entCoracao}>coração</TermoGlossario>
            {' '}é a região central da face, onde fica o{' '}
            <TermoGlossario entry={entSweetSpot}>sweet spot</TermoGlossario>
            {'. '}Golpear no coração é diferente de golpear na borda: a{' '}
            <TermoGlossario entry={entPotencia}>potência</TermoGlossario>
            {', '}o{' '}
            <TermoGlossario entry={entControle}>controle</TermoGlossario>
            {' '}e a vibração mudam radicalmente dependendo de onde a bola toca a face.
          </p>
        </header>

        <div className="flex flex-col gap-10 text-tinta/80 leading-relaxed">

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4">O que acontece no golpe</h2>
            <p className="mb-4">
              Quando a bola bate no coração da raquete, a face deforma de forma simétrica e controlada. A energia se distribui bem pelo núcleo e a resposta é previsível: mais potência, mais controle e menos vibração transmitida para o braço.
            </p>
            <p>
              Golpes fora do coração, próximos à{' '}
              <TermoGlossario entry={entMoldura}>moldura</TermoGlossario>
              {', '}geram deformação assimétrica. A bola perde potência, a direção fica imprevisível e a vibração aumenta. É por isso que iniciantes sentem tanto o braço: eles acertam o coração com menos frequência.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-5">Coração e formato da cabeça</h2>
            <p className="mb-4">
              O tamanho e a posição do coração dependem do formato da raquete:
            </p>
            <div className="flex flex-col gap-3">
              {[
                {
                  formato: 'Redonda',
                  coracao: 'Amplo e central',
                  detalhe: 'A moldura simétrica distribui a tensão uniformemente. O coração ocupa uma área maior da face, o que aumenta a margem de erro no golpe.',
                  para: 'Iniciantes e defensores. Mais perdão.',
                },
                {
                  formato: 'Gota (lágrima)',
                  coracao: 'Médio, levemente alto',
                  detalhe: 'O formato assimétrico desloca levemente o coração para cima. Equilíbrio entre área de golpe e potência.',
                  para: 'Intermediários e avançados versáteis.',
                },
                {
                  formato: 'Diamante',
                  coracao: 'Pequeno e alto',
                  detalhe: 'Coração concentrado no terço superior. Quando acertado, entrega potência máxima. Fora dele, o erro é sentido de imediato.',
                  para: 'Avançados ofensivos com técnica consistente.',
                },
              ].map(({ formato, coracao, detalhe, para }) => (
                <div key={formato} className="bg-white rounded-xl px-5 py-4 border border-[rgba(14,58,64,0.06)] shadow-sm">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <p className="font-heading font-bold text-tinta text-sm">{formato}</p>
                    <span className="text-[10px] text-tinta/40 bg-[#EAF7F6] px-2.5 py-1 rounded-full font-medium">{coracao}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-tinta/70 mb-1">{detalhe}</p>
                  <p className="text-xs text-tinta/50">
                    <span className="font-semibold text-tinta/70">Para quem: </span>{para}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <aside className="bg-[#EAF7F6] border border-aqua/20 rounded-2xl px-5 py-4">
            <p className="font-semibold text-tinta text-sm mb-1">Coração e sweet spot: não são a mesma coisa</p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              O coração é a região geográfica central da face. O sweet spot é a área física onde o golpe sai com mais eficiência. Em raquetes bem projetadas, o sweet spot fica dentro do coração, mas pode ser deslocado dependendo do design interno.
            </p>
            <Link href="/guia/sweet-spot" className="inline-block mt-2 text-aqua text-xs font-semibold hover:underline">
              Entenda o sweet spot →
            </Link>
          </aside>

        </div>

        <div className="mt-14 bg-tinta rounded-2xl p-7 md:p-9 flex flex-col items-center gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl leading-snug max-w-sm">
            Qual tamanho de coração combina com o seu jogo?
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Nosso especialista identifica o seu nível e estilo para recomendar o formato certo. Gratuito.
          </p>
          <Link href="/" className="bg-coral text-white font-heading font-bold text-sm px-7 py-3 rounded-xl hover:bg-coral/90 active:scale-[0.98] transition-all">
            Falar com o especialista grátis →
          </Link>
        </div>

        <nav className="mt-10 pt-6 border-t border-tinta/10 flex items-center justify-between text-sm">
          <Link href="/guia/furos" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Anterior: Furos
          </Link>
          <Link href="/guia/textura" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            Próximo: Textura
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </nav>

      </article>
    </>
  )
}
