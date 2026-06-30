import type { Metadata } from 'next'
import Link from 'next/link'
import TermoGlossario from '@/components/TermoGlossario'
import { GLOSSARIO } from '@/lib/glossario'

const BASE = 'https://www.turaquete.com.br'
const PAGE_URL = `${BASE}/guia/textura`

export const metadata: Metadata = {
  title: 'Textura da face da raquete de beach tennis: spin e efeito',
  description: 'Entenda como a textura da face (lisa, areada ou rugosa) da raquete de beach tennis afeta o spin, o efeito na bola e quando vale a pena escolher cada acabamento.',
  openGraph: {
    title: 'Textura da face da raquete de beach tennis: spin e efeito',
    description: 'Como a textura (lisa, areada, rugosa) afeta o spin e o efeito na bola no beach tennis.',
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Textura da face da raquete de beach tennis: spin e efeito',
    description: 'Como a textura da face afeta o spin e o efeito na bola.',
  },
  alternates: { canonical: PAGE_URL },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Textura da face da raquete de beach tennis: spin e efeito',
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
        { '@type': 'ListItem', position: 3, name: 'Textura',         item: PAGE_URL },
      ],
    },
  ],
}

const entAreado  = GLOSSARIO.find(e => e.termo === 'areado')!
const entQuartzo = GLOSSARIO.find(e => e.termo === 'quartzo')!
const entSpin    = GLOSSARIO.find(e => e.termo === 'spin')!
const entTrama   = GLOSSARIO.find(e => e.termo === 'trama')!

export default function TexturaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-tinta/40 mb-6 flex-wrap">
          <Link href="/" className="hover:text-aqua transition-colors">Início</Link>
          <span>/</span>
          <Link href="/guia" className="hover:text-aqua transition-colors">Guia da raquete</Link>
          <span>/</span>
          <span className="text-tinta/70">Textura</span>
        </nav>

        <header className="mb-10">
          <div className="inline-flex items-center bg-aqua/10 text-aqua text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Fator 8 de 10
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-tinta leading-tight mb-4">
            Textura da face da raquete de beach tennis
          </h1>
          <p className="text-tinta/70 text-lg leading-relaxed">
            O acabamento da superfície da face determina o atrito entre a raquete e a bola no momento do impacto. Mais atrito gera mais{' '}
            <TermoGlossario entry={entSpin}>spin</TermoGlossario>
            {' '}e efeito; menos atrito entrega uma saída de bola mais limpa e linear.
          </p>
        </header>

        <div className="flex flex-col gap-12 text-tinta/80 leading-relaxed">

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-5 pl-4 border-l-4 border-l-aqua/40">Os três acabamentos mais comuns</h2>
            <div className="flex flex-col gap-3">
              {[
                {
                  tipo: 'Lisa',
                  descricao: 'Superfície polida, com pouco atrito. A bola desliza sobre a face, resultando em golpe direto e previsível. Menos spin natural, mais controle de direção.',
                  para: 'Jogadores que preferem controle e precisão. Iniciantes que ainda estão desenvolvendo o timing.',
                  tag: 'controle e precisão',
                },
                {
                  tipo: 'Areada',
                  descricao: `O acabamento ${''} é texturizado, com partículas abrasivas na superfície. O atrito com a bola aumenta, e os golpes com intenção de spin saem com mais efeito. Comum em raquetes intermediárias e avançadas.`,
                  para: 'Intermediários e avançados que querem gerar efeito nos golpes.',
                  tag: 'spin e efeito',
                },
                {
                  tipo: 'Fibra de quartzo',
                  descricao: 'A textura natural da fibra de quartzo cria micro-irregularidades na superfície sem precisar de tratamento adicional. Além do spin, oferece mais sensação de toque e absorção de vibração.',
                  para: 'Jogadores que buscam spin com conforto. Quem tem sensibilidade no braço.',
                  tag: 'spin + conforto',
                },
              ].map(({ tipo, descricao, para, tag }) => (
                <div key={tipo} className="bg-white rounded-2xl p-5 border border-[rgba(14,58,64,0.06)] shadow-sm">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="font-heading font-bold text-tinta text-sm">{tipo}</p>
                    <span className="text-[10px] font-medium text-tinta/40 bg-[#EAF7F6] px-2.5 py-1 rounded-full">{tag}</span>
                  </div>
                  <p className="text-[15px] leading-relaxed text-tinta/70 mb-2">{descricao}</p>
                  <p className="text-xs text-tinta/50">
                    <span className="font-semibold text-tinta/70">Para quem: </span>{para}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-tinta mb-4 pl-4 border-l-4 border-l-aqua/40">Textura e trama: os dois lados do spin</h2>
            <p className="mb-4">
              A textura da superfície e o padrão de{' '}
              <TermoGlossario entry={entTrama}>trama</TermoGlossario>
              {' '}(furos) atuam juntos. Uma face{' '}
              <TermoGlossario entry={entAreado}>areada</TermoGlossario>
              {' '}com trama aberta gera o máximo de spin. Uma face lisa com trama densa entrega o máximo de controle linear. A combinação define o perfil de spin da raquete.
            </p>
            <p className="text-sm text-tinta/60">
              Para quem quer efeito mas ainda não domina o golpe com spin: prefira face areada com trama média. Gera efeito nos golpes bons sem punir demais os erros.
            </p>
          </section>

          <aside className="bg-[#FFFAEB] rounded-2xl px-5 py-5 border-l-4 border-l-[#FFC42E]">
            <p className="font-semibold text-tinta text-sm mb-1">Acabamento areado desgasta com o uso</p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              A textura abrasiva perde eficiência ao longo do tempo, especialmente em jogadores com alto volume de treino. É um fator a considerar na durabilidade: uma raquete areada usada intensamente por meses pode perder parte do seu potencial de spin.
            </p>
          </aside>

          <aside className="bg-[#EAF7F6] rounded-2xl px-5 py-5 border-l-4 border-l-aqua/60">
            <p className="font-semibold text-tinta text-sm mb-1">
              <TermoGlossario entry={entQuartzo}>Quartzo</TermoGlossario>
              {': '}textura sem tratamento adicional
            </p>
            <p className="text-tinta/70 text-sm leading-relaxed">
              A fibra de quartzo tem uma aspereza natural que gera atrito sem depender de partículas coladas na superfície. Por isso, a textura do quartzo é mais duradoura do que o acabamento areado convencional.
            </p>
            <Link href="/guia/material" className="inline-block mt-2 text-aqua text-xs font-semibold hover:underline">
              Entenda os materiais →
            </Link>
          </aside>

        </div>

        <div className="mt-14 bg-tinta rounded-2xl p-7 md:p-9 flex flex-col items-center gap-4 text-center">
          <p className="font-heading font-bold text-white text-xl leading-snug max-w-sm">
            Qual textura combina com o seu jogo?
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Nosso especialista considera spin, controle e saúde do braço juntos. A indicação é gratuita.
          </p>
          <Link href="/" className="bg-coral text-white font-heading font-bold text-sm px-7 py-3 rounded-xl hover:bg-coral/90 active:scale-[0.98] transition-all">
            Falar com o especialista grátis →
          </Link>
        </div>

        <nav className="mt-10 pt-6 border-t border-tinta/10 flex items-center justify-between text-sm">
          <Link href="/guia/coracao" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Anterior: Coração
          </Link>
          <Link href="/guia/sweet-spot" className="flex items-center gap-1.5 text-tinta/50 hover:text-aqua transition-colors">
            Próximo: Sweet spot
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </nav>

      </article>
    </>
  )
}
