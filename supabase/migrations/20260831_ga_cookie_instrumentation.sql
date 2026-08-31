-- Instrumentacao para diagnosticar Unassigned no GA4: registra se as cookies
-- _ga e _ga_STREAM_ID estavam presentes no momento do clique em /ir/[slug].
-- NULL = clique anterior a essa instrumentacao (nao confundir com "ausente").
ALTER TABLE link_clicks
  ADD COLUMN has_ga_cookie boolean,
  ADD COLUMN has_session_cookie boolean;

COMMENT ON COLUMN link_clicks.has_ga_cookie IS 'Cookie _ga presente no request. NULL = anterior a instrumentacao (31/08/2026).';
COMMENT ON COLUMN link_clicks.has_session_cookie IS 'Cookie _ga_STREAM_ID presente e parseavel (gaSessionInfo() != null). NULL = anterior a instrumentacao.';

CREATE OR REPLACE FUNCTION public.admin_ga_tracking_stats(
  p_cutoff timestamp with time zone,
  p_include_test boolean DEFAULT false,
  p_session_only boolean DEFAULT true
)
RETURNS TABLE(sessao_completa bigint, cookie_sessao_ausente bigint, sem_cookie_ga bigint, total_instrumentado bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $function$
  SELECT
    COUNT(*) FILTER (WHERE has_ga_cookie IS TRUE AND has_session_cookie IS TRUE)::bigint,
    COUNT(*) FILTER (WHERE has_ga_cookie IS TRUE AND has_session_cookie IS FALSE)::bigint,
    COUNT(*) FILTER (WHERE has_ga_cookie IS FALSE)::bigint,
    COUNT(*) FILTER (WHERE has_ga_cookie IS NOT NULL)::bigint
  FROM link_clicks
  WHERE created_at >= p_cutoff
    AND (p_include_test OR is_test IS DISTINCT FROM true)
    AND (NOT p_session_only OR session_id IS NOT NULL)
$function$;
