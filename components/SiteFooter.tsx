export default function SiteFooter() {
  return (
    <footer className="w-full border-t border-tinta/10 mt-8 py-5 px-4 text-center text-[11px] text-tinta/40 leading-relaxed">
      <p>
        Alguns links neste site são de afiliado. Podemos receber comissão sobre compras realizadas por esses links,
        sem custo adicional para você. Isso não influencia nossas recomendações.{' '}
        <a href="/termos" className="underline underline-offset-2 hover:text-tinta/60 transition-colors">
          Política de afiliados
        </a>
        .
      </p>
      <p className="mt-1">© {new Date().getFullYear()} Turaquete</p>
    </footer>
  )
}
