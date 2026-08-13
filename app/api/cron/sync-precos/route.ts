import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/telegram'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300 // 5 min — Vercel Pro limit

const GECKO_URL       = 'https://api.geckoapi.com.br/v1/extract'
const DELAY_MS        = 1200
const RETRY_DELAYS_MS = [2000, 4000, 6000] // só para 429
const CHUNK_SIZE      = 25
const BUDGET_MS       = 230_000 // corte explícito a 230s — 70s de margem antes do kill de 300s do Vercel
const SIX_DAYS_MS     = 6 * 24 * 60 * 60 * 1000 // janela de elegibilidade

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
    const ac = new AbortController()
    const t  = setTimeout(() => ac.abort(), 15_000) // 15s por tentativa — aborta hang sem retry
    let res: Response
    try {
      res = await fetch(GECKO_URL, {
        signal:  ac.signal,
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${geckoKey}` },
        body:    JSON.stringify({ target: 'mercadolivre.com.br', type: 'pdp', url: cleanUrl }),
      })
      clearTimeout(t)
    } catch (e) {
      clearTimeout(t)
      if (e instanceof Error && e.name === 'AbortError') {
        // Timeout: falha explícita sem retry
        return { ok: false, status: 408, body: null, retries, credits: retries + 1 }
      }
      throw e // outros erros de rede propagam para o handler externo
    }
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

  const dry       = req.nextUrl.searchParams.get('dry') === 'true'
  const chunkSize = Math.max(1, parseInt(req.nextUrl.searchParams.get('chunk') ?? String(CHUNK_SIZE), 10) || CHUNK_SIZE)

  const geckoKey = process.env.GECKOAPI_KEY
  if (!geckoKey) return NextResponse.json({ error: 'GECKOAPI_KEY não configurada' }, { status: 500 })

  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Lê estado atual do run (run_started_at persiste entre chunks via Supabase)
  const { data: stateRows } = await sb.from('sync_state').select('key, value')
  const syncState = Object.fromEntries((stateRows ?? []).map(r => [r.key, r.value ?? null]))
  let storedRunStartedAt = syncState['run_started_at'] as string | null

  // Se run_started_at tiver mais de 7 dias, é um run abandonado — descarta e começa novo
  if (!dry && storedRunStartedAt) {
    const storedAge = Date.now() - new Date(storedRunStartedAt).getTime()
    if (storedAge > 7 * 24 * 60 * 60 * 1000) {
      console.log('[sync] run_started_at obsoleto — descartando e iniciando novo run')
      storedRunStartedAt = null
      await sb.from('sync_state').update({ value: null, updated_at: new Date().toISOString() }).eq('key', 'run_started_at')
    }
  }

  const sixDaysAgo = new Date(Date.now() - SIX_DAYS_MS).toISOString()

  // Busca candidatas ordenadas por desatualização de preço (mais velhas primeiro, NULL first).
  // Filtragem por URL específica e janela de elegibilidade são feitas no cliente
  // — dataset pequeno (~266 linhas), sem risco de performance.
  const { data: all, error: fetchErr } = await sb
    .from('rackets')
    .select('id, name, price, price_updated_at, affiliate_url, last_sync_at')
    .eq('publicada', true)
    .not('is_active', 'eq', false)
    .not('affiliate_url', 'is', null)
    .order('price_updated_at', { ascending: true, nullsFirst: true })

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const items = (all ?? [])
    .filter(r =>
      isSpecificMlUrl(r.affiliate_url) &&
      (r.price_updated_at === null || r.price_updated_at < sixDaysAgo) &&
      (r.last_sync_at    === null || r.last_sync_at    < sixDaysAgo)
    )
    .slice(0, chunkSize)

  // Fila vazia — fim de run ou período silencioso
  if (items.length === 0) {
    if (!dry && storedRunStartedAt) {
      // Fim de run: coleta stats e envia Telegram consolidado
      console.log('[sync] fila vazia — enviando Telegram consolidado, runStartedAt:', storedRunStartedAt)

      let statsRows: { price: number | null; price_previous: number | null }[] | null = null
      let failedRows: { name: string; last_sync_status: string | null }[] | null = null
      try {
        const [statsRes, failedRes] = await Promise.all([
          sb.from('rackets')
            .select('price, price_previous')
            .eq('price_source', 'geckoapi')
            .gte('price_updated_at', storedRunStartedAt),
          sb.from('rackets')
            .select('name, last_sync_status')
            .gte('last_sync_at', storedRunStartedAt)
            .not('last_sync_status', 'is', null)
            .neq('last_sync_status', 'ok')
            .neq('last_sync_status', 'no_price'),
        ])
        statsRows  = statsRes.data
        failedRows = failedRes.data
      } catch (statsErr) {
        console.error('[sync] query consolidada falhou:', statsErr instanceof Error ? statsErr.message : String(statsErr))
      }

      const totalUpdated = statsRows?.length ?? 0
      const totalChanged = (statsRows ?? []).filter(
        r => r.price_previous !== null && r.price !== r.price_previous
      ).length
      const totalFailed = failedRows?.length ?? 0

      const totalDurSec = Math.round((Date.now() - new Date(storedRunStartedAt).getTime()) / 1000)
      const durLabel    = totalDurSec >= 60
        ? `${Math.floor(totalDurSec / 60)}m ${totalDurSec % 60}s`
        : `${totalDurSec}s`
      const dateLabel = new Date().toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
      })

      const failRate = totalFailed / Math.max(totalUpdated + totalFailed, 1)
      const isAlert  = totalFailed > 0 && failRate > 0.15
      const icon     = isAlert ? '⚠️' : '✅'

      const lines = [
        `${icon} <b>Sync de Preços — ${dateLabel}</b>`,
        '',
        `📦 ${totalUpdated} atualizadas`,
        `🔄 ${totalChanged} mudaram de preço`,
      ]
      if (totalFailed > 0) {
        lines.push(
          `❌ ${totalFailed} falha${totalFailed !== 1 ? 's' : ''}${isAlert ? ` — ${(failRate * 100).toFixed(1)}%` : ''}`
        )
        if (isAlert && failedRows && failedRows.length > 0) {
          const shown = failedRows.slice(0, 5).map(r => r.name)
          const extra = failedRows.length - shown.length
          lines.push(`  → ${shown.join(', ')}${extra > 0 ? ` e mais ${extra}` : ''}`)
        }
      }
      lines.push(`⏱ ${durLabel}`)

      console.log('[sync] chamando sendTelegram consolidado')
      await sendTelegram(lines.join('\n')).catch((e: unknown) => {
        console.error('[sync] telegram falhou:', e instanceof Error ? e.message : String(e))
      })

      // Reseta sync_state
      await sb.from('sync_state').update({ value: null,                       updated_at: new Date().toISOString() }).eq('key', 'run_started_at')
      await sb.from('sync_state').update({ value: new Date().toISOString(),   updated_at: new Date().toISOString() }).eq('key', 'telegram_sent_at')
    }
    // Se !storedRunStartedAt: período silencioso entre runs, nada a fazer
    return NextResponse.json({ dry, chunk: 0, processed: 0, runStartedAt: storedRunStartedAt })
  }

  // Há itens — inicia ou continua run
  if (!dry && !storedRunStartedAt) {
    storedRunStartedAt = new Date().toISOString()
    await sb.from('sync_state').update({ value: storedRunStartedAt, updated_at: new Date().toISOString() }).eq('key', 'run_started_at')
  }
  const runStartedAt = storedRunStartedAt ?? new Date().toISOString()

  // Claim pessimista: marca os 25 de uma vez ANTES do loop para fechar a janela de overlap
  // entre invocações concorrentes do cron. O update final por item sobrescreve com o status real.
  if (!dry) {
    await sb.from('rackets')
      .update({ last_sync_at: new Date().toISOString() })
      .in('id', items.map(r => r.id))
  }

  const results: {
    id: number; name: string; priceBefore: number | null; priceAfter: number | null
    status: string; retries: number
  }[] = []

  let updated         = 0
  let failed          = 0
  let noPrice         = 0
  let priceChanged    = 0
  let creditsTotal    = 0
  let budgetExhausted = false
  const failedNames: string[] = []
  const startTime = Date.now()

  try {
    for (let i = 0; i < items.length; i++) {
      // Sai antes de começar a próxima raquete se o orçamento de tempo acabou.
      if (Date.now() - startTime > BUDGET_MS) { budgetExhausted = true; break }

      const racket   = items[i]
      const cleanUrl = stripParams(racket.affiliate_url!)

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
            // no_price: NÃO toca price_updated_at — mantém raquete prioritária na próxima janela de elegibilidade
            itemStatus = 'no_price'
            noPrice++
          } else {
            if (priceAfter !== racket.price) priceChanged++
            if (!dry) {
              const syncNow = new Date().toISOString()
              const { error: upsertErr } = await sb
                .from('rackets')
                .update({
                  price_previous:   racket.price,
                  price:            priceAfter,
                  price_updated_at: syncNow,
                  price_source:     'geckoapi',
                  last_sync_status: 'ok',
                  last_sync_at:     syncNow,
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

      if (!dry && itemStatus !== 'ok') {
        const syncStatus = itemStatus === 'no_price'        ? 'no_price'
          : itemStatus.startsWith('gecko_429')              ? 'error_429'
          : itemStatus === 'gecko_408'                      ? 'timeout'
          : 'error'
        try {
          await sb.from('rackets')
            .update({ last_sync_status: syncStatus, last_sync_at: new Date().toISOString() })
            .eq('id', racket.id)
        } catch { /* status write failure não afeta o fluxo principal */ }
      }

      if (i < items.length - 1) await delay(DELAY_MS)
    }
  } catch (e) {
    // Falha em nível de chunk: alerta Telegram fire-and-forget ANTES do re-throw
    const stoppedAt = items[results.length]?.name ?? '?'
    await sendTelegram([
      '⛔ <b>Sync INTERROMPIDO</b>',
      '',
      `Parou em: <b>${stoppedAt}</b> (item ${results.length + 1} de ${items.length} nesta chunk)`,
      `Motivo: ${e instanceof Error ? e.message : String(e)}`,
      '',
      'Próxima segunda retoma automaticamente das mais desatualizadas.',
    ].join('\n')).catch((err: unknown) => {
      console.error('[sync] telegram falhou (interrupt):', err instanceof Error ? err.message : String(err))
    })
    throw e
  }

  console.log('[sync] chunk completo:', { budgetExhausted, chunkSize, processed: results.length, updated, failed, noPrice })

  return NextResponse.json({
    dry,
    chunk:           items.length,
    processed:       results.length,
    budgetExhausted,
    runStartedAt,
    updated,
    failed,
    noPrice,
    priceChanged,
    creditsUsed:     creditsTotal,
    results,
  })
}
