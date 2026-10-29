-- Migration: get_top_rackets_by_conforto_30d — mesmo padrão de
-- get_top_rackets_by_nivel_30d, mas pro filtro de dor/conforto em vez de
-- nível. Usado pela seção "Mais recomendadas" em /raquetes/conforto —
-- confirmed_profile não tem um "nivel" equivalente pra essa página, mas tem
-- os 3 flags de sensibilidade (cotovelo/ombro/punho) que o agente já
-- confirma explicitamente no chat.
-- Additive only — nenhuma tabela/coluna existente é alterada.

CREATE OR REPLACE FUNCTION public.get_top_rackets_by_conforto_30d(lim integer DEFAULT 50)
 RETURNS TABLE(racket_id integer, cnt bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT re.racket_id, count(*)::bigint AS cnt
  FROM recommendation_events re
  JOIN conversations c ON c.session_id = re.conversation_id
  JOIN rackets r ON r.id = re.racket_id AND r.publicada = true
  WHERE re.created_at > now() - interval '30 days'
    AND re.is_test = false
    AND (
      c.confirmed_profile->>'cotovelo_sensivel' = 'true'
      OR c.confirmed_profile->>'ombro_sensivel' = 'true'
      OR c.confirmed_profile->>'punho_sensivel' = 'true'
    )
  GROUP BY re.racket_id
  ORDER BY cnt DESC
  LIMIT lim;
$function$;
