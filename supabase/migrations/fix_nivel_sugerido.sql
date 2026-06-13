-- Fix nivel_sugerido in racket_insights based on 3-signal derivation:
--   forgiveness + saida_de_bola (specs_extra) + maneuverability
--
-- Formula (mirrors lib/nivel.ts derivarNivel):
--   AVANCADO  : saida = 'exigente'  OR  forgiveness <= 5
--   INICIANTE : forgiveness >= 9
--               forgiveness = 8 AND saida = 'fácil'
--               forgiveness = 7 AND maneuverability >= 8 AND saida != 'exigente'
--   INTERMEDIARIO: everything else with forgiveness data

UPDATE racket_insights ri
SET nivel_sugerido = CASE
  -- AVANCADO
  WHEN (r.specs_extra->>'saida_de_bola') = 'exigente'       THEN 'avancado'
  WHEN ri.forgiveness <= 5                                   THEN 'avancado'
  -- INICIANTE
  WHEN ri.forgiveness >= 9                                   THEN 'iniciante'
  WHEN ri.forgiveness = 8
    AND (r.specs_extra->>'saida_de_bola') = 'fácil'         THEN 'iniciante'
  WHEN ri.forgiveness = 7
    AND (ri.maneuverability >= 8)
    AND (r.specs_extra->>'saida_de_bola') != 'exigente'     THEN 'iniciante'
  -- INTERMEDIARIO
  ELSE 'intermediario'
END
FROM rackets r
WHERE ri.racket_id = r.id
  AND ri.forgiveness IS NOT NULL;

-- Verify: show affected rackets and their new nivel_sugerido
SELECT r.name, ri.forgiveness, ri.maneuverability,
       r.specs_extra->>'saida_de_bola' AS saida,
       ri.nivel_sugerido
FROM racket_insights ri
JOIN rackets r ON r.id = ri.racket_id
WHERE r.publicada = true AND ri.forgiveness IS NOT NULL
ORDER BY ri.nivel_sugerido, r.name;
