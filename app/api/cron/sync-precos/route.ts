import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/telegram'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300 // 5 min — Vercel Pro limit

const GECKO_URL       = 'https://api.geckoapi.com.br/v1/extract'
const DELAY_MS        = 1200
const RETRY_DELAYS_MS = [2000, 4000, 6000] // só para 429
const CHUNK_SIZE      = 25

function stripParams(url: string): string {
  try { const u = new URL(url); return u.origin + u.pathname } catch { return url }
}

function isSpecificMlUrl(url: string | null): boolean {
  if (!url) return false
  return (
    url.includes('/up/MLBU') ||
    url.includes('/p/MLB')   ||
    url.includes('produto.mercadolivre.com.br/MLB')
  )
}

function extractPrice(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b.price === 'number' && b.price > 0) return b.price
  if (b.data && typeof b.data === 'object') {
    const d = b.data as Record<string, unknown>
    if (typeof d.price === 'number' && d.price > 0) return d.price
  }
  return null
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchGecko(
  cleanUrl: string,
  geckoKey: string,
): Promise<{ ok: boolean; status: number; body: unknown; retries: number; credits: number }> {
  let retries = 0
  for (let attempt = 0; attempt < 1 + RETRY_DELAYS_MS.length; attempt++) {
    const res = await fetch(GECKO_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${geckoKey}` },
      body:    JSON.stringify({ target: 'mercadolivre.com.br', type: 'pdp', url: cleanUrl }),
    })
    if (res.status !== 429) {
      const body = res.ok ? await res.json().catch(() => null) : null
      return { ok: res.ok, status: res.status, body, retries, credits: retries + 1 }
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await delay(RETRY_DELAYS_MS[attempt])
      retries++
    }
  }
  return { ok: false, status: 429, body: null, retries, credits: retries + 1 }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dry          = req.nextUrl.searchParams.get('dry') === 'true'
  const single       = req.nextUrl.searchParams.get('single') === 'true' // processa chunk, não encadeia
  const chunkSize    = Math.max(1, parseInt(req.nextUrl.searchParams.get('chunk') ?? String(CHUNK_SIZE), 10) || CHUNK_SIZE)
  const runStartedAt = req.nextUrl.searchParams.get('run_started_at') ?? new Date().toISOString()

  const geckoKey = process.env.GECKOAPI_KEY
  if (!geckoKey) return NextResponse.json({ error: 'GECKOAPI_KEY não configurada' }, { status: 500 })

  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Busca candidatas ordenadas por desatualização (mais velhas primeiro, NULL first).
  // Filtragem por URL específica e exclusão das já processadas nesta rodada (price_updated_at >= runStartedAt)
  // são feitas no cliente — dataset pequeno (~266 linhas), sem risco de performance.
  const { data: all, error: fetchErr } = await sb
    .from('rackets')
    .select('id, name, price, price_updated_at, affiliate_url')
    .eq('publicada', true)
    .not('is_active', 'eq', false)
    .not('affiliate_url', 'is', null)
    .order('price_updated_at', { ascending: true, nullsFirst: true })

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const items = (all ?? [])
    .filter(r =>
      isSpecificMlUrl(r.affiliate_url) &&
      (r.price_updated_at === null || r.price_updated_at < runStartedAt)
    )
    .slice(0, chunkSize)

  const results: {
    id: number; name: string; priceBefore: number | null; priceAfter: number | null
    status: string; retries: number
  }[] = []

  let updated      = 0
  let failed       = 0
  let noPrice      = 0
  let priceChanged = 0
  let creditsTotal = 0
  const failedNames: string[] = []

  try {
    for (let i = 0; i < items.length; i++) {
      const racket       = items[i]
      const cleanUrl     = stripParams(racket.affiliate_url!)
      let priceAfter: number | null = null
      let itemStatus     = 'ok'
      let itemRetries    = 0

      try {
        const { ok, status, body, retries, credits } = await fetchGecko(cleanUrl, geckoKey)
        itemRetries   = retries
        creditsTotal += credits

        if (!ok) {
          itemStatus = status === 429 ? `gecko_429_after_${retries}_retries` : `gecko_${status}`
          failed++
          failedNames.push(racket.name)
        } else {
          priceAfter = extractPrice(body)
          if (priceAfter === null) {
            // no_price: NÃO tocar price_updated_at — mantém a raquete no topo da fila de prioridade
            itemStatus = 'no_price'
            noPrice++
          } else {
            if (priceAfter !== racket.price) priceChanged++
            if (!dry) {
              const { error: upsertErr } = await sb
                .from('rackets')
                .update({
                  price_previous:   racket.price,
                  price:            priceAfter,
                  price_updated_at: new Date().toISOString(),
                  price_source:     'geckoapi',
                })
                .eq('id', racket.id)
              if (upsertErr) {
                itemStatus = `db_err: ${upsertErr.message}`
                failed++
                failedNames.push(racket.name)
              } else {
                updated++
              }
            } else {
              updated++
            }
          }
        }
      } catch (e) {
        itemStatus = `exception: ${e instanceof Error ? e.message : String(e)}`
        failed++
        failedNames.push(racket.name)
        creditsTotal++
      }

      results.push({
        id:          racket.id,
        name:        racket.name,
        priceBefore: racket.price,
        priceAfter,
        status:      itemStatus,
        retries:     itemRetries,
      })

      if (i < items.length - 1) await delay(DELAY_MS)
    }
  } catch (e) {
    // Falha em nível de chunk: alerta Telegram fire-and-forget ANTES do re-throw
    const stoppedAt = items[results.length]?.name ?? '?'
    sendTelegram([
      '⛔ <b>Sync INTERROMPIDO</b>',
      '',
      `Parou em: <b>${stoppedAt}</b> (item ${results.length + 1} de ${items.length} nesta chunk)`,
      `Motivo: ${e instanceof Error ? e.message : String(e)}`,
      `run_started_at: ${runStartedAt}`,
      '',
      'Próxima segunda retoma automaticamente das mais desatualizadas.',
    ].join('\n')).catch(() => {})
    throw e
  }

  // Última chunk = devolveu menos itens do que o tamanho do chunk
  const isLastChunk = items.length < chunkSize

  const siteUrl     = process.env.SITE_URL ?? ''
  const nextChunkUrl = siteUrl
    ? `${siteUrl}/api/cron/sync-precos?chunk=${chunkSize}&run_started_at=${encodeURIComponent(runStartedAt)}`
    : null

  if (!dry) {
    if (!isLastChunk) {
      if (single) {
        // single=true: não encadeia — apenas reporta o que teria disparado
      } else {
        // after() mantém a função viva até o request para chunk 2 ser despachado;
        // sem after(), o Vercel encerra o processo antes do TCP ser estabelecido.
        if (nextChunkUrl) {
          const url    = nextChunkUrl
          const secret = process.env.CRON_SECRET
          after(() => {
            const ac = new AbortController()
            const t  = setTimeout(() => ac.abort(), 5000) // aborta só nossa espera; chunk 2 já recebeu
            return fetch(url, {
              signal:  ac.signal,
              headers: { Authorization: `Bearer ${secret}` },
            }).catch(() => {}).finally(() => clearTimeout(t))
          })
        }
      }
    } else {
      // Última chunk: resumo consolidado via query no banco + Telegram
      const { data: statsRows } = await sb
        .from('rackets')
        .select('price, price_previous')
        .eq('price_source', 'geckoapi')
        .gte('price_updated_at', runStartedAt)

      const totalUpdated = statsRows?.length ?? 0
      // Conta mudanças só onde price_previous era conhecido (não NULL)
      const totalChanged = (statsRows ?? []).filter(
        r => r.price_previous !== null && r.price !== r.price_previous
      ).length

      const totalDurSec = Math.round((Date.now() - new Date(runStartedAt).getTime()) / 1000)
      const durLabel    = totalDurSec >= 60
        ? `${Math.floor(totalDurSec / 60)}m ${totalDurSec % 60}s`
        : `${totalDurSec}s`
      const dateLabel = new Date().toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
      })

      const failRate = items.length > 0 ? failed / items.length : 0
      const isAlert  = failRate > 0.15
      const icon     = isAlert ? '⚠️' : '✅'

      const lines = [
        `${icon} <b>Sync de Preços — ${dateLabel}</b>`,
        '',
        `📦 ${totalUpdated} atualizadas`,
        `🔄 ${totalChanged} mudaram de preço`,
      ]

      if (failed > 0) {
        lines.push(
          `❌ ${failed} falha${failed !== 1 ? 's' : ''} nesta chunk${isAlert ? ` — ${(failRate * 100).toFixed(1)}%` : ''}`
        )
        if (isAlert && failedNames.length > 0) {
          const shown = failedNames.slice(0, 5)
          const extra = failedNames.length - shown.length
          lines.push(`  → ${shown.join(', ')}${extra > 0 ? ` e mais ${extra}` : ''}`)
        }
      }

      lines.push(`⏱ ${durLabel}`)

      sendTelegram(lines.join('\n')).catch(() => {})
    }
  }

  return NextResponse.json({
    dry,
    single,
    chunk:        items.length,
    isLastChunk,
    wouldChain:   !isLastChunk && !dry,
    nextChunkUrl: !isLastChunk ? nextChunkUrl : null,
    runStartedAt,
    updated,
    failed,
    noPrice,
    priceChanged,
    creditsUsed:  creditsTotal,
    results,
  })
}
