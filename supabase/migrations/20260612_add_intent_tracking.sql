-- Migration: add intent-tracking fields to conversations
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor → New query)

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS primeira_mensagem  text,
  ADD COLUMN IF NOT EXISTS starter_usado      text,
  ADD COLUMN IF NOT EXISTS intencao_detectada text;

-- Indexes for the admin analytics queries
CREATE INDEX IF NOT EXISTS idx_conv_intencao    ON conversations (intencao_detectada);
CREATE INDEX IF NOT EXISTS idx_conv_created_at  ON conversations (created_at DESC);


-- ── Admin analytics queries (save these or paste in SQL Editor) ────────────────

-- 1. Count by intention
SELECT
  intencao_detectada,
  COUNT(*) AS total
FROM conversations
WHERE intencao_detectada IS NOT NULL
GROUP BY intencao_detectada
ORDER BY total DESC;

-- 2. Most used starters
SELECT
  COALESCE(starter_usado, 'livre') AS starter,
  COUNT(*) AS total
FROM conversations
WHERE primeira_mensagem IS NOT NULL
GROUP BY starter_usado
ORDER BY total DESC;

-- 3. Last 50 first messages (raw, for weekly review)
SELECT
  created_at,
  starter_usado,
  intencao_detectada,
  primeira_mensagem
FROM conversations
WHERE primeira_mensagem IS NOT NULL
ORDER BY created_at DESC
LIMIT 50;
