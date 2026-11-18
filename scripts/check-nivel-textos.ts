// Chequeo de coerência: textos editoriais (summary / perfil_resumo) vs nível recomendado do motor.
// Uso: npx tsx scripts/check-nivel-textos.ts [slug]   (sem slug = todas as publicadas)
// Sai com código 1 se achar contradição. Não escreve nada: só lê.
//
// Regra: se nivelRange() marca um nível como 'fora' (abaixo do piso derivado), o texto
// não pode recomendar a raquete para esse nível. Casos tratados:
//  - 'intermediário(s)' quando intermediário é 'fora' (raquete só avançado)
//  - 'iniciante(s)', 'começando', 'primeira raquete' quando iniciante é 'fora'
//  - 'quem está evoluindo' quando só avançado
// Ignora frases com negação ("não é para iniciante") e "saindo/saiu do iniciante".
// Limitação: não pega sinônimos fora da lista, nem o inverso (texto "avançado" para raquete fácil).
import fs from 'fs'
import { nivelRange } from '../lib/nivelRange'

const env: Record<string, string> = {}
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY }
const NEG = /(não|nem|menos|longe|evite|fora d|exceto|ao invés|em vez|do que|diferente|sem ser)/
const SAINDO = /(sa[ií]ndo|saiu|sai|sair|evolui|evoluiu)\s+d[oa]\s+(fase\s+|n[ií]vel\s+)?iniciante/i

async function main() {
  const only = process.argv[2]
  let all: any[] = []
  for (let o = 0; ; o += 1000) {
    const r = await (await fetch(
      `${env.SUPABASE_URL}/rest/v1/rackets?select=*,racket_insights(*)&publicada=eq.true&order=id&offset=${o}&limit=1000`,
      { headers: H })).json()
    all = all.concat(r)
    if (r.length < 1000) break
  }
  let problemas = 0
  for (const r of all) {
    if (only && r.slug !== only) continue
    const ins = r.racket_insights
    const nr = ins && nivelRange(r)
    if (!nr) continue
    const soAv = nr.fit.iniciante === 'fora' && nr.fit.intermediario === 'fora'
    const checks: [string, RegExp, boolean][] = [
      ['intermediário', /intermedi[aá]ri\w+/g, nr.fit.intermediario === 'fora'],
      ['iniciante', /iniciantes?|quem (está )?começ\w+|primeira raquete/g, nr.fit.iniciante === 'fora'],
      ['evoluindo', /quem está evoluindo|quem evolui/g, soAv],
    ]
    for (const campo of ['perfil_resumo', 'summary'] as const) {
      const t: string = ins[campo] || ''
      for (const [nome, re, fora] of checks) {
        if (!fora) continue
        for (const m of t.matchAll(re)) {
          const i = m.index!
          const ini = t.lastIndexOf('.', i) + 1
          const fim = t.indexOf('.', i) + 1 || t.length
          const frase = t.slice(ini, fim)
          if (NEG.test(frase.slice(0, i - ini).toLowerCase()) || SAINDO.test(frase)) continue
          problemas++
          console.log(`${r.slug} [${campo}] cita "${nome}" mas o motor diz fora (${nr.fit.iniciante}/${nr.fit.intermediario}/${nr.fit.avancado}):\n   ${frase.trim()}`)
        }
      }
    }
  }
  console.log(problemas === 0 ? 'OK: nenhum texto contradiz o nível recomendado.' : `${problemas} contradição(ões).`)
  process.exit(problemas ? 1 : 0)
}
main()
