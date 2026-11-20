import { timingSafeEqual } from 'node:crypto'

// Auth das rotas /api/admin/*affiliate* chamadas pela tarefa agendada do painel de afiliados do ML:
// Authorization: Bearer <AFFILIATE_NOTIFY_SECRET>; se essa env não existir, usa CRON_SECRET (mesmo padrão
// dos crons). Sem nenhuma das duas configurada, recusa tudo.
export function autorizadoAfiliado(req: Request): boolean {
  const secret = process.env.AFFILIATE_NOTIFY_SECRET || process.env.CRON_SECRET
  if (!secret) return false
  const got = Buffer.from(req.headers.get('authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}
