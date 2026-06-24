import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Turaquete para lojas e marcas | Parcerias',
  description: 'Direcione compradores qualificados de beach tennis para a sua loja ou marca. Saiba como trabalhar com o Turaquete.',
}

export default function ParaLojasPage() {
  return (
    <div className="min-h-screen sand-texture">
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-12 md:py-16 flex flex-col gap-8">

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
            <div className="flex flex-wrap gap-3">
              <a
                href="https://wa.me/5547997649011?text=Oi!%20Tenho%20uma%20loja%2Fmarca%20e%20quero%20saber%20como%20trabalhar%20com%20o%20Turaquete."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-aqua text-white font-semibold text-sm py-3 px-6 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
              <a
                href="mailto:contato@turaquete.com.br"
                className="inline-flex items-center gap-2 border border-aqua/40 text-aqua font-semibold text-sm py-3 px-6 rounded-xl hover:bg-aqua/5 active:scale-[0.98] transition-all"
              >
                contato@turaquete.com.br
              </a>
            </div>
          </section>

        </div>

        <p className="text-center text-tinta/30 text-xs">
          Turaquete &middot; {new Date().getFullYear()}
        </p>

      </div>
    </div>
  )
}
