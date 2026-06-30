import type { Metadata } from 'next'
import Link from 'next/link'
import TermoGlossario from '@/components/TermoGlossario'
import { GLOSSARIO } from '@/lib/glossario'

const BASE = 'https://www.turaquete.com.br'
const PAGE_URL = `${BASE}/guia/material`

export const metadata: Metadata = {
  title: { absolute: 'Carbono 3K, 12K e 18K na raquete de beach tennis' },
  description: 'Entenda o que significa carbono 3K, 12K e 18K em raquetes de beach tennis e como a fibra de quartzo se compara. Descubra qual material combina com o seu jogo.',
  openGraph: {
    title: 'Carbono 3K, 12K, 18K e quartzo: o guia dos materiais de beach tennis',
    description: 'O que muda entre os tipos de fibra de carbono e fibra de quartzo em raquetes de beach tennis.',
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carbono 3K, 12K e 18K: qual a diferença na raquete de beach tennis?',
    description: 'O que muda entre os tipos de fibra de carbono e fibra de quartzo em raquetes de beach tennis.',
  },
  alternates: { canonical: PAGE_URL },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Carbono 3K, 12K e 18K na raquete de beach tennis: qual a diferença?',
      description: 'Entenda o que significa carbono 3K, 12K e 18K em raquetes de beach tennis e como a fibra de quartzo se compara. Descubra qual material combina com o seu jogo.',
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
        { '@type': 'ListItem', position: 3, name: 'Material',        item: PAGE_URL },
      ],
    },
  ],
}

const entCarbono = GLOSSARIO.find(e => e.termo === 'fibra de carbono')!
const entQuartzo = GLOSSARIO.find(e => e.termo === 'quartzo')!
const entPotencia = GLOSSARIO.find(e => e.termo === 'potência')!
const entConforto  = GLOSSARIO.find(e => e.termo === 'conforto')!

const MATERIAIS = [
  {
    nome: 'Carbono 3K',
    subtitulo: 'Trama grossa, mais flexível',
    descricao: 'O "3K" indica feixes de fibras mais grossos, com padrão de trama visível a olho nu. A estrutura absorve mais vibração e oferece mais sensação tátil no impacto. É o carbono mais comum em raquetes de entrada e médio padrão.',
    perfil: 'Iniciantes e intermediários. Quem valoriza conforto e sensação sobre rigidez máxima.',
    tag: 'entrada e médio padrão',
  },
  {
    nome: 'Carbono 12K',
    subtitulo: 'Trama mais densa, mais rígido',
    descricao: 'Feixes menores e mais numerosos por centímetro quadrado. A trama fica visualmente mais fina. A rigidez aumenta, o que resulta em mais potência de saída de bola e levemente mais transmissão de vibração.',
    perfil: 'Intermediários avançados e avançados. Equilíbrio entre potência e sensação.',
    tag: 'intermediário e avançado',
  },
  {
    nome: 'Carbono 18K',
    subtitulo: 'Trama ultrafina, rigidez máxima',
    descricao: 'Fibras extremamente finas em alta densidade. A superfície parece quase lisa. Rigidez máxima significa a maior saída de bola, mas também a maior transmissão de vibração. Exige um braço condicionado.',
    perfil: 'Avançados com estilo ofensivo. Não recomendado para quem tem sensibilidade no braço.',
    tag: 'alto padrão',
  },
  {
    nome: 'Kevlar',
    subtitulo: 'Alta absorção, mais conforto',
    descricao: 'A fibra de Kevlar é mais macia que o carbono e absorve bem a vibração. Raquetes com face de Kevlar costumam ser mais confortáveis e menos exigentes para o braço. Algumas marcas combinam Kevlar com carbono para equilibrar conforto e potência.',
    perfil: 'Quem tem cotovelo ou ombro sensível e busca conforto sem abrir mão de durabilidade.',
    tag: 'conforto e durabilidade',
  },
  {
    nome: 'Fibra de quartzo',
    subtitulo: 'Alternativa ao carbono, mais macia',
    descricao: 'A fibra de quartzo é um material distinto do carbono, com maior capacidade de absorção de vibração e mais sensação de toque. Raquetes com face de quartzo tendem a ser mais amigáveis ao braço sem sacrificar o controle.',
    perfil: 'Quem tem cotovelo ou ombro sensível. Jogadores de controle que valorizam sensação no golpe.',
    tag: 'conforto e controle',
  },
]

export default function MaterialPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-tinta/40 mb-6 flex-wrap">
          <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
          <span>/</span>
          <Link href="/guia" className="hover:text-aqua transition-colors">Guia da raquete</Link>
          <span>/</span>
          <span className="text-tinta/70">Material e carbono</span>
        </nav>

        <header className="mb-10">
          <div className="inline-flex items-center bg-aqua/10 text-aqua text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Fator 3 de 10
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-tinta leading-tight mb-4">
            Material e carbono na raquete de beach tennis
          </h1>
          <p className="text-tinta/70 text-lg leading-relaxed">
            A{' '}
            <TermoGlossario entry={entCarbono}>fibra de carbono</TermoGlossario>
            {' '}domina as molduras e faces de raquete. Mas o que muda entre 3K, 12K e 18K, e quando o{' '}
            <TermoGlossario entry={entQuartzo}>quartzo</TermoGlossario>
            {' '}é a melhor escolha?
          </p>
        </header>

        <div className="flex flex-col gap-12 text-tinta/80 leading-relaxed">

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4 pl-4 border-l-4 border-l-aqua/40">
              O que significa 3K, 12K e 18K
            </h2>
            <p className="mb-4">
              O número seguido de "K" indica a quantidade de filamentos por feixe de fibra de carbono. Quanto maior o número, mais finos e numerosos são os filamentos, o que resulta em uma trama mais densa e em geral mais rígida.
            </p>
            <p className="text-sm text-tinta/60">
              Nota: rigidez e{' '}
              <TermoGlossario entry={entPotencia}>potência</TermoGlossario>
              {' '}andam juntas, mas a relação não é linear. Outros fatores, como a espessura da moldura e o EVA do núcleo, também influenciam muito o resultado final.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-5 pl-4 border-l-4 border-l-aqua/40">Os materiais mais comuns</h2>
            <div className="flex flex-col gap-3">
              {MATERIAIS.map(({ nome, subtitulo, descricao, perfil, tag }) => (
                <div key={nome} className="bg-white rounded-2xl p-5 border border-[rgba(14,58,64,0.06)] shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-heading font-bold text-tinta text-sm">{nome}</p>
                      <p className="text-tinta/50 text-xs">{subtitulo}</p>
                    </div>
                    <span className="text-[10px] font-medium text-tinta/40 bg-[#EAF7F6] px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
                      {tag}
                    </span>
                  </div>
                  <p className="text-[15px] leading-relaxed text-tinta/70 mb-2">{descricao}</p>
                  <p className="text-xs text-tinta/50">
                    <span className="font-semibold text-tinta/70">Para quem: </span>{perfil}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4 pl-4 border-l-4 border-l-aqua/40">
              Moldura vs. face: onde o material está
            </h2>
            <p className="mb-4">
              Em muitas raquetes, o material da moldura e o da face são diferentes. É comum ver moldura em carbono de alta gramatura (12K ou 18K) com face em 3K ou em{' '}
              <TermoGlossario entry={entQuartzo}>quartzo</TermoGlossario>
              . Isso permite combinar rigidez estrutural com{' '}
              <TermoGlossario entry={entConforto}>conforto</TermoGlossario>
              {' '}na superfície de contato.
            </p>
            <p className="text-sm text-tinta/60">
              Quando a ficha técnica mencionar dois materiais, o mais relevante para a sensação no golpe é o da face.
            </p>
          </section>

          <aside className="bg-[#FFFAEB] rounded-2xl px-5 py-5 border-l-4 border-l-[#FFC42E]">
            <p className="font-semibold text-tinta text-sm mb-1">O marketing pode exagerar</p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              "Carbono 18K ultra premium" em uma raquete de entrada pode indicar apenas que a moldura usa esse material em pequena espessura, sem entregar a rigidez de um modelo de alto padrão. O material é um fator, não o único fator. Considere sempre o conjunto: EVA, espessura, balance e peso.
            </p>
          </aside>

        </div>

        <div className="mt-14 bg-tinta rounded-2xl p-7 md:p-9 flex flex-col items-center gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl leading-snug max-w-sm">
            Qual material serve para o seu braço e estilo?
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Nosso especialista leva tudo em conta, inclusive sensibilidade no braço. A indicação é gratuita e sem cadastro.
          </p>
          <Link href="/" className="bg-coral text-white font-heading font-bold text-sm px-7 py-3 rounded-xl hover:bg-coral/90 active:scale-[0.98] transition-all">
            Falar com o especialista grátis →
          </Link>
        </div>

        <nav className="mt-10 pt-6 border-t border-tinta/10 flex items-center justify-between text-sm">
          <Link href="/guia/balance" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Anterior: Balance
          </Link>
          <Link href="/guia/eva" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            Próximo: EVA
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </nav>

      </article>
    </>
  )
}
