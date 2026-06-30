import type { Metadata } from 'next'
import Link from 'next/link'
import TermoGlossario from '@/components/TermoGlossario'
import { GLOSSARIO } from '@/lib/glossario'

const BASE = 'https://www.turaquete.com.br'
const PAGE_URL = `${BASE}/guia/peso`

export const metadata: Metadata = {
  title: 'Peso da raquete de beach tennis: qual o ideal para o seu jogo?',
  description: 'Entenda como o peso da raquete afeta potência, manuseio e conforto no beach tennis. Veja qual faixa combina com o seu nível, estilo e condicionamento físico.',
  openGraph: {
    title: 'Peso da raquete de beach tennis: qual o ideal?',
    description: 'Como o peso afeta potência, manuseio e conforto, e qual faixa combina com cada perfil de jogador.',
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peso da raquete de beach tennis: qual o ideal?',
    description: 'Como o peso afeta potência, manuseio e conforto no beach tennis.',
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Peso da raquete de beach tennis: qual o ideal para o seu jogo?',
      description: 'Como o peso afeta potência, manuseio e conforto, e qual faixa combina com cada perfil de jogador.',
      url: PAGE_URL,
      author: { '@type': 'Organization', name: 'Turaquete', url: BASE },
      publisher: {
        '@type': 'Organization',
        name: 'Turaquete',
        url: BASE,
        logo: { '@type': 'ImageObject', url: `${BASE}/turaquete-logo.png` },
      },
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${BASE}/guia#webpage` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início',          item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Guia da raquete', item: `${BASE}/guia` },
        { '@type': 'ListItem', position: 3, name: 'Peso',            item: PAGE_URL },
      ],
    },
  ],
}

const potencia  = GLOSSARIO.find(e => e.termo === 'potência')!
const manuseio  = GLOSSARIO.find(e => e.termo === 'manuseio')!
const conforto  = GLOSSARIO.find(e => e.termo === 'conforto')!
const balance   = GLOSSARIO.find(e => e.termo === 'balance')!

const PROFILES = [
  {
    label: 'Iniciante ou jogador casual',
    range: '320 a 340 g',
    tip:   'Reação mais rápida, menor cansaço. Mais tolerante a erros de tempo no golpe.',
  },
  {
    label: 'Intermediário',
    range: '335 a 355 g',
    tip:   'Equilibra potência e manuseio. Boa base para a maioria dos jogos.',
  },
  {
    label: 'Avançado / ofensivo',
    range: '350 g ou mais',
    tip:   'Mais momentum no smash. Exige braço condicionado para manter a qualidade do gesto ao longo do jogo.',
  },
  {
    label: 'Cotovelo, ombro ou pulso sensível',
    range: 'menor da faixa',
    tip:   'Prefira sempre o peso mais baixo dentro do nível indicado, independentemente do estilo de jogo.',
  },
]

export default function PesoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-tinta/40 mb-6 flex-wrap">
          <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
          <span>/</span>
          <Link href="/guia" className="hover:text-aqua transition-colors">Guia da raquete</Link>
          <span>/</span>
          <span className="text-tinta/70">Peso</span>
        </nav>

        {/* Hero */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-1.5 bg-aqua/10 text-aqua text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <span>Fator 1 de 10</span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-tinta leading-tight mb-4">
            Peso da raquete de beach tennis
          </h1>
          <p className="text-tinta/70 text-lg leading-relaxed">
            O peso é o primeiro número que aparece na ficha técnica de qualquer raquete. A faixa típica vai de 320 g a 365 g, mas a diferença de 20 gramas no jogo é maior do que parece.
          </p>
        </header>

        <div className="flex flex-col gap-10 text-tinta/80 leading-relaxed">

          {/* — Como afeta o jogo — */}
          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4">
              Como o peso muda o seu jogo
            </h2>
            <p className="mb-5">
              O peso da raquete influencia três dimensões ao mesmo tempo:{' '}
              <TermoGlossario entry={potencia}>potência</TermoGlossario> no ataque,{' '}
              <TermoGlossario entry={manuseio}>manuseio</TermoGlossario> em defesas rápidas, e{' '}
              <TermoGlossario entry={conforto}>conforto</TermoGlossario> ao longo do jogo.
              {' '}E elas puxam em direções opostas: o que ganha em uma, tende a ceder em outra.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: 'Potência',
                  texto: 'Mais massa carrega mais momentum no smash. Raquetes pesadas entregam mais impacto, mas só aproveitam quem consegue acelerar o gesto com controle.',
                },
                {
                  label: 'Manuseio',
                  texto: 'Raquetes leves reagem mais rápido. Na defesa, nos voleios próximos à rede e em trocas de ritmo, o peso extra trabalha contra você.',
                },
                {
                  label: 'Conforto',
                  texto: 'Peso alto acumula carga no braço. Peso muito baixo pode vibrar mais no impacto, pois há menos massa para absorver o choque. O ponto certo depende do seu condicionamento.',
                },
              ].map(({ label, texto }) => (
                <div
                  key={label}
                  className="bg-white rounded-2xl p-5 border border-[rgba(14,58,64,0.06)] shadow-sm flex flex-col gap-2"
                >
                  <p className="text-aqua font-heading font-bold text-sm">{label}</p>
                  <p className="text-sm leading-relaxed text-tinta/70">{texto}</p>
                </div>
              ))}
            </div>
          </section>

          {/* — Qual peso combina — */}
          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-2">
              Qual peso combina com você?
            </h2>
            <p className="mb-5 text-sm">
              Não existe um peso universalmente melhor. Existe o peso certo para o seu nível, estilo e condicionamento físico.
            </p>
            <div className="flex flex-col gap-2.5">
              {PROFILES.map(({ label, range, tip }) => (
                <div
                  key={label}
                  className="bg-white rounded-xl px-5 py-4 border border-[rgba(14,58,64,0.06)] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-tinta text-sm leading-snug">{label}</p>
                    <p className="text-tinta/50 text-xs mt-0.5 leading-snug">{tip}</p>
                  </div>
                  <span className="bg-[#EAF7F6] text-aqua font-heading font-bold text-sm px-4 py-1.5 rounded-full shrink-0 self-start sm:self-auto whitespace-nowrap">
                    {range}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* — Aviso peso anunciado — */}
          <aside className="bg-[#FFC42E]/10 border border-[#FFC42E]/25 rounded-2xl px-5 py-4">
            <p className="font-semibold text-tinta text-sm mb-1">Cuidado com o peso anunciado</p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              A maioria das marcas informa o peso sem grip, overgrip ou fita protetora. O conjunto pode adicionar entre 10 g e 25 g ao peso total. Quando comparar dois modelos, verifique se as especificações estão na mesma base antes de decidir.
            </p>
          </aside>

          {/* — Peso e balance — */}
          <aside className="bg-[#EAF7F6] border border-aqua/20 rounded-2xl px-5 py-4">
            <p className="font-semibold text-tinta text-sm mb-1">Peso e balance andam juntos</p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              O{' '}
              <TermoGlossario entry={balance}>balance</TermoGlossario>
              {' '}(ponto de equilíbrio) pode mudar radicalmente como a raquete se sente na mão, mesmo com o mesmo peso total. Uma raquete de 355 g com balance à cabeça pode parecer mais pesada no golpe do que uma de 365 g com balance ao cabo. Por isso o peso sozinho não conta a história completa.
            </p>
            <Link
              href="/guia/balance"
              className="inline-block mt-2 text-aqua text-xs font-semibold hover:underline"
            >
              Entenda o balance →
            </Link>
          </aside>

        </div>

        {/* CTA */}
        <div className="mt-14 bg-tinta rounded-2xl p-7 md:p-9 flex flex-col items-center gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl leading-snug max-w-sm">
            Quer saber qual peso combina com o seu jogo?
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Nosso especialista considera o seu nível, estilo e condicionamento para indicar a raquete certa. Gratuito, na hora, sem cadastro.
          </p>
          <Link
            href="/"
            className="bg-coral text-white font-heading font-bold text-sm px-7 py-3 rounded-xl hover:bg-coral/90 active:scale-[0.98] transition-all"
          >
            Falar com o especialista grátis →
          </Link>
        </div>

        {/* Nav bottom */}
        <nav className="mt-10 pt-6 border-t border-tinta/10 flex items-center justify-between text-sm">
          <Link
            href="/guia"
            className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Guia da raquete
          </Link>
          <Link
            href="/guia/balance"
            className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors"
          >
            Próximo: Balance
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </nav>

      </article>
    </>
  )
}
