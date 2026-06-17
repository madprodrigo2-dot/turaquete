import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termos de Uso — Turaquete',
  description: 'Termos de uso do site Turaquete.',
}

export default function TermosPage() {
  return (
    <div className="min-h-screen sand-texture flex flex-col items-center px-5 py-12 md:py-16">
      <div className="w-full max-w-xl flex flex-col gap-6">

        <Link href="/" className="text-aqua text-sm font-medium hover:underline">
          ← Voltar
        </Link>

        <h1 className="font-heading font-extrabold text-tinta text-3xl md:text-4xl leading-tight">
          Termos de Uso
        </h1>

        <div className="bg-white rounded-2xl p-6 md:p-8 border border-aqua/20 shadow-sm flex flex-col gap-6 text-tinta/80 text-sm md:text-base leading-relaxed">

          <section className="flex flex-col gap-2">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">1. Aceitação dos termos</h2>
            <p>
              Ao acessar e usar o site Turaquete (<span className="font-medium">turaquete.com.br</span>), você concorda com estes Termos de Uso. Se não concordar com algum ponto, pedimos que não utilize o serviço.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">2. Uso permitido</h2>
            <p>
              O site destina-se ao uso pessoal e não comercial. Você pode navegar pelo catálogo, usar o consultor de raquetes e compartilhar links individuais de produtos para fins informativos.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">3. Proibição de scraping e extração automatizada</h2>
            <p>
              É expressamente proibido, sem autorização prévia e por escrito da Turaquete:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Utilizar robôs, spiders, crawlers, scrapers ou qualquer ferramenta automatizada para extrair, coletar ou copiar o conteúdo do site em volume;</li>
              <li>Reproduzir o catálogo de raquetes, fichas técnicas, textos descritivos ou análises comparativas — no todo ou em parte — em outros sites, bases de dados ou produtos;</li>
              <li>Fazer requisições automatizadas em volume que prejudiquem o desempenho do site ou de seus servidores;</li>
              <li>Criar produtos, serviços ou bases de dados derivadas a partir do conteúdo da Turaquete sem autorização.</li>
            </ul>
            <p>
              O catálogo e os textos do site são de propriedade da Turaquete e constituem obra protegida pela Lei de Direitos Autorais (Lei nº 9.610/1998). Uso não autorizado pode sujeitar o infrator a medidas cíveis e penais.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">4. Propriedade intelectual</h2>
            <p>
              Toda a lógica de recomendação, os critérios de fitting, os textos editoriais e o design do site são propriedade exclusiva da Turaquete. Os dados técnicos das raquetes são de domínio público ou fornecidos pelos fabricantes; a curadoria, seleção e análise são obras originais da Turaquete.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">5. Links de afiliado</h2>
            <p>
              Alguns links no site podem ser links de afiliado. A Turaquete pode receber uma comissão sobre compras realizadas por esses links, sem custo adicional para você. Isso não influencia as recomendações, que são baseadas exclusivamente em critérios técnicos e no seu perfil de jogo.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">6. Limitação de responsabilidade</h2>
            <p>
              As recomendações da Turaquete são baseadas nas informações fornecidas pelo usuário e nas especificações técnicas disponíveis. A Turaquete não se responsabiliza por decisões de compra tomadas com base nas sugestões do consultor.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">7. Contato</h2>
            <p>
              Para solicitar autorização de uso do conteúdo ou reportar uso indevido:{' '}
              <a
                href="mailto:contato@turaquete.com.br"
                className="text-aqua hover:underline"
              >
                contato@turaquete.com.br
              </a>
              .
            </p>
          </section>

        </div>

        <p className="text-center text-tinta/30 text-xs">
          Última atualização: junho de 2026
        </p>

      </div>
    </div>
  )
}
