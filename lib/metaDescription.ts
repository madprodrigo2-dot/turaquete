// Meta description das fichas de raquete: frase(s) do perfil_resumo + chamada fixa ao final.
// A chamada fica SEMPRE no fim e inteira: o Google mostra ~150-160 caracteres (menos no mobile), então
// o trecho da raquete é que é recortado (em limite de palavra, sem reticências), nunca a chamada.
// O JSON-LD (Product) NÃO usa isto: segue com o perfil_resumo puro (ver app/raquetes/[slug]/page.tsx).

export const CTA_CONSULTORIA = 'Consultoria gratuita, sem cadastro.'

// Orçamento do trecho da raquete: 115 + ". " (2) + CTA (35) ≈ 152 caracteres no máximo.
const MAX_TRECHO = 115

// Palavras que não podem ficar soltas no fim de um trecho recortado ("... linha de" / "... para").
const SOLTAS = new Set([
  'a', 'o', 'as', 'os', 'e', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
  'com', 'sem', 'para', 'pra', 'por', 'que', 'ou', 'um', 'uma', 'ao', 'à',
  'entre', 'dentro', 'sobre', 'como', 'mais', 'menos', 'até', 'quando', 'se', 'é', 'são',
])

function recortar(texto: string): string {
  if (texto.length <= MAX_TRECHO) return texto
  let t = texto.slice(0, MAX_TRECHO + 1)
  // Preferência: cortar numa quebra natural da frase (vírgula, dois pontos, ponto e vírgula)
  // se o que sobra ainda tem corpo suficiente; senão, no limite da última palavra.
  // Não corta uma enumeração ("potência, controle e manuseio"): ignora vírgulas seguidas de um atributo.
  const ATRIBUTO = /^\s*(potência|controle|conforto|manuseio|spin|estabilidade|perdão|precisão|durabilidade|leveza)/i
  let quebra = -1
  for (let i = t.length - 1; i >= 45; i--) {
    if (',:;'.includes(t[i]) && !(t[i] === ',' && ATRIBUTO.test(texto.slice(i + 1)))) { quebra = i; break }
  }
  if (quebra >= 45) return t.slice(0, quebra).trim()
  t = t.slice(0, Math.max(t.lastIndexOf(' '), 0)).trim()
  const palavras = t.split(' ')
  while (palavras.length > 3 && (SOLTAS.has(palavras[palavras.length - 1].toLowerCase().replace(/[.,;:]+$/, '')))) {
    palavras.pop()
  }
  return palavras.join(' ').replace(/[\s,;:\-–—]+$/, '')
}

export function buildRacketDescription(perfilResumo: string | null | undefined, nomeParaFallback: string, preco?: string | null): string {
  const limpo = (perfilResumo ?? '').replace(/\s+/g, ' ').trim()
  let trecho: string
  if (limpo) {
    // Junta frases inteiras enquanto couberem; se nem a primeira cabe, recorta em limite de palavra.
    const frases = limpo.split(/(?<=[.!?])\s+/)
    trecho = ''
    for (const f of frases) {
      const prox = trecho ? `${trecho} ${f}` : f
      if (prox.length > MAX_TRECHO) break
      trecho = prox
    }
    if (!trecho) trecho = recortar(frases[0])
  } else {
    trecho = `Especificações reais, avaliação e onde comprar a ${nomeParaFallback}.${preco ? ` A partir de ${preco}.` : ''}`
  }
  trecho = trecho.replace(/[.!?\s]+$/, '')
  return `${trecho}. ${CTA_CONSULTORIA}`
}
