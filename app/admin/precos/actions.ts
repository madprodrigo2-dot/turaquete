'use server'

import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function setFaraLinha(id: number, value: boolean): Promise<void> {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized')
  }
  const sb = getSupabaseAdmin()
  const { error } = await sb.from('rackets')
    .update({ fora_de_linha: value })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
