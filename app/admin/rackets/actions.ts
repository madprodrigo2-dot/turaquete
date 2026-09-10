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

export async function togglePublicada(id: number, publicada: boolean) {
  await assertAdmin()
  await getSupabaseAdmin().from('rackets').update({ publicada }).eq('id', id)
  revalidatePath('/admin/rackets')
  revalidatePath('/')
}

export async function toggleAtiva(id: number, active: boolean) {
  await assertAdmin()
  await getSupabaseAdmin().from('rackets')
    .update(active ? { is_active: true, fora_de_linha: false } : { is_active: false, fora_de_linha: true })
    .eq('id', id)
  revalidatePath('/admin/rackets')
  revalidatePath('/admin/precos')
  revalidatePath('/')
}
