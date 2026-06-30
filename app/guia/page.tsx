import type { Metadata } from 'next'
import Link from 'next/link'

const BASE = 'https://www.turaquete.com.br'

export const metadata: Metadata = {
  title: 'Guia da raquete de beach tennis: tudo que você precisa saber',
  description: 'Entenda os 10 fatores que definem uma raquete de beach tennis: peso, balance, EVA, carbono, espessura, furos, coração, textura, sweet spot e formato. Escolha com conhecimento.',
  openGraph: {
    title: 'Guia completo da raquete de beach tennis',
    description: 'Os 10 fatores que definem uma raquete de beach tennis, explicados com clareza para jogadores de todos os níveis.',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guia completo da raquete de beach tennis',
    description: 'Os 10 fatores que definem uma raquete de beach tennis, explicados para todos os níveis.',
  },
  alternates: {
    canonical: `${BASE}/guia`,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': `${BASE}/guia#webpage`,
      url: `${BASE}/guia`,
      name: 'Guia da raquete de beach tennis',
      description: 'Os 10 fatores que definem uma raquete de beach tennis: peso, balance, EVA, carbono, espessura, furos, coração, textura, sweet spot e formato.',
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${BASE}/#website` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Guia da raquete', item: `${BASE}/guia` },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'Fatores da raquete de beach tennis',
      url: `${BASE}/guia`,
      numberOfItems: 10,
      itemListElement: [
        { '@type': 'ListItem', position: 1,  name: 'Peso',             url: `${BASE}/guia/peso` },
        { '@type': 'ListItem', position: 2,  name: 'Balance',          url: `${BASE}/guia/balance` },
        { '@type': 'ListItem', position: 3,  name: 'Material e carbono', url: `${BASE}/guia/material` },
        { '@type': 'ListItem', position: 4,  name: 'EVA (núcleo)',     url: `${BASE}/guia/eva` },
        { '@type': 'ListItem', position: 5,  name: 'Espessura',        url: `${BASE}/guia/espessura` },
        { '@type': 'ListItem', position: 6,  name: 'Furos e trama',    url: `${BASE}/guia/furos` },
        { '@type': 'ListItem', position: 7,  name: 'Coração',          url: `${BASE}/guia/coracao` },
        { '@type': 'ListItem', position: 8,  name: 'Textura da face',  url: `${BASE}/guia/textura` },
        { '@type': 'ListItem', position: 9,  name: 'Sweet spot',       url: `${BASE}/guia/sweet-spot` },
        { '@type': 'ListItem', position: 10, name: 'Formato da cabeça', url: `${BASE}/guia/formato` },
      ],
    },
  ],
}

const FATORES = [
  {
    n: 1,
    slug: 'peso',
    titulo: 'Peso',
    resumo: 'Como a gramagem muda a potência, o manuseio e o cansaço ao longo do jogo.',
    tag: '330 a 385 g',
  },
  {
    n: 2,
    slug: 'balance',
    titulo: 'Balance',
    resumo: 'Onde o ponto de equilíbrio fica e o que isso muda na sensação do golpe.',
    tag: 'cabo / médio / cabeça',
  },
  {
    n: 3,
    slug: 'material',
    titulo: 'Material e carbono',
    resumo: 'A diferença entre carbono 3K, 12K, 18K e fibra de quartzo na prática.',
    tag: '3K · 12K · 18K',
  },
  {
    n: 4,
    slug: 'eva',
    titulo: 'EVA (núcleo)',
    resumo: 'O interior da raquete define conforto, vibração e potência no impacto.',
    tag: 'macio / médio / duro',
  },
  {
    n: 5,
    slug: 'espessura',
    titulo: 'Espessura',
    resumo: 'Molduras mais grossas ou finas: como a rigidez afeta potência e conforto.',
    tag: '30 a 46 mm',
  },
  {
    n: 6,
    slug: 'furos',
    titulo: 'Furos e trama',
    resumo: 'O padrão de furos na face influencia spin, saída de bola e controle.',
    tag: 'aberta / densa',
  },
  {
    n: 7,
    slug: 'coracao',
    titulo: 'Coração',
    resumo: 'A região central da face e como ela concentra o sweet spot da raquete.',
    tag: 'área de golpe ideal',
  },
  {
    n: 8,
    slug: 'textura',
    titulo: 'Textura da face',
    resumo: 'Superfícies areadas ou rugosas que geram mais spin e efeito na bola.',
    tag: 'lisa / areada / rugosa',
  },
  {
    n: 9,
    slug: 'sweet-spot',
    titulo: 'Sweet spot',
    resumo: 'A área onde o golpe sai completo, e como o formato da cabeça define seu tamanho.',
    tag: 'tamanho e posição',
  },
  {
    n: 10,
    slug: 'formato',
    titulo: 'Formato da cabeça',
    resumo: 'Redonda, gota ou diamante: o que muda no controle, potência e sweet spot.',
    tag: 'redonda · gota · diamante',
  },
]

export default function GuiaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14 flex flex-col gap-14">

        {/* Hero */}
        <header className="flex flex-col gap-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-tinta/40 flex-wrap">
            <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
            <span aria-hidden="true">/</span>
            <span className="text-tinta/60 font-medium">Guia da raquete</span>
          </nav>

          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 bg-aqua/10 text-aqua text-xs font-semibold px-3 py-1.5 rounded-full w-fit">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M6 4v3M6 8.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              10 fatores explicados
            </div>
            <h1 className="font-heading text-3xl md:text-[2.6rem] font-bold text-tinta leading-tight">
              Guia da raquete<br className="hidden sm:block" /> de beach tennis
            </h1>
          </div>

          <p className="text-tinta/75 text-base md:text-lg leading-relaxed max-w-2xl">
            Escolher uma raquete por preço ou por marca é o erro mais comum. Os 10 fatores abaixo explicam o que de fato define como uma raquete se comporta no seu jogo.
          </p>
          <p className="text-tinta/50 text-sm leading-relaxed max-w-xl">
            Cada página vai direto ao ponto: o que é, como afeta o jogo, e como identificar o que serve para o seu nível e estilo.
          </p>
        </header>

        {/* Fatores grid */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-heading text-xs font-bold text-tinta/40 uppercase tracking-widest">
              Os 10 fatores
            </h2>
            <div className="flex-1 h-px bg-tinta/8" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FATORES.map(f => (
              <Link
                key={f.slug}
                href={`/guia/${f.slug}`}
                className="group bg-white rounded-2xl p-5 border border-[rgba(14,58,64,0.07)] shadow-sm hover:border-aqua/35 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex gap-4"
              >
                {/* Número */}
                <div className="shrink-0 w-9 h-9 rounded-xl bg-aqua/10 flex items-center justify-center group-hover:bg-aqua/18 transition-colors">
                  <span className="font-heading font-bold text-aqua text-sm tabular-nums leading-none">
                    {f.n}
                  </span>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <p className="font-heading font-bold text-tinta text-sm leading-snug group-hover:text-aqua transition-colors">
                    {f.titulo}
                  </p>
                  <p className="text-tinta/55 text-xs leading-relaxed line-clamp-2">
                    {f.resumo}
                  </p>
                  <span className="mt-1.5 text-[10px] font-semibold text-aqua/70 bg-aqua/8 px-2 py-0.5 rounded-full w-fit">
                    {f.tag}
                  </span>
                </div>

                <svg className="w-4 h-4 text-tinta/15 group-hover:text-aqua shrink-0 self-center transition-colors mt-0.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-tinta rounded-2xl p-7 md:p-10 flex flex-col gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl md:text-2xl leading-snug">
            Prefere receber a indicação direta?
          </p>
          <p className="text-white/65 text-sm leading-relaxed max-w-sm mx-auto">
            O especialista analisa o seu nível, estilo e orçamento e indica a raquete certa, de graça, com explicação do porquê de cada escolha.
          </p>
          <Link
            href="/"
            className="inline-block bg-coral text-white font-heading font-bold text-sm px-7 py-3 rounded-xl hover:bg-coral/90 hover:shadow-[0_4px_16px_rgba(255,94,58,0.35)] active:scale-[0.98] transition-all self-center"
          >
            Falar com o especialista grátis →
          </Link>
        </section>

      </div>
    </>
  )
}
