import type { Metadata } from 'next'
import Link from 'next/link'
import TermoGlossario from '@/components/TermoGlossario'
import { GLOSSARIO } from '@/lib/glossario'

const BASE = 'https://www.turaquete.com.br'
const PAGE_URL = `${BASE}/guia/eva`

export const metadata: Metadata = {
  title: 'EVA na raquete de beach tennis: macio, médio ou duro?',
  description: 'O EVA é a espuma do núcleo da raquete de beach tennis. Entenda como a densidade do EVA afeta o conforto, a potência e a proteção do braço, e qual escolher.',
  openGraph: {
    title: 'EVA da raquete de beach tennis: macio, médio ou duro?',
    description: 'Como a densidade da espuma EVA define conforto, potência e proteção do braço na raquete de beach tennis.',
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EVA na raquete de beach tennis: macio, médio ou duro?',
    description: 'Como a densidade da espuma EVA define conforto, potência e proteção do braço.',
  },
  alternates: { canonical: PAGE_URL },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'EVA na raquete de beach tennis: macio, médio ou duro?',
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
        { '@type': 'ListItem', position: 3, name: 'EVA',             item: PAGE_URL },
      ],
    },
  ],
}

const entEva      = GLOSSARIO.find(e => e.termo === 'EVA')!
const entNucleo   = GLOSSARIO.find(e => e.termo === 'núcleo')!
const entConforto = GLOSSARIO.find(e => e.termo === 'conforto')!
const entPotencia = GLOSSARIO.find(e => e.termo === 'potência')!

const DENSIDADES = [
  {
    tipo: 'EVA macio',
    efeito: ['Alta absorção de vibração', 'Mais proteção ao braço', 'Sensação de toque mais suave', 'Menor retorno de energia'],
    para: 'Iniciantes, jogadores com cotovelo ou ombro sensível, quem prioriza conforto e longos jogos.',
    cor: 'border-aqua/30 bg-[#EAF7F6]',
  },
  {
    tipo: 'EVA médio',
    efeito: ['Equilíbrio entre conforto e potência', 'Absorção moderada de vibração', 'Resposta previsível'],
    para: 'Intermediários e avançados que alternam entre defesa e ataque.',
    cor: 'border-[rgba(14,58,64,0.06)] bg-white',
  },
  {
    tipo: 'EVA duro / firme',
    efeito: ['Menor absorção de vibração', 'Mais retorno de energia (potência)', 'Saída de bola mais viva', 'Mais exigente para o braço'],
    para: 'Avançados ofensivos com braço condicionado. Não recomendado para quem tem sensibilidade articular.',
    cor: 'border-coral/20 bg-white',
  },
]

export default function EvaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-tinta/40 mb-6 flex-wrap">
          <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
          <span>/</span>
          <Link href="/guia" className="hover:text-aqua transition-colors">Guia da raquete</Link>
          <span>/</span>
          <span className="text-tinta/70">EVA</span>
        </nav>

        <header className="mb-10">
          <div className="inline-flex items-center bg-aqua/10 text-aqua text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Fator 4 de 10
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-tinta leading-tight mb-4">
            EVA: o núcleo da raquete de beach tennis
          </h1>
          <p className="text-tinta/70 text-lg leading-relaxed">
            O{' '}
            <TermoGlossario entry={entEva}>EVA</TermoGlossario>
            {' '}é a espuma que preenche o{' '}
            <TermoGlossario entry={entNucleo}>núcleo</TermoGlossario>
            {' '}da raquete. Você não o vê, mas sente cada golpe. A densidade do EVA é um dos fatores que mais impacta o{' '}
            <TermoGlossario entry={entConforto}>conforto</TermoGlossario>
            {' '}e a{' '}
            <TermoGlossario entry={entPotencia}>potência</TermoGlossario>.
          </p>
        </header>

        <div className="flex flex-col gap-10 text-tinta/80 leading-relaxed">

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4">Como o EVA funciona</h2>
            <p className="mb-4">
              Quando a bola bate na face da raquete, a energia do impacto se propaga pela face e chega ao EVA. Uma espuma macia absorve mais dessa energia, entregando sensação suave e protegendo o braço da vibração. Uma espuma dura devolve mais energia para a bola, o que aumenta a potência, mas transmite mais impacto para a mão e o braço.
            </p>
            <p className="text-sm text-tinta/60">
              É o mesmo princípio de um colchão: macio absorve; firme devolve. Nenhum é universalmente melhor. O ideal depende do seu estilo de jogo e do estado do seu braço.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-5">As três densidades de EVA</h2>
            <div className="flex flex-col gap-3">
              {DENSIDADES.map(({ tipo, efeito, para, cor }) => (
                <div key={tipo} className={`rounded-2xl p-5 border shadow-sm ${cor}`}>
                  <p className="font-heading font-bold text-tinta text-sm mb-3">{tipo}</p>
                  <ul className="space-y-1 mb-3">
                    {efeito.map(e => (
                      <li key={e} className="flex items-start gap-2 text-sm text-tinta/70">
                        <span className="text-aqua mt-0.5 shrink-0">–</span>
                        {e}
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

          <aside className="bg-[#FFC42E]/10 border border-[#FFC42E]/25 rounded-2xl px-5 py-4">
            <p className="font-semibold text-tinta text-sm mb-1">Cotovelo sensível: o EVA é o fator mais importante</p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              Se você tem ou já teve epicondilite (cotovelo de tenista) ou qualquer sensibilidade no braço, o EVA do núcleo tem mais impacto na proteção do que qualquer outro fator, incluindo o peso. Sempre prefira EVA macio nesse caso, e consulte um profissional de saúde antes de voltar ao jogo após uma lesão.
            </p>
          </aside>

          <aside className="bg-[#EAF7F6] border border-aqua/20 rounded-2xl px-5 py-4">
            <p className="font-semibold text-tinta text-sm mb-1">Por que as marcas nem sempre informam o EVA</p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              Muitas fichas técnicas não mencionam o EVA explicitamente, ou usam termos proprietários como "Soft Eva", "Pro Eva" ou "Premium Foam". Na dúvida, o nível de conforto indicado pelo fabricante e as avaliações de jogadores com o perfil similar ao seu são os melhores guias.
            </p>
          </aside>

        </div>

        <div className="mt-14 bg-tinta rounded-2xl p-7 md:p-9 flex flex-col items-center gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl leading-snug max-w-sm">
            Não sabe qual EVA serve para o seu braço?
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Nosso especialista leva em conta sensibilidade articular e estilo de jogo. A indicação é gratuita.
          </p>
          <Link href="/" className="bg-coral text-white font-heading font-bold text-sm px-7 py-3 rounded-xl hover:bg-coral/90 active:scale-[0.98] transition-all">
            Falar com o especialista grátis →
          </Link>
        </div>

        <nav className="mt-10 pt-6 border-t border-tinta/10 flex items-center justify-between text-sm">
          <Link href="/guia/material" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Anterior: Material
          </Link>
          <Link href="/guia/espessura" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            Próximo: Espessura
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </nav>

      </article>
    </>
  )
}
