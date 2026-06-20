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
      '@type': 'WebPage',
      '@id': `${BASE}/guia#webpage`,
      url: `${BASE}/guia`,
      name: 'Guia da raquete de beach tennis',
      description: 'Os 10 fatores que definem uma raquete de beach tennis.',
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

      <div className="max-w-2xl mx-auto px-5 md:px-6 py-10 md:py-14 flex flex-col gap-12">

        {/* Hero */}
        <header className="flex flex-col gap-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-tinta/40 flex-wrap">
            <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
            <span>/</span>
            <span className="text-tinta/70">Guia da raquete</span>
          </nav>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-tinta leading-tight">
            Guia da raquete de beach tennis
          </h1>
          <p className="text-tinta/70 text-lg leading-relaxed">
            Escolher uma raquete por preço ou por marca é o erro mais comum. Os 10 fatores abaixo explicam o que de fato define como uma raquete se comporta no seu jogo, desde o peso até o formato da cabeça.
          </p>
          <p className="text-tinta/50 text-sm leading-relaxed">
            Cada página vai direto ao ponto: o que é, como afeta o jogo, e como identificar o que serve para o seu nível e estilo. Sem enrolação.
          </p>
        </header>

        {/* Fatores grid */}
        <section>
          <h2 className="font-heading text-sm font-semibold text-tinta/50 uppercase tracking-widest mb-5">
            Os 10 fatores
          </h2>
          <div className="flex flex-col gap-2.5">
            {FATORES.map(f => (
              <Link
                key={f.slug}
                href={`/guia/${f.slug}`}
                className="group bg-white rounded-2xl px-5 py-4 border border-[rgba(14,58,64,0.06)] shadow-sm hover:border-aqua/30 hover:shadow-md transition-all duration-150 flex items-center gap-4"
              >
                <span className="font-heading font-bold text-aqua text-sm w-6 shrink-0 tabular-nums">
                  {f.n}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-tinta text-sm leading-snug group-hover:text-aqua transition-colors">
                    {f.titulo}
                  </p>
                  <p className="text-tinta/50 text-xs mt-0.5 leading-snug line-clamp-1">
                    {f.resumo}
                  </p>
                </div>
                <span className="text-[10px] font-medium text-tinta/40 bg-[#EAF7F6] px-2.5 py-1 rounded-full shrink-0 hidden sm:block">
                  {f.tag}
                </span>
                <svg className="w-4 h-4 text-tinta/20 group-hover:text-aqua transition-colors shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-tinta rounded-2xl p-7 md:p-9 flex flex-col gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl leading-snug">
            Prefere receber a indicação direta?
          </p>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm mx-auto">
            Nosso especialista analisa o seu nível, estilo e orçamento e indica a raquete certa, de graça, explicando o porquê de cada escolha.
          </p>
          <Link
            href="/"
            className="inline-block bg-coral text-white font-heading font-bold text-sm px-6 py-3 rounded-xl hover:bg-coral/90 transition-colors self-center"
          >
            Falar com o especialista grátis →
          </Link>
        </section>

      </div>
    </>
  )
}
