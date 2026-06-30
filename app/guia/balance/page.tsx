import type { Metadata } from 'next'
import Link from 'next/link'
import TermoGlossario from '@/components/TermoGlossario'
import { GLOSSARIO } from '@/lib/glossario'

const BASE = 'https://www.turaquete.com.br'
const PAGE_URL = `${BASE}/guia/balance`

export const metadata: Metadata = {
  title: 'Balance da raquete de beach tennis: controle ou potência?',
  description: 'O que é o balance (ponto de equilíbrio) da raquete de beach tennis e como ele define se a raquete favorece o controle, o manuseio ou a potência no smash.',
  openGraph: {
    title: 'Balance da raquete de beach tennis: controle ou potência?',
    description: 'Como o ponto de equilíbrio define o comportamento da raquete no jogo e qual balance combina com cada estilo.',
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Balance da raquete de beach tennis: controle ou potência?',
    description: 'Como o ponto de equilíbrio define o comportamento da raquete no jogo.',
  },
  alternates: { canonical: PAGE_URL },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Balance da raquete de beach tennis: controle ou potência?',
      description: 'Como o ponto de equilíbrio define o comportamento da raquete no jogo e qual balance combina com cada estilo.',
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
        { '@type': 'ListItem', position: 3, name: 'Balance',         item: PAGE_URL },
      ],
    },
  ],
}

const entBalance  = GLOSSARIO.find(e => e.termo === 'balance')!
const entPotencia = GLOSSARIO.find(e => e.termo === 'potência')!
const entManuseio = GLOSSARIO.find(e => e.termo === 'manuseio')!
const entControle = GLOSSARIO.find(e => e.termo === 'controle')!

const TYPES = [
  {
    tipo: 'Balance ao cabo',
    tag: 'controle',
    cor: 'text-aqua',
    bg: 'bg-[#EAF7F6]',
    descricao: 'O peso se concentra na metade inferior da raquete. O resultado é mais agilidade e precisão: a raquete obedece ao pulso, reage rápido e cansa menos o braço.',
    para: 'Jogadores de defesa, iniciantes e intermediários, quem prioriza voleios e trocas rápidas.',
  },
  {
    tipo: 'Balance médio',
    tag: 'equilíbrio',
    cor: 'text-tinta',
    bg: 'bg-white',
    descricao: 'Distribuição uniforme entre cabo e cabeça. A raquete não entrega o máximo de potência nem de manuseio, mas funciona bem em qualquer situação.',
    para: 'Jogadores versáteis, intermediários que ainda estão definindo o estilo de jogo.',
  },
  {
    tipo: 'Balance à cabeça',
    tag: 'potência',
    cor: 'text-coral',
    bg: 'bg-white',
    descricao: 'O peso se concentra na parte superior. No smash, esse momentum extra entrega mais impacto. O preço é o manuseio: a raquete demora mais para mudar de direção.',
    para: 'Jogadores avançados com estilo ofensivo, quem tem smash como golpe principal.',
  },
]

export default function BalancePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-tinta/40 mb-6 flex-wrap">
          <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
          <span>/</span>
          <Link href="/guia" className="hover:text-aqua transition-colors">Guia da raquete</Link>
          <span>/</span>
          <span className="text-tinta/70">Balance</span>
        </nav>

        <header className="mb-10">
          <div className="inline-flex items-center bg-aqua/10 text-aqua text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Fator 2 de 10
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-tinta leading-tight mb-4">
            Balance da raquete de beach tennis
          </h1>
          <p className="text-tinta/70 text-lg leading-relaxed">
            O{' '}
            <TermoGlossario entry={entBalance}>balance</TermoGlossario>
            {' '}é o ponto de equilíbrio da raquete: onde ela "para" se você apoiar o cabo sobre um dedo. Esse ponto define como a raquete se comporta no golpe, independentemente do peso total.
          </p>
        </header>

        <div className="flex flex-col gap-12 text-tinta/80 leading-relaxed">

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4 pl-4 border-l-4 border-l-aqua/40">
              Por que o balance importa tanto quanto o peso
            </h2>
            <p className="mb-4">
              Duas raquetes com o mesmo peso podem se sentir completamente diferentes na mão. Uma de 355 g com balance à cabeça entrega mais{' '}
              <TermoGlossario entry={entPotencia}>potência</TermoGlossario>
              {' '}no smash do que uma de 365 g com balance ao cabo. E a segunda responde com mais{' '}
              <TermoGlossario entry={entManuseio}>manuseio</TermoGlossario>
              {' '}na defesa.
            </p>
            <p>
              O balance determina onde a massa está concentrada, e isso define o comportamento real da raquete no golpe.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-5 pl-4 border-l-4 border-l-aqua/40">
              Os três tipos de balance
            </h2>
            <p className="text-sm text-tinta/60 mb-5">
              Em beach tennis, o balance médio é de longe o mais comum — a grande maioria das raquetes do mercado se enquadra nessa categoria. Balance ao cabo ou à cabeça existem, mas são minoria no catálogo atual.
            </p>
            <div className="flex flex-col gap-3">
              {TYPES.map(({ tipo, tag, cor, bg, descricao, para }) => (
                <div key={tipo} className={`${bg} rounded-2xl p-5 border border-[rgba(14,58,64,0.06)] shadow-sm`}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="font-heading font-bold text-tinta text-sm">{tipo}</p>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${cor}`}>{tag}</span>
                  </div>
                  <p className="text-[15px] leading-relaxed text-tinta/70 mb-2">{descricao}</p>
                  <p className="text-xs text-tinta/50 leading-snug">
                    <span className="font-semibold text-tinta/70">Para quem: </span>{para}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4 pl-4 border-l-4 border-l-aqua/40">
              Como identificar o balance de uma raquete
            </h2>
            <p className="mb-4">
              Marcas confiáveis informam o balance em milímetros, medidos da ponta do cabo até o ponto de equilíbrio. Quanto maior o número, mais o peso está concentrado na cabeça. Mas nem todas as marcas publicam esse dado, e algumas usam termos como "baixo", "médio" e "alto" sem referência numérica.
            </p>
            <p className="text-sm text-tinta/60">
              Quando a informação não estiver disponível: raquetes redondas tendem a ter balance mais ao cabo; raquetes diamante, mais à cabeça. O formato da cabeça já é um indicativo.
            </p>
          </section>

          <aside className="bg-[#EAF7F6] rounded-2xl px-5 py-5 border-l-4 border-l-aqua/60">
            <p className="font-semibold text-tinta text-sm mb-1">
              <TermoGlossario entry={entControle}>Controle</TermoGlossario>
              {' '}ou potência: balance define mais do que o peso
            </p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              Se você está em dúvida entre dois modelos parecidos, o balance é o fator desempate mais importante. Balance ao cabo favorece quem joga com o pulso; balance à cabeça favorece quem usa mais o ombro e o corpo no smash.
            </p>
          </aside>

        </div>

        <div className="mt-14 bg-tinta rounded-2xl p-7 md:p-9 flex flex-col items-center gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl leading-snug max-w-sm">
            Não sabe qual balance combina com o seu jogo?
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Nosso especialista identifica o seu estilo e indica a raquete certa. Gratuito, na hora, sem cadastro.
          </p>
          <Link href="/" className="bg-coral text-white font-heading font-bold text-sm px-7 py-3 rounded-xl hover:bg-coral/90 active:scale-[0.98] transition-all">
            Falar com o especialista grátis →
          </Link>
        </div>

        <nav className="mt-10 pt-6 border-t border-tinta/10 flex items-center justify-between text-sm">
          <Link href="/guia/peso" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Anterior: Peso
          </Link>
          <Link href="/guia/material" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            Próximo: Material
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </nav>

      </article>
    </>
  )
}
