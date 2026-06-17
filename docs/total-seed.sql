-- ══════════════════════════════════════════════════════════════════════════════
-- TOTAL Beach Tennis — seed inicial
-- Criado: 2026-06-17
-- IMPORTANTE: rodar no Supabase SQL Editor (ou psql)
-- Todos os campos editoriais/scores ficam NULL — preencher via matriz de Rodrigo
-- publicada = false → raquetes ficam invisíveis até Rodrigo aprovar
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. MARCA ──────────────────────────────────────────────────────────────────

insert into brands (name, slug, country, website, status, logo_url)
values ('Total', 'total', 'BR', 'https://totalbeachtennis.com.br', 'disponivel', '/brands/total-logo.png')
on conflict (slug) do nothing;

-- ── 2. RAQUETES (publicada = false) ───────────────────────────────────────────

do $$ declare _bid bigint := (select id from brands where slug = 'total'); begin

insert into rackets (
  brand_id, name, slug,
  weight_g, balance, face_material, core,
  length_mm, thickness_mm,
  technologies, specs_extra,
  price, currency, source_url, image_url,
  publicada, is_active
) values

-- 1. Total Fun  (carbono entry-level, EVA PRO, 320g, 28 furos)
(_bid, 'Total Fun', 'total-fun',
  320, 'neutro', 'Carbono', 'EVA PRO',
  500, 22,
  ARRAY[]::text[],
  '{"furos":28,"tratamento_superficial":"graos_de_quartzo"}'::jsonb,
  669, 'BRL',
  'https://totalbeachtennis.com.br/collections/loja/products/raquete-de-beach-tennis-carbono-total-fun',
  '/raquetes/total-fun.webp',
  false, true),

-- 2. Total Match 3K  (carbono 3K, EVA PRO, 320g, 48 furos, antivibração)
(_bid, 'Total Match 3K', 'total-match-3k',
  320, 'neutro', 'Carbono 3K', 'EVA PRO',
  500, 22,
  ARRAY['Sistema Antivibração'],
  '{"furos":48,"trama_carbono":"3k","tratamento_superficial":"graos_de_quartzo"}'::jsonb,
  1169, 'BRL',
  'https://totalbeachtennis.com.br/collections/loja/products/raquete-beach-tennis-carbono-3k-total-match',
  '/raquetes/total-match-3k.webp',
  false, true),

-- 3. Total Pro 12K  (carbono 12K, EVA PRO, 325g, 28 furos)
--    NOTA: peso 325g (vs 320g das demais) — verificar na ficha
(_bid, 'Total Pro 12K', 'total-pro-12k',
  325, 'neutro', 'Carbono 12K', 'EVA PRO',
  500, 22,
  ARRAY[]::text[],
  '{"furos":28,"trama_carbono":"12k","tratamento_superficial":"graos_de_quartzo"}'::jsonb,
  980, 'BRL',
  'https://totalbeachtennis.com.br/collections/loja/products/raquete-beach-tennis-carbono-12k-total-pro',
  '/raquetes/total-pro-12k.webp',
  false, true),

-- 4. Total Pro Sunset 12K  (carbono 12K, EVA PRO Alta Densidade, 320g, 48 furos, EVA Soft Double)
--    NOTA: produto distinto da Pro 12K (furos e peso diferentes) — NÃO é variante de cor
--    IMAGEM: verificar visualmente (arquivo menor, 60KB vs 89-131KB das outras)
(_bid, 'Total Pro Sunset 12K', 'total-pro-sunset-12k',
  320, 'neutro', 'Carbono 12K', 'EVA PRO Alta Densidade',
  500, 22,
  ARRAY['Sistema Antivibração','EVA Soft Double'],
  '{"furos":48,"trama_carbono":"12k","tratamento_superficial":"graos_de_quartzo"}'::jsonb,
  1183, 'BRL',
  'https://totalbeachtennis.com.br/collections/loja/products/raquete-total-pro-sunset-carbono-12k',
  '/raquetes/total-pro-sunset-12k.webp',
  false, true),

-- 5. Total Titanium 3K  (carbono 3K + reforço de titânio, EVA PRO, 320g, 48 furos)
(_bid, 'Total Titanium 3K', 'total-titanium-3k',
  320, 'neutro', 'Carbono 3K com Reforco de Titanio', 'EVA PRO',
  500, 22,
  ARRAY['Sistema Antivibração Avançado'],
  '{"furos":48,"trama_carbono":"3k","reforco_titanio":true,"tratamento_superficial":"graos_de_quartzo"}'::jsonb,
  1199, 'BRL',
  'https://totalbeachtennis.com.br/collections/loja/products/raquete-beach-tennis-total-titanium',
  '/raquetes/total-titanium-3k.webp',
  false, true),

-- 6. Total Evolution 18K Violeta  (atleta: Miryan Stochiero)
(_bid, 'Total Evolution 18K Violeta', 'total-evolution-18k-violeta',
  320, 'neutro', 'Carbono 18K', 'EVA PRO',
  500, 22,
  ARRAY[]::text[],
  '{"furos":48,"trama_carbono":"18k","tratamento_superficial":"graos_de_quartzo","atleta":"Miryan Stochiero"}'::jsonb,
  1099, 'BRL',
  'https://totalbeachtennis.com.br/collections/loja/products/raquete-beach-tennis-carbono-18k-total-evolution',
  '/raquetes/total-evolution-18k-violeta.webp',
  false, true),

-- 7. Total Evolution 18K Golden
--    NOTA: site indica 28 furos (vs 48 da Violeta) — confirmar se é erro do site
(_bid, 'Total Evolution 18K Golden', 'total-evolution-18k-golden',
  320, 'neutro', 'Carbono 18K', 'EVA PRO',
  500, 22,
  ARRAY[]::text[],
  '{"furos":28,"trama_carbono":"18k","tratamento_superficial":"graos_de_quartzo"}'::jsonb,
  1099, 'BRL',
  'https://totalbeachtennis.com.br/collections/loja/products/raquete-total-evolution-carbono-18k-golden',
  '/raquetes/total-evolution-18k-golden.webp',
  false, true);

-- destaque_atleta para a raquete da Miryan Stochiero
update rackets set destaque_atleta = true where slug = 'total-evolution-18k-violeta';

end $$;

-- ── 3. ZAND — atualizar logo_url (novo arquivo zand-logo.svg) ─────────────────

update brands set logo_url = '/marcas/zand-logo.webp' where slug = 'zand';

-- ── 4. VERIFICAR ──────────────────────────────────────────────────────────────

select r.slug, r.name, r.price, r.publicada, r.destaque_atleta, b.name as brand
from rackets r join brands b on b.id = r.brand_id
where b.slug = 'total'
order by r.price;
