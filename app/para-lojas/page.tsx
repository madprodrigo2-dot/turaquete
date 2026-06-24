import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Turaquete para lojas e marcas | Parcerias',
  description: 'Direcione compradores qualificados de beach tennis para a sua loja ou marca. Saiba como trabalhar com o Turaquete.',
}

export default function ParaLojasPage() {
  return (
    <div className="min-h-screen sand-texture flex flex-col items-center px-5 py-12 md:py-16">
      <div className="w-full max-w-2xl flex flex-col gap-8">

        <Link href="/" className="text-aqua text-sm font-medium hover:underline">
          ← Voltar
        </Link>

        <div className="flex flex-col gap-2">
          <h1 className="font-heading font-extrabold text-tinta text-3xl md:text-4xl leading-tight">
            Para lojas e marcas
          </h1>
          <p className="text-tinta/60 text-sm md:text-base leading-relaxed mt-1">
            Turaquete ajuda jogadores a escolher a raquete certa para o perfil deles: nível de jogo, estilo, histórico de lesões e orçamento. Quem chega até uma loja recomendada já passou por esse processo. Isso significa compradores qualificados, com intenção de compra clara.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 border border-aqua/20 shadow-sm flex flex-col gap-6 text-tinta/80 text-sm md:text-base leading-relaxed">

          <section className="flex flex-col gap-3">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">Como funciona</h2>
            <p>
              O recomendador analisa o perfil do jogador e sugere modelos reais do mercado. Cada raquete indicada leva o usuário direto para a loja onde pode encontrar o produto. Se a sua loja ou marca aparece nessas indicações, você recebe visitantes que já sabem o que querem comprar.
            </p>
          </section>

          <div className="border-t border-aqua/10" />

          <section className="flex flex-col gap-3">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">O que oferecemos</h2>
            <ul className="flex flex-col gap-2.5">
              {[
                'Direcionamento de compradores qualificados, com intenção de compra definida',
                'Presença nas páginas de produto de cada raquete recomendada',
                'Exposição para um público que já passou pelo processo de escolha e está pronto para comprar',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-aqua shrink-0" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="border-t border-aqua/10" />

          <section className="flex flex-col gap-3">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">Quer trabalhar com a gente?</h2>
            <p>
              Entre em contato contando um pouco sobre a sua loja ou marca. Retornamos em até dois dias úteis.
            </p>
            <a
              href="mailto:contato@turaquete.com.br"
              className="inline-flex items-center justify-center gap-2 bg-aqua text-white font-semibold text-sm py-3 px-6 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all self-start shadow-sm"
            >
              contato@turaquete.com.br
            </a>
          </section>

        </div>

        <p className="text-center text-tinta/30 text-xs">
          Turaquete &middot; {new Date().getFullYear()}
        </p>

      </div>
    </div>
  )
}
