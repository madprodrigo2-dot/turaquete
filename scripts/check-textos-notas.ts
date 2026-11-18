// Auditoria: textos editoriais (summary / perfil_resumo) vs as 7 notas reais do motor.
// Uso: npx tsx scripts/check-textos-notas.ts [slug] [--json=arquivo] [--min=2]
// Só lê (nunca escreve). Sai com código 1 se achar algo de severidade >= --min (padrão 2).
//
// Heurística (linguagem natural => há falsos positivos; o objetivo é priorizar revisão humana):
//  SUPER   superlativo ("máximo", "brutal", "absoluto"...) em dimensão com nota <= 7
//  ALTO    adjetivo forte ("alto", "excelente", "acentuada"...) em dimensão com nota <= 6
//  BOM     "bom/sólido" em dimensão com nota <= 4
//  BAIXO   "baixo/pouco/limitado" em dimensão com nota >= 7
//  IDENT   "raquete de <dimensão>" / "foco em <dimensão>" quando a dimensão não está no top-2 da raquete
//  OMITE   o perfil_resumo não cita nenhuma das dimensões mais fortes (nota >= 8)
//  NUM     nota numérica escrita no texto que difere da real ("controle 10")
//  CONTRA  summary e perfil_resumo afirmam coisas opostas sobre a mesma dimensão
//  NIVEL   texto "só para avançado" em raquete que o motor marca desde o iniciante
import fs from 'fs'

type Dim = 'power' | 'control' | 'comfort' | 'maneuverability' | 'spin' | 'stability' | 'forgiveness'
const LABEL: Record<Dim, string> = {
  power: 'potência', control: 'controle', comfort: 'conforto', maneuverability: 'manuseio',
  spin: 'spin', stability: 'estabilidade', forgiveness: 'perdão',
}
// Termos que designam cada dimensão (minúsculas, sem acento tratado via normalize).
const ALIAS: Record<Dim, string[]> = {
  power: ['potência', 'potencia', 'poder de fogo', 'bola rápida', 'velocidade de bola', 'velocidade na bola'],
  control: ['controle', 'precisão de direcionamento', 'colocação', 'direcionamento', 'precisão'],
  comfort: ['conforto', 'amortecimento', 'absorção', 'absorve', 'proteção articular', 'protege o cotovelo', 'poupa o braço'],
  maneuverability: ['manuseio', 'manobrabilidade', 'maneabilidade', 'agilidade', 'ágil', 'manejável', 'manobra'],
  spin: ['spin', 'efeito'],
  stability: ['estabilidade', 'estável', 'firmeza'],
  forgiveness: ['perdão', 'perdoa', 'forgiveness', 'tolerância', 'sweet spot', 'erro de timing', 'perdoar'],
}
const SUPER = /\b(máxim[ao]s?|brutal|brutais|absolut[ao]s?|extrem[ao]s?|excepcional|impressionante|altíssim[ao]s?|de ponta|insuperável|supremo)\b/
const ALTO = /\b(alt[ao]s?|elevad[ao]s?|acentuad[ao]s?|expressiv[ao]s?|excelente|forte|fortes|muito|grande|enorme|total|garantid[ao])\b/
const BOM = /\b(bom|boa|bons|boas|sólid[ao]s?|consistente|confiável|adequad[ao]|presente)\b/
const BAIXO = /\b(baix[ao]s?|pouc[ao]s?|mínim[ao]s?|fraco|fraca|menor)\b/
// Cláusula hipotética/negada: o texto fala do que a raquete NÃO é, ou de quem procura algo; não afirma a nota.
const CLAUSULA_NEGADA = /\b(sem|não|nem|em vez|ao invés|quem\s+(?:busca|prioriza|procura|quer|precisa|valoriza)|talvez|falta de|exceto|se você)\b/
const NEGA = /\b(sem|não|nem|nunca)\s+(\w+\s+){0,2}$/

const norm = (s: string) => s.toLowerCase()

interface Achado { notas?: string; slug: string; campo: string; tipo: string; sev: number; msg: string; trecho: string }

function clausulas(t: string): { txt: string; off: number }[] {
  const out: { txt: string; off: number }[] = []
  const re = /[^.;!?—:]+|(?:[.;!?—:])/g
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) if (!/^[.;!?—:]$/.test(m[0]) && m[0].trim()) out.push({ txt: m[0], off: m.index })
  // quebra extra em conectores adversativos
  const fin: { txt: string; off: number }[] = []
  for (const c of out) {
    const parts = c.txt.split(/\b(?:mas|enquanto|porém|embora|já que)\b/)
    let off = c.off
    for (const p of parts) { if (p.trim()) fin.push({ txt: p, off }); off += p.length + 4 }
  }
  return fin
}

function termos(c: string): { dim: Dim; pos: number; len: number }[] {
  const low = norm(c)
  const res: { dim: Dim; pos: number; len: number }[] = []
  for (const d of Object.keys(ALIAS) as Dim[]) {
    for (const a of ALIAS[d]) {
      let i = low.indexOf(a)
      while (i >= 0) {
        const antes = low[i - 1]
        if (!antes || !/[a-zà-ú]/.test(antes)) res.push({ dim: d, pos: i, len: a.length })
        i = low.indexOf(a, i + a.length)
      }
    }
  }
  // remove sobreposições (ex.: "precisão de direcionamento" vs "precisão")
  res.sort((x, y) => x.pos - y.pos || y.len - x.len)
  const clean: typeof res = []
  for (const r of res) if (!clean.some(k => r.pos < k.pos + k.len && r.pos + r.len > k.pos)) clean.push(r)
  return clean
}

export function analisar(slug: string, ins: Record<string, any>, nivel?: { piso: string }): Achado[] {
  const out: Achado[] = []
  const val = (d: Dim) => ins[d] as number
  const dims = Object.keys(LABEL) as Dim[]
  const ordenadas = [...dims].sort((a, b) => val(b) - val(a))
  const max = val(ordenadas[0])
  const top = dims.filter(d => val(d) === max)
  const top2 = dims.filter(d => val(d) >= val(ordenadas[1]))
  const mencoes: Record<string, Partial<Record<Dim, number>>> = { summary: {}, perfil_resumo: {} } // -1 baixo, 0 neutro, 1 alto

  for (const campo of ['perfil_resumo', 'summary'] as const) {
    const t: string = ins[campo] || ''
    for (const cl of clausulas(t)) {
      const low = norm(cl.txt)
      const ts = termos(cl.txt)
      if (!ts.length) continue
      const negadaCl = (pos: number) => CLAUSULA_NEGADA.test(low.slice(0, pos))
      // procura cada adjetivo e atribui ao termo mais próximo (e ao seguinte se coordenado por "e")
      const regs: [string, RegExp, number][] = [['SUPER', SUPER, 3], ['ALTO', ALTO, 2], ['BOM', BOM, 1], ['BAIXO', BAIXO, 2]]
      for (const [tipo, re, sev] of regs) {
        const g = new RegExp(re.source, 'g')
        let m: RegExpExecArray | null
        while ((m = g.exec(low))) {
          // termo mais próximo (distância em caracteres, no máx. 28)
          let melhor: { dim: Dim; pos: number; len: number } | null = null, dist = 999
          for (const k of ts) {
            const d = m.index >= k.pos + k.len ? m.index - (k.pos + k.len) : k.pos - (m.index + m[0].length)
            if (d < dist) { dist = d; melhor = k }
          }
          if (!melhor || dist > 18) continue
          if (/^\s*(equilíbrio|relação|combinação|mistura|dosagem)/.test(low.slice(m.index + m[0].length))) continue
          if (negadaCl(m.index)) continue
          const alvos: Dim[] = [melhor.dim]
          // coordenação: "baixo forgiveness e conforto"
          const idx = ts.indexOf(melhor)
          const prox = ts[idx + 1]
          if (prox && m.index < melhor.pos) {
            const entre = low.slice(melhor.pos + melhor.len, prox.pos)
            if (/^\s*(e|,)\s*$/.test(entre)) alvos.push(prox.dim)
          }
          const antes = low.slice(Math.max(0, m.index - 14), m.index)
          const negado = NEGA.test(antes)
          // "menos"/"pouco" antes de substantivo negativo (ex.: "menos vibração") = conforto alto: ignorar vibração
          for (const dim of alvos) {
            if (tipo === 'BAIXO' && /vibra/.test(low.slice(m.index, m.index + 24))) continue
            const v = val(dim)
            let sinal = tipo === 'BAIXO' ? -1 : 1
            if (negado) sinal = -sinal
            const trecho = cl.txt.trim().slice(0, 140)
            if (campo) { const cur = mencoes[campo][dim]; if (cur === undefined || Math.abs(sinal) >= Math.abs(cur)) mencoes[campo][dim] = sinal }
            if (sinal === 1) {
              // Severidade: 3 = nota <= 5 (claramente falso); 2 = nota 6-7 e a dimensão NÃO é o ponto forte;
              // 1 = superlativo em cima do próprio ponto forte da raquete (exagero de marketing, mas direcional).
              const ehTop = top.includes(dim)
              const sevFraco = (lim3: number) => (v <= lim3 ? 3 : ehTop ? 1 : 2)
              if (tipo === 'SUPER' && v <= 7) out.push({ slug, campo, tipo, sev: sevFraco(5), msg: `"${m[0]}" em ${LABEL[dim]}, nota real ${v}${ehTop ? ' (é o ponto forte)' : ''}`, trecho })
              else if (tipo === 'ALTO' && v <= 6) out.push({ slug, campo, tipo, sev: sevFraco(4), msg: `"${m[0]}" em ${LABEL[dim]}, nota real ${v}${ehTop ? ' (é o ponto forte)' : ''}`, trecho })
              else if (tipo === 'BOM' && v <= 4) out.push({ slug, campo, tipo, sev: 2, msg: `"${m[0]}" em ${LABEL[dim]}, nota real ${v}`, trecho })
            } else if (sinal === -1 && v >= 7 && (tipo === 'BAIXO' || negado)) {
              out.push({ slug, campo, tipo: 'BAIXO', sev: v >= 8 ? 3 : 2, msg: `afirma ${LABEL[dim]} baixo ("${m[0]}"), nota real ${v}`, trecho })
            }
          }
        }
      }
      // identidade: "raquete de controle", "foco em potência", "voltada ao conforto"
      for (const mm of low.matchAll(/(?:raquete|foco|perfil|aposta|voltad[ao]|pensad[ao])\s+(?:de|em|para|ao|à|no|na)\s+(?:um\s+|uma\s+)?(\w+)(?:\s+e\s+(\w+))?/g)) {
        const palavras = [mm[1], mm[2]].filter(Boolean) as string[]
        for (const p of palavras) {
          for (const d of dims) {
            if (ALIAS[d].some(a => a === p || (a.startsWith(p) && p.length >= 5)) && !top2.includes(d)) {
              out.push({ slug, campo, tipo: 'IDENT', sev: val(d) <= 5 ? 3 : 2, msg: `se apresenta como foco em ${LABEL[d]} (nota ${val(d)}), mas o topo é ${top.map(x => `${LABEL[x]} ${max}`).join('/')}`, trecho: cl.txt.trim().slice(0, 140) })
            }
          }
        }
      }
      // números explícitos: "controle 10", "controle (10)", "controle de 8"
      for (const k of ts) {
        const resto = low.slice(k.pos + k.len, k.pos + k.len + 34)
        const nm = resto.match(/^\s*(?:de\s+|em\s+)?\(?(\d{1,2})\)?(?!\d|g|mm|k\b|\s*k)/) || resto.match(/^[^()]{0,28}\((\d{1,2})\)/)
        if (nm && Number(nm[1]) <= 10 && Number(nm[1]) !== val(k.dim)) {
          out.push({ slug, campo, tipo: 'NUM', sev: 3, msg: `texto diz ${LABEL[k.dim]} ${nm[1]}, nota real ${val(k.dim)}`, trecho: cl.txt.trim().slice(0, 140) })
        }
      }
    }
  }

  // OMITE: perfil_resumo não cita nenhuma dimensão forte (>= 8)
  const fortes = dims.filter(d => val(d) >= 8)
  if (fortes.length) {
    const perfil = norm(ins.perfil_resumo || '')
    const citaForte = fortes.some(d => ALIAS[d].some(a => perfil.includes(a)))
    const resumo = norm(ins.summary || '')
    const citaNoResumo = fortes.some(d => ALIAS[d].some(a => resumo.includes(a)))
    if (!citaForte) out.push({ slug, campo: 'perfil_resumo', tipo: 'OMITE', sev: citaNoResumo ? 1 : 2, msg: `não cita o ponto forte (${fortes.map(d => `${LABEL[d]} ${val(d)}`).join(', ')})${citaNoResumo ? ' (o summary cita)' : ' (nem o summary)'}`, trecho: (ins.perfil_resumo || '').slice(0, 140) })
  }

  // CONTRA: mesma dimensão alta num texto e baixa no outro
  for (const d of dims) {
    const a = mencoes.perfil_resumo[d], b = mencoes.summary[d]
    if (a !== undefined && b !== undefined && a !== b && a * b === -1)
      out.push({ slug, campo: 'summary', tipo: 'CONTRA', sev: 3, msg: `summary e perfil_resumo divergem em ${LABEL[d]} (${a > 0 ? 'perfil alto' : 'perfil baixo'}, ${b > 0 ? 'summary alto' : 'summary baixo'}); nota real ${val(d)}`, trecho: '' })
  }

  // NIVEL inverso: texto "para avançados / exige técnica" em raquete que serve desde o iniciante
  if (nivel && nivel.piso === 'iniciante') {
    for (const campo of ['perfil_resumo', 'summary'] as const) {
      const t = norm(ins[campo] || '')
      const m = t.match(/(?:para|pra|de|indicad[ao]\s+para)\s+(?:jogadores\s+)?(avançad\w+|experientes|quem domina a técnica)/)
      if (m && !/não\s+(?:é\s+)?(?:só\s+)?para/.test(t)) out.push({ slug, campo, tipo: 'NIVEL', sev: 2, msg: `texto restringe a "${m[1]}" mas o motor a classifica como iniciante (serve desde o início)`, trecho: m[0] })
    }
  }
  const notas = dims.map(d => `${LABEL[d]} ${val(d)}`).join(' · ')
  for (const a of out) a.notas = notas
  return out
}

async function main() {
  const env: Record<string, string> = {}
  for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY }
  const args = process.argv.slice(2)
  const only = args.find(a => !a.startsWith('--'))
  const jsonOut = args.find(a => a.startsWith('--json='))?.slice(7)
  const min = Number(args.find(a => a.startsWith('--min='))?.slice(6) ?? 2)

  const { derivarNivel } = await import('../lib/nivel')
  let all: any[] = []
  for (let o = 0; ; o += 1000) {
    const r = await (await fetch(`${env.SUPABASE_URL}/rest/v1/rackets?select=*,racket_insights(*)&publicada=eq.true&order=id&offset=${o}&limit=1000`, { headers: H })).json()
    all = all.concat(r)
    if (r.length < 1000) break
  }
  const achados: Achado[] = []
  for (const r of all) {
    if (only && r.slug !== only) continue
    const ins = r.racket_insights
    if (!ins || (Object.keys(LABEL) as Dim[]).some(d => ins[d] == null)) continue
    const piso = derivarNivel(r)
    achados.push(...analisar(r.slug, ins, piso ? { piso } : undefined))
  }
  // desduplica (mesmo slug/campo/tipo/msg)
  const seen = new Set<string>()
  const uniq = achados.filter(a => { const k = `${a.slug}|${a.campo}|${a.tipo}|${a.msg}`; if (seen.has(k)) return false; seen.add(k); return true })
  const rel = uniq.filter(a => a.sev >= min)
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(uniq, null, 1))
  const porTipo: Record<string, number> = {}
  for (const a of rel) porTipo[a.tipo] = (porTipo[a.tipo] || 0) + 1
  for (const a of rel.sort((x, y) => y.sev - x.sev || x.slug.localeCompare(y.slug)))
    console.log(`[${a.sev}] ${a.slug} (${a.campo}) ${a.tipo}: ${a.msg}${a.trecho ? `\n      « ${a.trecho} »` : ''}`)
  console.log(`\n${rel.length} alerta(s) em ${new Set(rel.map(a => a.slug)).size} raquete(s) com severidade >= ${min}`, porTipo)
  process.exit(rel.length ? 1 : 0)
}
if (process.argv[1] && /check-textos-notas/.test(process.argv[1])) main()
