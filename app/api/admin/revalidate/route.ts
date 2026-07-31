'use server'

import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/revalidate
 * Força revalidação de rotas Next.js após writes diretos ao banco (fora de server actions).
 * Uso em scripts de correção em massa — chamar ao final após UPDATE em racket_insights/rackets.
 *
 * Auth: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 * Body: { paths: string[] }  — rotas absolutas ex: ["/raquetes/pichau-nocturne-bay-3k"]
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

  const { paths } = body as { paths?: unknown }
  if (!Array.isArray(paths) || paths.length === 0 || paths.some(p => typeof p !== 'string')) {
    return NextResponse.json({ error: 'paths deve ser array de strings não vazio' }, { status: 400 })
  }

  for (const path of paths as string[]) {
    revalidatePath(path)
  }

  return NextResponse.json({ ok: true, revalidated: paths, count: paths.length })
}
