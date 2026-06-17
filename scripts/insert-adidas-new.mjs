import { createClient } from '@supabase/supabase-js'

import { readFileSync } from 'fs'
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .map(l => l.split('='))
    .filter(p => p.length >= 2)
    .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
)
const SUPABASE_URL = env.SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

// Get Adidas brand ID
const { data: brand, error: bErr } = await sb
  .from('brands')
  .select('id')
  .eq('slug', 'adidas')
  .single()

if (bErr || !brand) {
  console.error('Brand not found:', bErr)
  process.exit(1)
}

const bid = brand.id
console.log(`Adidas brand_id = ${bid}`)

const rackets = [
  {
    brand_id: bid,
    name: 'Adidas BT RX H14',
    slug: 'adidas-rx-h14',
    weight_g: 325,
    balance: 'médio',
    face_material: 'Fibra de Vidro',
    core: 'EVA Soft Performance',
    length_mm: 500,
    thickness_mm: 22,
    technologies: ['Spin Blade', 'Structural Reinforcement'],
    specs_extra: { furos: 14, nivel: 'intermediario' },
    price: null,
    currency: 'BRL',
    source_url: 'https://www.tradeinn.com/smashinn/en/adidas-rx-h14-beach-tennis-racket/137881536/p',
    image_url: '/raquetes/adidas-rx-h14.webp',
    publicada: true,
    is_active: true,
    destaque_atleta: false,
  },
  {
    brand_id: bid,
    name: 'Adidas BT RX H24 Carbon 3K',
    slug: 'adidas-rx-h24-carbon-3k',
    weight_g: 335,
    balance: 'médio',
    face_material: 'Carbono 3K',
    core: 'EVA Soft Performance',
    length_mm: 500,
    thickness_mm: 22,
    technologies: ['Spin Blade', 'Structural Reinforcement'],
    specs_extra: { furos: 24, nivel: 'performance' },
    price: 699.90,
    currency: 'BRL',
    source_url: 'https://www.favoritapadel.com.br/raquete-de-beach-tennis-adidas-rx-h24-carbon',
    image_url: '/raquetes/adidas-rx-h24-carbon-3k.webp',
    publicada: true,
    is_active: true,
    destaque_atleta: false,
  },
  {
    brand_id: bid,
    name: 'Adidas BT Adipower 3.1 H24',
    slug: 'adidas-adipower-3-1-h24',
    weight_g: 335,
    balance: 'médio',
    face_material: 'Carbono',
    core: 'EVA Soft Performance',
    length_mm: 500,
    thickness_mm: 22,
    technologies: ['Spin Blade', 'Exoskeleton', 'Structural Reinforcement', 'Sweet Spot Control'],
    specs_extra: { furos: 24, nivel: 'performance' },
    price: null,
    currency: 'BRL',
    source_url: 'https://www.futfanatics.com.br/raquete-de-beach-tennis-adidas-adipower-3-1-h24-azul',
    image_url: '/raquetes/adidas-adipower-3-1-h24.webp',
    publicada: true,
    is_active: true,
    destaque_atleta: false,
  },
  {
    brand_id: bid,
    name: 'Adidas BT Adipower Carbon H34',
    slug: 'adidas-adipower-carbon-h34',
    weight_g: 325,
    balance: 'médio',
    face_material: 'Carbono 3K',
    core: 'EVA Soft Performance',
    length_mm: 500,
    thickness_mm: 22,
    technologies: ['Exoskeleton', 'Spin Blade', 'Smart Holes Curve', 'Structural Reinforcement'],
    specs_extra: { furos: 34, nivel: 'performance', estrutura_octogonal: true },
    price: 999.89,
    currency: 'BRL',
    source_url: 'https://www.floatsports.com.br/raquetes-bt/adidas/raquete-beach-tennis-adidas-adipower-carbon-h34-2025',
    image_url: '/raquetes/adidas-adipower-carbon-h34.webp',
    publicada: true,
    is_active: true,
    destaque_atleta: false,
  },
  {
    brand_id: bid,
    name: 'Adidas BT Adipower Carbon Light H31',
    slug: 'adidas-adipower-carbon-light-h31',
    weight_g: 320,
    balance: 'médio',
    face_material: 'Carbono 3K',
    core: 'EVA Soft',
    length_mm: 500,
    thickness_mm: 22,
    technologies: ['Spin Blade', 'Structural Reinforcement'],
    specs_extra: { furos: 31, nivel: 'performance' },
    price: null,
    currency: 'BRL',
    source_url: 'https://www.tradeinn.com/smashinn/en/adidas-bt-adipower-carbon-light-3.3-h31-beach-tennis-racket/140965072/p',
    image_url: '/raquetes/adidas-adipower-carbon-light-h31.webp',
    publicada: true,
    is_active: true,
    destaque_atleta: false,
  },
  {
    brand_id: bid,
    name: 'Adidas BT Adipower Lite H14',
    slug: 'adidas-adipower-lite-h14',
    weight_g: 325,
    balance: 'médio',
    face_material: 'Fibra de Vidro',
    core: 'EVA Soft Performance',
    length_mm: 500,
    thickness_mm: 22,
    technologies: ['Exoskeleton', 'Spin Blade', 'Structural Reinforcement', 'Sweet Spot Attack'],
    specs_extra: { furos: 14, nivel: 'intermediario' },
    price: 799.00,
    currency: 'BRL',
    source_url: 'https://www.planetatenis.com.br/raquete-adidas-bt-adipower-lite-h14.html',
    image_url: '/raquetes/adidas-adipower-lite-h14.webp',
    publicada: true,
    is_active: true,
    destaque_atleta: false,
  },
]

console.log(`\nInserting ${rackets.length} Adidas rackets...\n`)

for (const r of rackets) {
  const { data, error } = await sb
    .from('rackets')
    .upsert(r, { onConflict: 'slug' })
    .select('id, slug, publicada')
    .single()

  if (error) {
    console.error(`ERR  ${r.slug}: ${error.message}`)
  } else {
    console.log(`OK   ${data.slug}  id=${data.id}  publicada=${data.publicada}`)
  }
}

console.log('\nDone.')
