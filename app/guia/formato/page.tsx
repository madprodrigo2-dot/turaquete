import type { Metadata } from 'next'
import Link from 'next/link'
import TermoGlossario from '@/components/TermoGlossario'
import { GLOSSARIO } from '@/lib/glossario'

const BASE = 'https://www.turaquete.com.br'
const PAGE_URL = `${BASE}/guia/formato`

export const metadata: Metadata = {
  title: { absolute: 'Raquete redonda, gota ou diamante: qual escolher?' },
  description: 'Diferença entre raquete redonda, gota (lágrima) e diamante no beach tennis. Entenda como o formato da cabeça define o sweet spot, a potência e para quem serve cada um.',
  openGraph: {
    title: 'Raquete redonda, gota ou diamante: qual escolher no beach tennis?',
    description: 'Como o formato da cabeça define sweet spot, potência e para quem serve cada modelo de beach tennis.',
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Raquete redonda, gota ou diamante no beach tennis: qual escolher?',
    description: 'Como o formato da cabeça define sweet spot, potência e para quem serve cada modelo.',
  },
  alternates: { canonical: PAGE_URL },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Raquete redonda, gota ou diamante: qual escolher no beach tennis?',
      description: 'Diferença entre raquete redonda, gota e diamante no beach tennis, com orientação por nível e estilo de jogo.',
      url: PAGE_URL,
      author: { '@type': 'Organization', name: 'Turaquete', url: BASE },
      publisher: { '@type': 'Organization', name: 'Turaquete', url: BASE },
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${BASE}/guia#webpage` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início',           item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Guia da raquete',  item: `${BASE}/guia` },
        { '@type': 'ListItem', position: 3, name: 'Formato da cabeça', item: PAGE_URL },
      ],
    },
  ],
}

const entMoldura   = GLOSSARIO.find(e => e.termo === 'moldura')!
const entSweetSpot = GLOSSARIO.find(e => e.termo === 'sweet spot')!
const entBalance   = GLOSSARIO.find(e => e.termo === 'balance')!
const entPotencia  = GLOSSARIO.find(e => e.termo === 'potência')!
const entManuseio  = GLOSSARIO.find(e => e.termo === 'manuseio')!

const FORMATOS = [
  {
    nome: 'Redonda',
    apelido: 'também chamada de "round"',
    sweet: 'Grande e central',
    balance: 'Tendência ao cabo',
    itens: [
      'Sweet spot amplo, alto perdão de erro',
      'Balance tendendo ao cabo: mais manuseio e controle',
      'Melhor para jogadores que jogam na defesa',
      'Indicada para quem está aprendendo ou quer conforto',
    ],
    para: 'Iniciantes, intermediários, jogadores defensivos e quem tem sensibilidade no braço.',
    cor: 'border-aqua/30 bg-[#EAF7F6]',
  },
  {
    nome: 'Gota (lágrima)',
    apelido: 'chamada "oval" por muitas marcas; também: teardrop, lágrima',
    sweet: 'Médio, levemente alto',
    balance: 'Médio ou misto',
    itens: [
      'Sweet spot intermediário, boa margem de erro',
      'Equilibra controle e potência',
      'Balance mais variável dependendo da marca',
      'Formato mais versátil do catálogo',
    ],
    para: 'Intermediários e avançados que não querem abrir mão de nenhum aspecto.',
    cor: 'border-[rgba(14,58,64,0.06)] bg-white',
  },
  {
    nome: 'Diamante',
    apelido: 'também chamada de "diamond"',
    sweet: 'Pequeno e alto',
    balance: 'Tendência à cabeça',
    itens: [
      'Sweet spot concentrado no terço superior',
      'Balance tendendo à cabeça: mais potência no smash',
      'Exige técnica para aproveitar o sweet spot',
      'Golpe fora do spot é claramente sentido na mão',
    ],
    para: 'Avançados com estilo ofensivo e smash consistente.',
    cor: 'border-coral/20 bg-white',
  },
]

export default function FormatoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-tinta/40 mb-6 flex-wrap">
          <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
          <span>/</span>
          <Link href="/guia" className="hover:text-aqua transition-colors">Guia da raquete</Link>
          <span>/</span>
          <span className="text-tinta/70">Formato da cabeça</span>
        </nav>

        <header className="mb-10">
          <div className="inline-flex items-center bg-aqua/10 text-aqua text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Fator 10 de 10
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-tinta leading-tight mb-4">
            Formato da cabeça da raquete de beach tennis
          </h1>
          <p className="text-tinta/70 text-lg leading-relaxed">
            O formato da{' '}
            <TermoGlossario entry={entMoldura}>moldura</TermoGlossario>
            {' '}determina o tamanho e a posição do{' '}
            <TermoGlossario entry={entSweetSpot}>sweet spot</TermoGlossario>
            {', '}o{' '}
            <TermoGlossario entry={entBalance}>balance</TermoGlossario>
            {' '}natural e o perfil geral da raquete. É a escolha que mais muda a identidade de uma raquete.
          </p>
        </header>

        <div className="flex flex-col gap-12 text-tinta/80 leading-relaxed">

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-5 pl-4 border-l-4 border-l-aqua/40">Os três formatos</h2>
            <p className="text-sm text-tinta/60 mb-5">
              Em beach tennis, a redonda é de longe o formato dominante — cerca de 95% das raquetes do mercado. A oval (gota) e o diamante existem, mas são raros. Entender os três ainda é útil para interpretar as diferenças que existem.
            </p>
            <div className="flex flex-col gap-4">
              {FORMATOS.map(({ nome, apelido, sweet, balance, itens, para, cor }) => (
                <div key={nome} className={`rounded-2xl p-5 border shadow-sm ${cor}`}>
                  <div className="mb-3">
                    <p className="font-heading font-bold text-tinta text-base">{nome}</p>
                    <p className="text-tinta/40 text-xs">{apelido}</p>
                  </div>
                  <div className="flex gap-3 mb-3 flex-wrap">
                    <span className="text-[10px] font-medium text-tinta/60 bg-white border border-tinta/10 px-2.5 py-1 rounded-full">
                      Sweet spot: {sweet}
                    </span>
                    <span className="text-[10px] font-medium text-tinta/60 bg-white border border-tinta/10 px-2.5 py-1 rounded-full">
                      Balance: {balance}
                    </span>
                  </div>
                  <ul className="space-y-1.5 mb-3">
                    {itens.map(i => (
                      <li key={i} className="flex items-start gap-2 text-[15px] text-tinta/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-aqua/70 mt-[0.45rem] shrink-0 flex-shrink-0" aria-hidden="true" />
                        {i}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-tinta/50 border-t border-tinta/5 pt-2 mt-1">
                    <span className="font-semibold text-tinta/70">Para quem: </span>{para}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4 pl-4 border-l-4 border-l-aqua/40">
              O mito do formato certo
            </h2>
            <p className="mb-4">
              Não existe um formato objetivamente melhor. Existe o formato certo para o seu estilo. Um iniciante com uma raquete diamante vai sofrer para encontrar o sweet spot e vai sentir mais impacto no braço. Um avançado ofensivo com uma raquete redonda vai sentir falta de{' '}
              <TermoGlossario entry={entPotencia}>potência</TermoGlossario>
              {' '}no smash.
            </p>
            <p>
              Na prática, a esmagadora maioria das raquetes de beach tennis é redonda. Se quiser uma oval (gota), verifique a ficha técnica — muitas marcas usam o termo "oval" em vez de "gota". Raquetes diamante são muito raras no catálogo atual.
            </p>
          </section>

          <aside className="bg-[#EAF7F6] rounded-2xl px-5 py-5 border-l-4 border-l-aqua/60">
            <p className="font-semibold text-tinta text-sm mb-2">Resumo rápido: qual formato para cada perfil</p>
            <ul className="space-y-2">
              {[
                { perfil: 'Iniciante', formato: 'Redonda', motivo: 'sweet spot amplo, maior tolerância ao erro' },
                { perfil: 'Intermediário', formato: 'Gota ou redonda', motivo: 'equilíbrio; avalie o seu ponto fraco' },
                { perfil: 'Avançado ofensivo', formato: 'Diamante ou gota', motivo: 'mais potência no smash' },
                { perfil: 'Avançado defensivo', formato: 'Redonda ou gota', motivo: 'reação e controle' },
                { perfil: 'Braço sensível', formato: 'Redonda', motivo: 'balance ao cabo reduz carga no braço' },
              ].map(({ perfil, formato, motivo }) => (
                <li key={perfil} className="flex items-start gap-2 text-sm">
                  <span className="font-semibold text-tinta/70 shrink-0 w-36">{perfil}</span>
                  <span className="text-aqua font-semibold">{formato}</span>
                  <span className="text-tinta/50 text-xs mt-0.5">{motivo}</span>
                </li>
              ))}
            </ul>
          </aside>

        </div>

        <div className="mt-14 bg-tinta rounded-2xl p-7 md:p-9 flex flex-col items-center gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl leading-snug max-w-sm">
            Você leu os 10 fatores. Agora é hora da indicação certa.
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-sm">
            Nosso especialista usa tudo isso para recomendar a raquete que serve exatamente para o seu nível, estilo e orçamento. De graça, na hora, explicando o porquê de cada escolha.
          </p>
          <Link href="/" className="bg-coral text-white font-heading font-bold text-sm px-7 py-3 rounded-xl hover:bg-coral/90 active:scale-[0.98] transition-all">
            Falar com o especialista grátis →
          </Link>
        </div>

        <nav className="mt-10 pt-6 border-t border-tinta/10 flex items-center justify-between text-sm">
          <Link href="/guia/sweet-spot" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Anterior: Sweet spot
          </Link>
          <Link href="/guia" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            Ver guia completo
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </nav>

      </article>
    </>
  )
}
