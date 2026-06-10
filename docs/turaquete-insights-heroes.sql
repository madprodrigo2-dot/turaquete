-- TURAQUETE — Carga de racket_insights (17 raquetas Heroe's) + atributos físicos en specs_extra
--
-- IMPORTANTE ANTES DE CORRER:
-- 1. Entrega este archivo a Claude Code con la instrucción: "valida los nombres de columnas
--    contra el esquema REAL de racket_insights y rackets, ajusta lo que difiera y dame la versión final".
--    (Las columnas usadas aquí: potencia, controle, conforto, manuseio, spin, estabilidade,
--     perfil_resumo, nivel_sugerido, confianca, ai_drafted, reviewed. Si tu migración usó otros
--     nombres —p. ej. los originales en inglés power/control/comfort— Claude Code los renombra.)
-- 2. Luego pégalo en el SQL Editor de Supabase y Run.
-- 3. Es idempotente: usa upsert (on conflict), se puede correr de nuevo sin duplicar.

-- ============ PARTE A: atributos físicos extra (solo lo confirmado; no se inventa) ============

update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"3k","textura":"lisa"}'::jsonb where slug='rebel-25';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"12k"}'::jsonb where slug='fierce';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"3k"}'::jsonb where slug='starlight-ruby';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"3k"}'::jsonb where slug='heroes-x-senna';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"3k","textura":"lisa","formato_cabeca":"diamante"}'::jsonb where slug='starlight';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"12k"}'::jsonb where slug='ison-25';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"12k"}'::jsonb where slug='the-bull';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"3k","textura":"lisa"}'::jsonb where slug='show-25';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"kevlar"}'::jsonb where slug='coach';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"3k","textura":"lisa"}'::jsonb where slug='rebel-24';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"3k","textura":"lisa"}'::jsonb where slug='show-24';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"12k"}'::jsonb where slug='mjolnir-25';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"bio"}'::jsonb where slug='forest';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"textura":"lisa"}'::jsonb where slug='harley-25';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"kevlar","textura":"lisa","furos_quantidade":35,"furos_padrao":"equilibrado"}'::jsonb where slug='ceu';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"textura":"lisa"}'::jsonb where slug='harley-24';
update rackets set specs_extra = coalesce(specs_extra,'{}'::jsonb) || '{"trama_carbono":"12k"}'::jsonb where slug='beast-2023';

-- ============ PARTE B: insights (upsert) ============

insert into racket_insights (racket_id, potencia, controle, conforto, manuseio, spin, estabilidade, nivel_sugerido, confianca, perfil_resumo, ai_drafted, reviewed)
select r.id, v.potencia, v.controle, v.conforto, v.manuseio, v.spin, v.estabilidade, v.nivel, v.conf, v.perfil, true, false
from (values
  ('rebel-25',9,8,7,9,5,8,'avancado','alta','Ponta de ataque do catálogo: manuseio excepcional e resposta imediata do 3K. Para atacante que define pontos; exige técnica.'),
  ('fierce',9,7,5,7,5,9,'avancado','media','Rígida e explosiva (12K + núcleo reforçado): máxima potência e estabilidade. Não indicada para braços sensíveis.'),
  ('starlight-ruby',8,8,6,7,6,8,'intermediario','media','Ofensiva equilibrada: potência explosiva com trajetórias limpas. Para quem ataca sem abrir mão do controle.'),
  ('heroes-x-senna',8,7,6,7,5,7,'avancado','baixa','Edição limitada Ayrton Senna sobre a plataforma 3K performance. Valor de coleção além do jogo.'),
  ('starlight',8,7,6,7,5,7,'avancado','media','Versátil profissional com quadro diamante (sweet spot mais alto). Fora de estoque no momento.'),
  ('ison-25',8,8,5,8,5,8,'avancado','media','Reativa e estável sobre 12K rígido: manobrável E controlada. Para avançados exigentes; dura com o braço.'),
  ('the-bull',8,7,5,7,5,8,'avancado','baixa','Resposta firme orientada ao ataque direto sobre carbono 12K.'),
  ('show-25',7,8,6,8,5,8,'intermediario','media','A "completa" da linha pro: muito equilibrada em todas as fases do jogo, sem extremos.'),
  ('coach',6,9,8,8,5,7,'intermediario','alta','Kevlar vermelho que absorve vibração: controle e precisão com conforto real. Ótima para braço sensível sem sair da linha performance.'),
  ('rebel-24',8,7,8,8,5,8,'avancado','alta','A Rebel com núcleo supersoft: agressiva porém mais amável com o braço. Potência COM conforto.'),
  ('show-24',7,8,6,8,5,7,'intermediario','media','Mesma filosofia equilibrada da Show 25, geração anterior — mesmo caráter por menos.'),
  ('mjolnir-25',7,8,6,8,5,7,'intermediario','media','Precisão e controle em trocas rápidas; 12K reativo afinado para colocação de bola. Versátil.'),
  ('forest',6,8,8,8,5,6,'intermediario','media','A mais leve (320g) e consciente: confortável, elástica, com boa absorção. Carbono de origem biológica.'),
  ('harley-25',7,8,6,7,5,7,'intermediario','media','Precisão para nível médio-alto; equilíbrio controle/potência. Porta de entrada à linha performance.'),
  ('ceu',6,9,9,7,4,9,'iniciante','alta','A defensiva do catálogo: 22mm + Kevlar = estabilidade superior em bloqueios; EVA supersoft muito gentil com o braço. Nº1 para defesa e dores no braço; apta a todos os níveis.'),
  ('harley-24',7,8,8,6,4,8,'intermediario','media','Pesada (335g) e estável com núcleo supersoft: controle + conforto com ótimo custo-benefício.'),
  ('beast-2023',6,7,9,8,4,6,'iniciante','media','A porta de entrada da Heroe''s: leve, macia e balanceada, definida pelo conforto. Ideal para iniciantes e orçamento menor.')
) as v(slug, potencia, controle, conforto, manuseio, spin, estabilidade, nivel, conf, perfil)
join rackets r on r.slug = v.slug
on conflict (racket_id) do update set
  potencia=excluded.potencia, controle=excluded.controle, conforto=excluded.conforto,
  manuseio=excluded.manuseio, spin=excluded.spin, estabilidade=excluded.estabilidade,
  nivel_sugerido=excluded.nivel_sugerido, confianca=excluded.confianca,
  perfil_resumo=excluded.perfil_resumo, ai_drafted=excluded.ai_drafted, reviewed=excluded.reviewed;
