import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'

async function assertAdmin() {
  const session = await auth()
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized')
  }
}

// BFS flood-fill from all 4 corners to remove solid-color background
function removeBg(pixels: Uint8Array, w: number, h: number, tolerance = 35) {
  const stride = w * 4
  const visited = new Uint8Array(w * h)

  function px(x: number, y: number) { return y * stride + x * 4 }

  function floodFill(startX: number, startY: number) {
    const si = px(startX, startY)
    const rR = pixels[si], rG = pixels[si + 1], rB = pixels[si + 2]
    const stack = [startY * w + startX]
    while (stack.length > 0) {
      const pos = stack.pop()!
      const x = pos % w, y = (pos / w) | 0
      if (visited[pos]) continue
      const i = px(x, y)
      const diff = Math.abs(pixels[i] - rR) + Math.abs(pixels[i + 1] - rG) + Math.abs(pixels[i + 2] - rB)
      if (diff > tolerance * 3) { visited[pos] = 2; continue }
      visited[pos] = 1
      if (x + 1 < w)  stack.push(pos + 1)
      if (x - 1 >= 0) stack.push(pos - 1)
      if (y + 1 < h)  stack.push(pos + w)
      if (y - 1 >= 0) stack.push(pos - w)
    }
  }

  floodFill(0, 0); floodFill(w - 1, 0); floodFill(0, h - 1); floodFill(w - 1, h - 1)

  for (let pos = 0; pos < w * h; pos++) {
    if (visited[pos] === 1) pixels[pos * 4 + 3] = 0
  }
}

async function processImage(fileBuffer: Buffer): Promise<Buffer> {
  // 1. Get raw RGBA pixels
  const { data, info } = await sharp(fileBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = new Uint8Array(data)
  removeBg(pixels, info.width, info.height)

  // 2. Trim transparent, fit inside 620x800, pad to 800x1020
  const { data: trimmed, info: ti } = await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 10 })
    .resize(620, 800, { fit: 'inside' })
    .ensureAlpha()
    .png()
    .toBuffer({ resolveWithObject: true })

  const padLeft   = Math.floor((800 - ti.width) / 2)
  const padRight  = 800 - ti.width - padLeft
  const padTop    = Math.floor((1020 - ti.height) / 2)
  const padBottom = 1020 - ti.height - padTop

  return sharp(trimmed)
    .extend({ left: padLeft, right: padRight, top: padTop, bottom: padBottom,
              background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 90 })
    .toBuffer()
}

export async function POST(req: Request) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  const slug = form.get('slug') as string | null

  if (!file || !slug) {
    return NextResponse.json({ error: 'Faltam campos: file, slug' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande (máx 10MB)' }, { status: 400 })
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  let processed: Buffer
  try {
    processed = await processImage(fileBuffer)
  } catch (e) {
    return NextResponse.json({ error: `Erro ao processar imagem: ${(e as Error).message}` }, { status: 422 })
  }

  const sb = getSupabaseAdmin()
  const filename = `${slug}.webp`

  const { error: uploadError } = await sb.storage
    .from('racket-images')
    .upload(filename, processed, {
      contentType: 'image/webp',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Erro no upload: ${uploadError.message}` }, { status: 500 })
  }

  const { data: urlData } = sb.storage.from('racket-images').getPublicUrl(filename)
  const publicUrl = urlData.publicUrl

  const { error: dbError } = await sb
    .from('rackets')
    .update({ image_url: publicUrl })
    .eq('slug', slug)

  if (dbError) {
    return NextResponse.json({ error: `DB update falhou: ${dbError.message}` }, { status: 500 })
  }

  revalidatePath(`/admin/rackets/${slug}`)
  revalidatePath(`/raquetes/${slug}`)

  return NextResponse.json({ ok: true, image_url: publicUrl })
}
