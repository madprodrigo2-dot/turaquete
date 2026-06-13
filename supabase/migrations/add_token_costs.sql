-- Migration: add token usage and cost tracking to conversations
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS tokens_input       integer,
  ADD COLUMN IF NOT EXISTS tokens_output      integer,
  ADD COLUMN IF NOT EXISTS tokens_cache_read  integer,
  ADD COLUMN IF NOT EXISTS tokens_cache_write integer,
  ADD COLUMN IF NOT EXISTS modelo_usado       text,
  ADD COLUMN IF NOT EXISTS custo_usd          numeric(14, 8),
  ADD COLUMN IF NOT EXISTS custo_brl          numeric(14, 6);

-- Optional index for cost queries in the admin panel
CREATE INDEX IF NOT EXISTS idx_conversations_custo_brl
  ON conversations (created_at, custo_brl)
  WHERE custo_brl IS NOT NULL;
