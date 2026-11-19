// Pilha das páginas DO SITE visitadas nesta aba (sessionStorage). Existe porque o "Voltar" não pode
// confiar em window.history.length: ele conta também as páginas externas (Google, redes). Quem chega
// do Google tem length > 1, e router.back() o devolveria ao Google em vez de mantê-lo no site.
// Escrita por components/NavTracker.tsx; lida por components/BackButton.tsx.

const KEY = 'tq_nav_stack_v1'
const MAX = 50

export function readStack(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function writeStack(stack: string[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-MAX)))
  } catch {
    /* sessionStorage bloqueado: sem pilha, o Voltar usa sempre a rota de respaldo (seguro) */
  }
}

// Existe uma página anterior do site na qual o usuário pode voltar?
export function hasPreviousInSite(): boolean {
  return readStack().length > 1 && window.history.length > 1
}

// Texto do botão "Voltar" quando o destino é a página da marca (chegada de fora do site).
// Marcas de nome longo (ex.: "Flow Beach Tennis") caem no texto genérico para não quebrar o cabeçalho
// no mobile. Quando há página anterior do site, o botão volta a dizer só "Voltar" (ver BackButton).
export const MAX_MARCA_NO_BOTAO = 16

export function labelVerMaisMarca(nomeMarca: string | null | undefined): string {
  const n = (nomeMarca ?? '').trim()
  return n && n.length <= MAX_MARCA_NO_BOTAO ? `Ver mais da ${n}` : 'Ver mais raquetes'
}

// Evento que o NavTracker dispara depois de atualizar a pilha, para o BackButton reavaliar o texto.
export const NAV_EVENT = 'tq-nav'
