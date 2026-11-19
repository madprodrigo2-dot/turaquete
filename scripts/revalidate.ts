// Força a atualização de páginas em produção depois de editar dados direto no banco.
// (ISR de 1h + cache compartilhado do catálogo: sem isto a ficha antiga pode aparecer por até 1h.)
//
// Uso:
//   npx tsx scripts/revalidate.ts <slug> [<slug> ...]   fichas de raquetes específicas
//   npx tsx scripts/revalidate.ts --todas               todas as fichas publicadas + marcas + listagens
//   npx tsx scripts/revalidate.ts --marcas              todas as páginas /marcas/{slug}
//   npx tsx scripts/revalidate.ts --catalogo            só o cache compartilhado (listagens, Top Picks)
// Opções:
//   --url=https://...   base do site (padrão: https://www.turaquete.com.br)
//   --sem-tag           não limpa o cache compartilhado do catálogo (padrão: limpa sempre)
//
// Lê SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY de .env.local (a chave é o Bearer do endpoint
// /api/admin/revalidate; nunca é impressa). Imprime só contagens e status HTTP.
//
// Plano Vercel: nada aqui depende do Pro. Revalidação sob demanda e ISR funcionam igual no Hobby.
import fs from 'fs'

const env: Record<string, string> = {}
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const SB = env.SUPABASE_URL
if (!KEY || !SB) { console.error('Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local'); process.exit(2) }

const args = process.argv.slice(2)
const flag = (n: string) => args.includes(`--${n}`)
const base = (args.find(a => a.startsWith('--url='))?.slice(6) ?? 'https://www.turaquete.com.br').replace(/\/$/, '')
const slugs = args.filter(a => !a.startsWith('--'))

async function rest(q: string): Promise<any[]> {
  const r = await fetch(`${SB}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  if (!r.ok) throw new Error(`Supabase ${r.status}`)
  return r.json()
}

async function publicadas(): Promise<string[]> {
  let all: string[] = []
  for (let o = 0; ; o += 1000) {
    const r = await rest(`rackets?select=slug&publicada=eq.true&order=id&offset=${o}&limit=1000`)
    all = all.concat(r.map(x => x.slug))
    if (r.length < 1000) break
  }
  return all
}

async function marcas(): Promise<string[]> {
  const r = await rest('rackets?select=brands!inner(slug)&publicada=eq.true')
  return [...new Set(r.map((x: any) => (Array.isArray(x.brands) ? x.brands[0] : x.brands)?.slug).filter(Boolean))] as string[]
}

async function main() {
  const paths: string[] = []
  if (flag('todas')) {
    paths.push(...(await publicadas()).map(s => `/raquetes/${s}`))
    paths.push(...(await marcas()).map(s => `/marcas/${s}`))
    paths.push('/', '/raquetes/iniciante', '/raquetes/intermediario', '/raquetes/avancado', '/raquetes/conforto', '/comparar', '/busca')
  } else if (flag('marcas')) {
    paths.push(...(await marcas()).map(s => `/marcas/${s}`))
  }
  paths.push(...slugs.map(s => `/raquetes/${s}`))
  const soCatalogo = flag('catalogo')
  if (!paths.length && !soCatalogo) {
    console.error('Nada para revalidar. Passe slugs, --todas, --marcas ou --catalogo (ver cabeçalho do script).')
    process.exit(2)
  }

  const tags = flag('sem-tag') ? [] : ['catalogo']
  const lotes: string[][] = []
  for (let i = 0; i < paths.length; i += 40) lotes.push(paths.slice(i, i + 40))
  if (!lotes.length) lotes.push([])

  let falhas = 0
  for (const [i, lote] of lotes.entries()) {
    const r = await fetch(`${base}/api/admin/revalidate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: lote, tags: i === 0 ? tags : [] }),
    })
    if (!r.ok) falhas++
    console.log(`lote ${i + 1}/${lotes.length}: ${lote.length} caminho(s)${i === 0 && tags.length ? ' + tag catalogo' : ''} -> HTTP ${r.status}`)
  }
  console.log(falhas ? `${falhas} lote(s) falharam` : `OK: ${paths.length} caminho(s) revalidados em ${base}`)
  console.log('Obs.: após revalidar, a primeira visita pode ainda servir a versão antiga por instantes (propagação entre instâncias).')
  process.exit(falhas ? 1 : 0)
}
main()
