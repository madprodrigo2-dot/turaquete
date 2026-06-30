import type { Metadata } from 'next'
import Link from 'next/link'
import TermoGlossario from '@/components/TermoGlossario'
import { GLOSSARIO } from '@/lib/glossario'

const BASE = 'https://www.turaquete.com.br'
const PAGE_URL = `${BASE}/guia/espessura`

export const metadata: Metadata = {
  title: 'Espessura da raquete de beach tennis: grossa ou fina?',
  description: 'Como a espessura da moldura da raquete de beach tennis afeta potência, conforto e sensação. Saiba qual espessura combina com o seu estilo de jogo.',
  openGraph: {
    title: 'Espessura da raquete de beach tennis: grossa ou fina?',
    description: 'Como a espessura da moldura define potência, conforto e sensação na raquete de beach tennis.',
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Espessura da raquete de beach tennis: grossa ou fina?',
    description: 'Como a espessura da moldura define potência, conforto e sensação.',
  },
  alternates: { canonical: PAGE_URL },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Espessura da raquete de beach tennis: grossa ou fina?',
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
        { '@type': 'ListItem', position: 3, name: 'Espessura',       item: PAGE_URL },
      ],
    },
  ],
}

const entEspessura = GLOSSARIO.find(e => e.termo === 'espessura')!
const entMoldura   = GLOSSARIO.find(e => e.termo === 'moldura')!
const entPotencia  = GLOSSARIO.find(e => e.termo === 'potência')!
const entConforto  = GLOSSARIO.find(e => e.termo === 'conforto')!

export default function EspessuraPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-tinta/40 mb-6 flex-wrap">
          <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
          <span>/</span>
          <Link href="/guia" className="hover:text-aqua transition-colors">Guia da raquete</Link>
          <span>/</span>
          <span className="text-tinta/70">Espessura</span>
        </nav>

        <header className="mb-10">
          <div className="inline-flex items-center bg-aqua/10 text-aqua text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Fator 5 de 10
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-tinta leading-tight mb-4">
            Espessura da raquete de beach tennis
          </h1>
          <p className="text-tinta/70 text-lg leading-relaxed">
            A{' '}
            <TermoGlossario entry={entEspessura}>espessura</TermoGlossario>
            {' '}é a grossura da{' '}
            <TermoGlossario entry={entMoldura}>moldura</TermoGlossario>
            {', '}medida em milímetros. Molduras mais grossas concentram mais material, o que muda a rigidez e, consequentemente, a{' '}
            <TermoGlossario entry={entPotencia}>potência</TermoGlossario>
            {' '}e o{' '}
            <TermoGlossario entry={entConforto}>conforto</TermoGlossario>.
          </p>
        </header>

        <div className="flex flex-col gap-12 text-tinta/80 leading-relaxed">

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4 pl-4 border-l-4 border-l-aqua/40">O que a espessura muda na prática</h2>
            <p className="mb-4">
              Quanto mais espessa a moldura, maior a seção transversal de material rígido. Isso aumenta a resistência à deformação no impacto: a raquete "não cede" tanto, e devolve mais energia para a bola. Molduras mais finas, por outro lado, flexionam levemente no golpe, absorvendo parte da vibração e entregando mais sensação tátil.
            </p>
            <p className="text-sm text-tinta/60">
              A faixa típica em raquetes de beach tennis fica entre 30 mm e 46 mm. Modelos de entrada e controle costumam ficar abaixo de 38 mm; modelos de potência, acima disso. Esses valores são indicativos e variam entre fabricantes.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-5 pl-4 border-l-4 border-l-aqua/40">Grossa vs. fina: resumo</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  titulo: 'Moldura espessa',
                  itens: ['Mais rígida', 'Mais potência de saída', 'Menos absorção de vibração', 'Mais imponente na mão'],
                  para: 'Jogadores ofensivos. Quem busca potência no smash.',
                  cor: 'border-coral/20',
                },
                {
                  titulo: 'Moldura fina',
                  itens: ['Mais flexível', 'Mais absorção de vibração', 'Mais sensação tátil', 'Levemente mais conforto'],
                  para: 'Jogadores de controle. Quem tem sensibilidade no braço.',
                  cor: 'border-aqua/30',
                },
              ].map(({ titulo, itens, para, cor }) => (
                <div key={titulo} className={`bg-white rounded-2xl p-5 border shadow-sm ${cor}`}>
                  <p className="font-heading font-bold text-tinta text-sm mb-3">{titulo}</p>
                  <ul className="space-y-1 mb-3">
                    {itens.map(i => (
                      <li key={i} className="flex items-start gap-2 text-[15px] text-tinta/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-aqua/70 mt-[0.45rem] shrink-0 flex-shrink-0" aria-hidden="true" />
                        {i}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-tinta/50">
                    <span className="font-semibold text-tinta/70">Para quem: </span>{para}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <aside className="bg-[#EAF7F6] rounded-2xl px-5 py-5 border-l-4 border-l-aqua/60">
            <p className="font-semibold text-tinta text-sm mb-1">Espessura, EVA e material interagem</p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              Uma raquete espessa com EVA macio pode ser mais confortável do que uma fina com EVA duro. Os fatores não funcionam isolados. A espessura define o potencial de rigidez; o EVA e o material da face determinam o quanto desse potencial se transforma em potência ou em absorção.
            </p>
            <Link href="/guia/eva" className="inline-block mt-2 text-aqua text-xs font-semibold hover:underline">
              Entenda o EVA →
            </Link>
          </aside>

        </div>

        <div className="mt-14 bg-tinta rounded-2xl p-7 md:p-9 flex flex-col items-center gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl leading-snug max-w-sm">
            Potência ou controle: qual espessura serve para você?
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            O especialista considera o seu jogo completo, não só um fator. A indicação é gratuita.
          </p>
          <Link href="/" className="bg-coral text-white font-heading font-bold text-sm px-7 py-3 rounded-xl hover:bg-coral/90 active:scale-[0.98] transition-all">
            Falar com o especialista grátis →
          </Link>
        </div>

        <nav className="mt-10 pt-6 border-t border-tinta/10 flex items-center justify-between text-sm">
          <Link href="/guia/eva" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Anterior: EVA
          </Link>
          <Link href="/guia/furos" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            Próximo: Furos
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </nav>

      </article>
    </>
  )
}
