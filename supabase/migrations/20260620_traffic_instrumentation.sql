-- Migration: extend link_clicks + recommendation_events for richer traffic instrumentation
-- Additive only — no tables, columns, or data are removed.

-- ── link_clicks: extend with richer click data ────────────────────────────────
ALTER TABLE link_clicks
  ADD COLUMN IF NOT EXISTS slug             text,
  ADD COLUMN IF NOT EXISTS destination_type text,   -- ml / oficial / retailer / cupom / desconhecido
  ADD COLUMN IF NOT EXISTS destination_url  text,
  ADD COLUMN IF NOT EXISTS session_id       text,
  ADD COLUMN IF NOT EXISTS referrer         text,
  ADD COLUMN IF NOT EXISTS user_agent       text;

CREATE INDEX IF NOT EXISTS idx_link_clicks_racket_id  ON link_clicks (racket_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_created_at ON link_clicks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_clicks_session_id ON link_clicks (session_id);

-- ── recommendation_events: extend with confidence + rank ──────────────────────
ALTER TABLE recommendation_events
  ADD COLUMN IF NOT EXISTS confidence numeric,   -- match_score from scorer (0-100)
  ADD COLUMN IF NOT EXISTS rank       integer;   -- position in recommendation list (1 = top)

CREATE INDEX IF NOT EXISTS idx_rec_events_racket_id  ON recommendation_events (racket_id);
CREATE INDEX IF NOT EXISTS idx_rec_events_created_at ON recommendation_events (created_at DESC);


-- ── Reporting queries (run in SQL Editor for the ranking report) ──────────────

-- 1. Per-racket performance (last 30 days)
-- SELECT
--   r.name,
--   r.slug,
--   r.affiliate_url IS NOT NULL                        AS has_affiliate,
--   COUNT(DISTINCT re.id)                              AS recomendacoes,
--   COUNT(DISTINCT lc.id)                              AS cliques,
--   ROUND(AVG(re.confidence), 1)                       AS avg_confidence,
--   CASE WHEN COUNT(DISTINCT re.id) > 0
--     THEN ROUND(COUNT(DISTINCT lc.id)::numeric / COUNT(DISTINCT re.id) * 100, 1)
--     ELSE NULL END                                    AS taxa_clique_pct
-- FROM rackets r
-- LEFT JOIN recommendation_events re
--   ON re.racket_id = r.id AND re.created_at >= NOW() - INTERVAL '30 days'
-- LEFT JOIN link_clicks lc
--   ON lc.racket_id = r.id AND lc.created_at >= NOW() - INTERVAL '30 days'
-- WHERE r.publicada = true
-- GROUP BY r.id, r.name, r.slug, r.affiliate_url
-- HAVING COUNT(DISTINCT re.id) > 0 OR COUNT(DISTINCT lc.id) > 0
-- ORDER BY recomendacoes DESC;

-- 2. Affiliate-only performance (ML links)
-- SELECT
--   r.name,
--   r.slug,
--   COUNT(DISTINCT lc.id)      AS cliques_ml,
--   lc.destination_url
-- FROM rackets r
-- JOIN link_clicks lc ON lc.racket_id = r.id
-- WHERE r.affiliate_url IS NOT NULL
--   AND lc.destination_type = 'ml'
-- GROUP BY r.id, r.name, r.slug, lc.destination_url
-- ORDER BY cliques_ml DESC;
