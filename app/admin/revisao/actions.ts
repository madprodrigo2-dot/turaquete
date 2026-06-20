'use server'

import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const session = await auth()
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized')
  }
}

export async function salvarRevisao(
  racketId: number,
  status: 'pendente' | 'ok' | 'flagged',
  note: string
) {
  await assertAdmin()
  await getSupabaseAdmin()
    .from('racket_insights')
    .update({
      review_status: status,
      review_note: note || null,
      reviewed_at: status !== 'pendente' ? new Date().toISOString() : null,
    })
    .eq('racket_id', racketId)
  revalidatePath('/admin/revisao')
}
