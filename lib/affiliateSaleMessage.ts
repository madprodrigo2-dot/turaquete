// Monta o texto (HTML do Telegram) do aviso de venda de afiliado. Função pura, sem rede.

export interface VendaAfiliado {
  id: string
  produto: string | null
  loja: string | null
  venda: string | null
  comissao: string | null
  data: string | null
  status: string | null
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// "53.00" | "53,00" | "1.234,56" | "R$ 53,00" | 53 -> número; null se não for claramente um valor.
export function parseValor(raw: string): number | null {
  const s = raw.replace(/R\$\s*/i, '').trim()
  if (!/^\d[\d.,]*$/.test(s)) return null
  const n = s.includes(',')
    ? Number(s.replace(/\./g, '').replace(',', '.'))   // formato BR: ponto = milhar, vírgula = decimal
    : Number(s)                                        // "53.00": ponto = decimal
  return Number.isFinite(n) ? n : null
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function moeda(raw: string | null): { texto: string; n: number | null } | null {
  if (!raw) return null
  const n = parseValor(raw)
  return n == null ? { texto: raw, n: null } : { texto: brl(n), n }
}

// "2026-11-19" -> "19/11/2026" (com hora, se vier: "2026-11-19 10:30" -> "19/11/2026 10:30"). Outro formato: como veio.
function dataBr(raw: string | null): string | null {
  if (!raw) return null
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}))?/)
  return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : raw
}

// "EM REVISÃO" -> "Em revisão" (só a primeira letra maiúscula).
function frase(raw: string): string {
  const t = raw.trim().toLocaleLowerCase('pt-BR')
  return t.charAt(0).toLocaleUpperCase('pt-BR') + t.slice(1)
}

function emojiStatus(status: string): string {
  const s = status.toLocaleLowerCase('pt-BR')
  if (/revis|pendente|an[aá]lise|aguard/.test(s)) return '⏳'
  if (/cancel|recus|devol|estorn/.test(s)) return '❌'
  if (/aprov|confirm|pago|conclu/.test(s)) return '✅'
  return '•'
}

export function montarMensagemVenda(v: VendaAfiliado): string {
  const venda = moeda(v.venda)
  const com = moeda(v.comissao)
  const pct = venda?.n && com?.n != null && venda.n > 0
    ? ` (${((com.n / venda.n) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`
    : ''
  const data = dataBr(v.data)

  const linhas: string[] = ['💰 <b>Nova venda de afiliado</b>', '<i>Mercado Livre</i>', '']
  if (v.produto) linhas.push(`🛍 ${esc(v.produto)}`)
  if (v.loja) linhas.push(`🏪 ${esc(v.loja)}`)
  if (v.produto || v.loja) linhas.push('')
  if (venda) linhas.push(`<b>Venda:</b> ${esc(venda.texto)}`)
  if (com) linhas.push(`<b>Comissão:</b> ${esc(com.texto)}${pct}`)
  if (data) linhas.push(`<b>Data:</b> ${esc(data)}`)
  if (v.status) linhas.push(`<b>Status:</b> ${emojiStatus(v.status)} ${esc(frase(v.status))}`)
  linhas.push('', `<b>ID:</b> <code>${esc(v.id)}</code>`)
  return linhas.join('\n')
}
