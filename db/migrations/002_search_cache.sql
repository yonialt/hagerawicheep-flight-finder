-- ሃገራዊ Cheap Flights — durable search responses (results page survives restarts)
-- Apply with: neonctl psql production -- -f db/migrations/002_search_cache.sql
-- (or: psql "$DATABASE_URL" -f db/migrations/002_search_cache.sql)

CREATE TABLE IF NOT EXISTS search_responses (
  id UUID PRIMARY KEY,                      -- = SearchMeta.searchId
  origin_code VARCHAR(3) NOT NULL,
  destination_code VARCHAR(3) NOT NULL,
  departure_date DATE NOT NULL,
  passengers INT NOT NULL DEFAULT 1,
  response JSONB NOT NULL,                  -- full SearchResponse payload
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_responses_created
  ON search_responses (created_at DESC);

-- TTL cleanup: responses only need to outlive the 20-minute cache window.
-- Postgres 15+ supports CREATE INDEX ... NULLS NOT DISTINCT; keep it simple:
-- a scheduled/piggy-backed delete in app code prunes old rows.
