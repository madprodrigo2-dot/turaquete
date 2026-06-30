import type { Metadata } from 'next'
import Link from 'next/link'
import TermoGlossario from '@/components/TermoGlossario'
import { GLOSSARIO } from '@/lib/glossario'

const BASE = 'https://www.turaquete.com.br'
const PAGE_URL = `${BASE}/guia/sweet-spot`

export const metadata: Metadata = {
  title: 'Sweet spot na raquete de beach tennis: o que é e por que importa',
  description: 'O que é o sweet spot na raquete de beach tennis, como o formato da cabeça define seu tamanho e posição, e por que iniciantes precisam de um sweet spot maior.',
  openGraph: {
    title: 'Sweet spot na raquete de beach tennis: o que é e por que importa',
    description: 'O que é o sweet spot, como o formato da cabeça define seu tamanho, e o que isso significa para o seu jogo.',
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sweet spot na raquete de beach tennis: o que é e por que importa',
    description: 'O que é o sweet spot e como o formato da cabeça define seu tamanho e posição.',
  },
  alternates: { canonical: PAGE_URL },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Sweet spot na raquete de beach tennis: o que é e por que importa',
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
        { '@type': 'ListItem', position: 3, name: 'Sweet spot',      item: PAGE_URL },
      ],
    },
  ],
}

const entSweetSpot = GLOSSARIO.find(e => e.termo === 'sweet spot')!
const entCoracao   = GLOSSARIO.find(e => e.termo === 'coração')!
const entPotencia  = GLOSSARIO.find(e => e.termo === 'potência')!
const entControle  = GLOSSARIO.find(e => e.termo === 'controle')!

export default function SweetSpotPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-tinta/40 mb-6 flex-wrap">
          <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
          <span>/</span>
          <Link href="/guia" className="hover:text-aqua transition-colors">Guia da raquete</Link>
          <span>/</span>
          <span className="text-tinta/70">Sweet spot</span>
        </nav>

        <header className="mb-10">
          <div className="inline-flex items-center bg-aqua/10 text-aqua text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Fator 9 de 10
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-tinta leading-tight mb-4">
            Sweet spot na raquete de beach tennis
          </h1>
          <p className="text-tinta/70 text-lg leading-relaxed">
            O{' '}
            <TermoGlossario entry={entSweetSpot}>sweet spot</TermoGlossario>
            {' '}é a área da face onde o golpe sai completo. Dentro dele: máxima{' '}
            <TermoGlossario entry={entPotencia}>potência</TermoGlossario>
            {', '}máximo{' '}
            <TermoGlossario entry={entControle}>controle</TermoGlossario>
            {', '}mínima vibração. Fora dele: a bola perde potência, a direção fica imprecisa e o braço sente o impacto.
          </p>
        </header>

        <div className="flex flex-col gap-10 text-tinta/80 leading-relaxed">

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4">Por que o tamanho do sweet spot muda tudo</h2>
            <p className="mb-4">
              Um sweet spot grande perdoa mais os erros de timing. O jogador não precisa acertar exatamente o ponto certo para ter um golpe útil. Isso é essencial para iniciantes e intermediários, que ainda estão desenvolvendo a consistência.
            </p>
            <p>
              Um sweet spot pequeno exige mais precisão, mas quando acertado, entrega mais potência concentrada. É uma troca: menos margem de erro, mais recompensa quando o golpe é certo. Jogadores avançados com estilo ofensivo buscam isso.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-5">Como o formato define o sweet spot</h2>
            <div className="flex flex-col gap-3">
              {[
                {
                  formato: 'Cabeça redonda',
                  spot: 'Grande e centralizado',
                  descricao: 'A moldura simétrica distribui o stress uniformemente. O sweet spot ocupa uma área ampla no centro da face, próximo ao coração. Alto perdão de erro.',
                  level: 'Iniciante e intermediário',
                  cor: 'border-aqua/30 bg-[#EAF7F6]',
                },
                {
                  formato: 'Cabeça gota (lágrima)',
                  spot: 'Médio, levemente alto',
                  descricao: 'O formato assimétrico concentra levemente o sweet spot no terço superior. Ainda perdoa, mas começa a oferecer mais potência quando o golpe é acertado no ponto certo.',
                  level: 'Intermediário e avançado',
                  cor: 'border-[rgba(14,58,64,0.06)] bg-white',
                },
                {
                  formato: 'Cabeça diamante',
                  spot: 'Pequeno e alto',
                  descricao: 'O sweet spot fica concentrado no terço superior da face. Golpes certos são explosivos; golpes fora do spot são claramente sentidos na mão.',
                  level: 'Avançado ofensivo',
                  cor: 'border-coral/20 bg-white',
                },
              ].map(({ formato, spot, descricao, level, cor }) => (
                <div key={formato} className={`rounded-2xl p-5 border shadow-sm ${cor}`}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <p className="font-heading font-bold text-tinta text-sm">{formato}</p>
                    <span className="text-[10px] font-medium text-tinta/40 bg-white/70 border border-tinta/10 px-2.5 py-1 rounded-full whitespace-nowrap">{spot}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-tinta/70 mb-2">{descricao}</p>
                  <p className="text-xs text-tinta/50">
                    <span className="font-semibold text-tinta/70">Nível: </span>{level}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4">Sweet spot e coração: a relação</h2>
            <p>
              O{' '}
              <TermoGlossario entry={entCoracao}>coração</TermoGlossario>
              {' '}é a região central da face; o sweet spot é a área de resposta ótima dentro dessa região. Na prática, o coração é maior e o sweet spot fica dentro dele. Em raquetes bem projetadas, os dois coincidem ao máximo.
            </p>
          </section>

          <aside className="bg-[#FFC42E]/10 border border-[#FFC42E]/25 rounded-2xl px-5 py-4">
            <p className="font-semibold text-tinta text-sm mb-1">Sweet spot não aparece na ficha técnica</p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              As marcas raramente publicam dados precisos sobre o sweet spot. O formato da cabeça é o indicador mais confiável: redonda = maior, diamante = menor. Avaliações de jogadores com perfil similar ao seu são a melhor referência prática.
            </p>
          </aside>

        </div>

        <div className="mt-14 bg-tinta rounded-2xl p-7 md:p-9 flex flex-col items-center gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl leading-snug max-w-sm">
            Qual sweet spot combina com a sua fase de jogo?
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Nosso especialista identifica o nível e o estilo para recomendar o formato certo. Gratuito.
          </p>
          <Link href="/" className="bg-coral text-white font-heading font-bold text-sm px-7 py-3 rounded-xl hover:bg-coral/90 active:scale-[0.98] transition-all">
            Falar com o especialista grátis →
          </Link>
        </div>

        <nav className="mt-10 pt-6 border-t border-tinta/10 flex items-center justify-between text-sm">
          <Link href="/guia/textura" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Anterior: Textura
          </Link>
          <Link href="/guia/formato" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            Próximo: Formato
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </nav>

      </article>
    </>
  )
}
