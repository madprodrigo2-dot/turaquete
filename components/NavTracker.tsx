'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { readStack, writeStack } from '@/lib/navStack'

// Mantém a pilha de páginas do site (ver lib/navStack.ts). Não renderiza nada.
//  - Carga completa vinda de fora do site (Google, redes, link direto) ou aba sem histórico:
//    a pilha recomeça só com a página atual, então o "Voltar" usa a rota de respaldo.
//  - Navegação interna: empilha a nova rota; se foi o "atrás" do navegador (popstate recente e a
//    rota é a penúltima da pilha), desempilha.
//  - Recarregar (reload) preserva a pilha.
const POP_WINDOW_MS = 1500

function cargaExterna(): boolean {
  if (window.history.length <= 1) return true
  const nav = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined
  if (nav && (nav.type === 'reload' || nav.type === 'back_forward')) return false
  try {
    return !document.referrer || new URL(document.referrer).origin !== window.location.origin
  } catch {
    return true
  }
}

export default function NavTracker() {
  const pathname = usePathname()
  const iniciado = useRef(false)
  const popEm = useRef(0)

  useEffect(() => {
    const onPop = () => { popEm.current = Date.now() }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    let stack = readStack()
    if (!iniciado.current) {
      iniciado.current = true
      if (cargaExterna() || stack.length === 0) {
        writeStack([pathname])
        return
      }
    }
    const topo = stack[stack.length - 1]
    if (pathname === topo) return
    const foiAtras = Date.now() - popEm.current < POP_WINDOW_MS && stack[stack.length - 2] === pathname
    stack = foiAtras ? stack.slice(0, -1) : [...stack, pathname]
    writeStack(stack)
  }, [pathname])

  return null
}
