'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/revalidate
 * Força revalidação de rotas Next.js após writes diretos ao banco (fora de server actions).
 * Uso em scripts de correção em massa — chamar ao final após UPDATE em racket_insights/rackets.
 * Atalho: npx tsx scripts/revalidate.ts (ver o próprio script).
 *
 * Auth: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 * Body: { paths?: string[], tags?: string[] }
 *   paths: rotas absolutas ex: ["/raquetes/pichau-nocturne-bay-3k"]  (limpa o cache da página, ISR)
 *   tags:  ex: ["catalogo"]  (limpa o cache compartilhado do catálogo, unstable_cache de 1h, que
 *          alimenta listagens, comparador e Top Picks)
 * Pelo menos um dos dois é obrigatório.
 *
 * Nada aqui depende do plano Pro da Vercel (revalidação sob demanda funciona igual no Hobby).
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { paths = [], tags = [] } = body as { paths?: unknown; tags?: unknown }
  const okList = (v: unknown): v is string[] => Array.isArray(v) && v.every(p => typeof p === 'string')
  if (!okList(paths) || !okList(tags) || paths.length + tags.length === 0) {
    return NextResponse.json({ error: 'informe paths e/ou tags (arrays de strings, ao menos um item)' }, { status: 400 })
  }

  for (const tag of tags) revalidateTag(tag)
  for (const path of paths) revalidatePath(path)

  return NextResponse.json({ ok: true, revalidated: paths, tags, count: paths.length })
}
