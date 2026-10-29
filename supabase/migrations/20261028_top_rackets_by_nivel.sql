-- Migration: get_top_rackets_by_nivel_30d — ranking de recomendações reais do
-- chat (recommendation_events) filtrado por nivel confirmado pelo usuário
-- (conversations.confirmed_profile->>'nivel'). Usado pela seção "Top 3" nas
-- páginas de nível (/raquetes/iniciante, intermediario, avancado).
-- Mesmo padrão de get_top_rackets_30d — apenas troca a fonte (recs em vez de
-- clicks) e adiciona o filtro de nivel via join com conversations.
-- Additive only — nenhuma tabela/coluna existente é alterada.

CREATE OR REPLACE FUNCTION public.get_top_rackets_by_nivel_30d(p_nivel text, lim integer DEFAULT 50)
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
    AND c.confirmed_profile->>'nivel' = p_nivel
  GROUP BY re.racket_id
  ORDER BY cnt DESC
  LIMIT lim;
$function$;
