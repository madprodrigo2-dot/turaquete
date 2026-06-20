-- Migration: is_test flag nos eventos
-- Objetivo: separar tráfego de admin/QA dos usuários reais nas métricas.
-- Additive only — nenhuma coluna ou dado é removido.

-- ── 1. Adicionar coluna is_test a todas as tabelas de eventos ──────────────

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE recommendation_events
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE link_clicks
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE feedback_events
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- ── 2. Indexes para filtro padrão (is_test = false) ──────────────────────

CREATE INDEX IF NOT EXISTS idx_conversations_is_test      ON conversations (is_test);
CREATE INDEX IF NOT EXISTS idx_rec_events_is_test         ON recommendation_events (is_test);
CREATE INDEX IF NOT EXISTS idx_link_clicks_is_test        ON link_clicks (is_test);
CREATE INDEX IF NOT EXISTS idx_feedback_events_is_test    ON feedback_events (is_test);

-- ── 3. RPCs atualizadas com filtro p_include_test ─────────────────────────
-- Cria overloads com um parâmetro extra (default false).
-- As versões sem parâmetro continuam existindo se foram criadas antes;
-- as páginas do admin passarão a chamar os novos overloads explicitamente.

CREATE OR REPLACE FUNCTION admin_intencao_counts(p_include_test boolean DEFAULT false)
RETURNS TABLE(intencao_detectada text, total bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT c.intencao_detectada::text,
         COUNT(*)::bigint AS total
  FROM conversations c
  WHERE c.intencao_detectada IS NOT NULL
    AND (p_include_test OR NOT c.is_test)
  GROUP BY c.intencao_detectada
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION admin_starter_counts(p_include_test boolean DEFAULT false)
RETURNS TABLE(starter text, total bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(c.starter_usado, 'livre')::text AS starter,
         COUNT(*)::bigint AS total
  FROM conversations c
  WHERE c.primeira_mensagem IS NOT NULL
    AND (p_include_test OR NOT c.is_test)
  GROUP BY c.starter_usado
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;

-- Nota: esta versão assume o schema inferido do código do dashboard.
-- Se a função existente tiver lógica diferente, ajuste o corpo abaixo.
CREATE OR REPLACE FUNCTION admin_cost_by_session(
  days_back      integer,
  p_include_test boolean DEFAULT false
)
RETURNS TABLE(
  session_id    text,
  total_brl     numeric,
  total_usd     numeric,
  turns         bigint,
  had_rec       boolean,
  first_turn_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.session_id,
    SUM(c.custo_brl)::numeric                       AS total_brl,
    SUM(c.custo_usd)::numeric                       AS total_usd,
    COUNT(*)::bigint                                AS turns,
    bool_or(cardinality(c.recommended_racket_ids) > 0) AS had_rec,
    MIN(c.created_at)                               AS first_turn_at
  FROM conversations c
  WHERE c.custo_brl > 0
    AND c.created_at >= NOW() - (days_back || ' days')::interval
    AND (p_include_test OR NOT c.is_test)
  GROUP BY c.session_id;
END;
$$ LANGUAGE plpgsql;


-- ── 4. UPDATE histórico — NÃO EXECUTAR agora, revisar e rodar manualmente ──
--
-- Marca todos os eventos existentes como is_test = true para começar limpo.
-- É reversível: UPDATE conversations SET is_test = false; (para desfazer)
--
-- UPDATE conversations         SET is_test = true;
-- UPDATE recommendation_events SET is_test = true;
-- UPDATE link_clicks            SET is_test = true;
-- UPDATE feedback_events        SET is_test = true;
