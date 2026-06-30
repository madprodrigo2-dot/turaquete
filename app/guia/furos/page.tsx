import type { Metadata } from 'next'
import Link from 'next/link'
import TermoGlossario from '@/components/TermoGlossario'
import { GLOSSARIO } from '@/lib/glossario'

const BASE = 'https://www.turaquete.com.br'
const PAGE_URL = `${BASE}/guia/furos`

export const metadata: Metadata = {
  title: { absolute: 'Furos e trama da raquete de beach tennis: spin e controle' },
  description: 'Como o padrão de furos (trama aberta ou fechada) na face da raquete de beach tennis afeta o spin, a saída de bola e o controle. Entenda antes de comprar.',
  openGraph: {
    title: 'Furos e trama da raquete de beach tennis: spin e controle',
    description: 'Como o padrão de furos na face afeta spin, saída de bola e controle na raquete de beach tennis.',
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Furos e trama da raquete de beach tennis: spin e controle',
    description: 'Como o padrão de furos afeta spin, saída de bola e controle.',
  },
  alternates: { canonical: PAGE_URL },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Furos e trama da raquete de beach tennis: spin e controle',
      description: 'Como o padrão de furos (trama aberta ou fechada) na face da raquete de beach tennis afeta o spin, a saída de bola e o controle. Entenda antes de comprar.',
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
        { '@type': 'ListItem', position: 3, name: 'Furos e trama',   item: PAGE_URL },
      ],
    },
  ],
}

const entFuros   = GLOSSARIO.find(e => e.termo === 'furos')!
const entTrama   = GLOSSARIO.find(e => e.termo === 'trama')!
const entSpin    = GLOSSARIO.find(e => e.termo === 'spin')!
const entControle = GLOSSARIO.find(e => e.termo === 'controle')!

export default function FurosPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-tinta/40 mb-6 flex-wrap">
          <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
          <span>/</span>
          <Link href="/guia" className="hover:text-aqua transition-colors">Guia da raquete</Link>
          <span>/</span>
          <span className="text-tinta/70">Furos e trama</span>
        </nav>

        <header className="mb-10">
          <div className="inline-flex items-center bg-aqua/10 text-aqua text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Fator 6 de 10
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-tinta leading-tight mb-4">
            Furos e trama da raquete de beach tennis
          </h1>
          <p className="text-tinta/70 text-lg leading-relaxed">
            Os{' '}
            <TermoGlossario entry={entFuros}>furos</TermoGlossario>
            {' '}na face formam a{' '}
            <TermoGlossario entry={entTrama}>trama</TermoGlossario>
            {' '}da raquete. O tamanho, o espaçamento e o padrão desses furos influenciam o{' '}
            <TermoGlossario entry={entSpin}>spin</TermoGlossario>
            {', '}a velocidade de saída de bola e o{' '}
            <TermoGlossario entry={entControle}>controle</TermoGlossario>.
          </p>
        </header>

        <div className="flex flex-col gap-12 text-tinta/80 leading-relaxed">

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4 pl-4 border-l-4 border-l-aqua/40">Por que os furos importam</h2>
            <p className="mb-4">
              No momento do impacto, a bola deforma levemente a superfície da face. A disposição dos furos define quanto a bola "afunda" na face e qual é o atrito entre os dois. Mais atrito gera mais efeito (spin); menos atrito resulta em saída de bola mais limpa e direta.
            </p>
            <p>
              Além disso, furos maiores e mais espaçados reduzem a área sólida da face, o que pode aumentar a deformação e a velocidade de saída, como acontece com trampolins.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-5 pl-4 border-l-4 border-l-aqua/40">Trama aberta vs. trama densa</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  titulo: 'Trama aberta',
                  subtitulo: 'Furos maiores e/ou mais espaçados',
                  itens: [
                    'Mais spin e efeito na bola',
                    'Saída de bola mais rápida',
                    'Sensação de potência no golpe',
                    'Menos controle fino em bolas difíceis',
                  ],
                  cor: 'border-coral/20',
                },
                {
                  titulo: 'Trama densa',
                  subtitulo: 'Furos menores e/ou mais próximos',
                  itens: [
                    'Mais controle e precisão',
                    'Golpe mais previsível',
                    'Menos spin natural',
                    'Mais fácil de colocar a bola',
                  ],
                  cor: 'border-aqua/30',
                },
              ].map(({ titulo, subtitulo, itens, cor }) => (
                <div key={titulo} className={`bg-white rounded-2xl p-5 border shadow-sm ${cor}`}>
                  <p className="font-heading font-bold text-tinta text-sm">{titulo}</p>
                  <p className="text-tinta/40 text-xs mb-3">{subtitulo}</p>
                  <ul className="space-y-1">
                    {itens.map(i => (
                      <li key={i} className="flex items-start gap-2 text-[15px] text-tinta/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-aqua/70 mt-[0.45rem] shrink-0 flex-shrink-0" aria-hidden="true" />
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4 pl-4 border-l-4 border-l-aqua/40">Trama e nível de jogo</h2>
            <p className="mb-4">
              Para iniciantes e intermediários, uma trama mais densa costuma ser mais fácil de jogar: o golpe sai mais previsível, e erros de ângulo são menos punidos. Jogadores avançados que querem gerar spin de forma intencional se beneficiam de tramas abertas, mas precisam ter técnica para não perder o controle.
            </p>
            <p className="text-sm text-tinta/60">
              Atenção: a trama trabalha em conjunto com a textura da face. Uma trama aberta com superfície areada gera ainda mais spin. Uma trama densa com face lisa entrega o máximo de controle e precisão.
            </p>
          </section>

          <aside className="bg-[#EAF7F6] rounded-2xl px-5 py-5 border-l-4 border-l-aqua/60">
            <p className="font-semibold text-tinta text-sm mb-1">Trama e textura: dois fatores que se somam</p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              O padrão de furos e o acabamento da superfície atuam juntos no spin. Veja o próximo fator para entender como a textura complementa (ou compensa) o efeito da trama.
            </p>
            <Link href="/guia/textura" className="inline-block mt-2 text-aqua text-xs font-semibold hover:underline">
              Ver textura da face →
            </Link>
          </aside>

        </div>

        <div className="mt-14 bg-tinta rounded-2xl p-7 md:p-9 flex flex-col items-center gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl leading-snug max-w-sm">
            Quer mais spin ou mais controle? Fale com o especialista.
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            A indicação leva em conta o seu estilo de golpe, não só a ficha técnica. Gratuita e sem cadastro.
          </p>
          <Link href="/" className="bg-coral text-white font-heading font-bold text-sm px-7 py-3 rounded-xl hover:bg-coral/90 active:scale-[0.98] transition-all">
            Falar com o especialista grátis →
          </Link>
        </div>

        <nav className="mt-10 pt-6 border-t border-tinta/10 flex items-center justify-between text-sm">
          <Link href="/guia/espessura" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Anterior: Espessura
          </Link>
          <Link href="/guia/coracao" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            Próximo: Coração
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </nav>

      </article>
    </>
  )
}
