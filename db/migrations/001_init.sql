-- ሃገራዊ Cheap Flights — initial schema (roadmap 1.3)
-- Apply with: psql "$DATABASE_URL" -f db/migrations/001_init.sql

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_code VARCHAR(3) NOT NULL,
  destination_code VARCHAR(3) NOT NULL,
  route_type VARCHAR(20) NOT NULL CHECK (route_type IN ('domestic', 'international')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (origin_code, destination_code)
);

CREATE TABLE IF NOT EXISTS fare_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id),
  origin_code VARCHAR(3) NOT NULL,
  destination_code VARCHAR(3) NOT NULL,
  provider VARCHAR(50) NOT NULL,           -- 'duffel', 'amadeus', 'kiwi', 'demo', 'local_agent'
  departure_date DATE NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  price_etb DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  airline_code VARCHAR(3) NOT NULL,
  airline_name VARCHAR(100) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 0,
  stops INT NOT NULL DEFAULT 0,
  cabin_class VARCHAR(20) NOT NULL DEFAULT 'economy',
  baggage_kg INT NOT NULL DEFAULT 0,
  booking_url TEXT,
  captured_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fare_snapshots_route_date
  ON fare_snapshots (origin_code, destination_code, departure_date, captured_at DESC);
-- NOTE: a partial index with `WHERE captured_at > now() - ...` is illegal in
-- Postgres (index predicates must be IMMUTABLE), so this is a plain covering
-- index; the 24h window is filtered by the query itself.
CREATE INDEX IF NOT EXISTS idx_fare_snapshots_popular
  ON fare_snapshots (origin_code, destination_code, price_etb, captured_at DESC);

CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY,
  origin_code VARCHAR(3) NOT NULL,
  destination_code VARCHAR(3) NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  passengers INT NOT NULL DEFAULT 1,
  route_type VARCHAR(20),
  provider_count INT NOT NULL DEFAULT 0,
  user_id UUID,
  ip_address INET,
  clicked_result UUID,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_searches_created ON searches (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_searches_user ON searches (user_id);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  verified_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fare_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin_code VARCHAR(3) NOT NULL,
  destination_code VARCHAR(3) NOT NULL,
  departure_date DATE,
  target_price_etb DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMP,
  triggered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fare_alerts_user_active ON fare_alerts (user_id, is_active);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10,4) NOT NULL,
  source VARCHAR(50) NOT NULL,
  captured_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates (from_currency, to_currency, captured_at DESC);
