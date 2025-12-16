-- =========================
-- USERS (DIRECT USERS ONLY)
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- API KEYS (DIRECT + RAPIDAPI)
-- =========================
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,

  -- Direct users only (NULL for RapidAPI users)
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Internal API key (used ONLY for direct users)
  api_key VARCHAR(128) UNIQUE,

  -- RapidAPI consumer key (X-RapidAPI-Key)
  rapidapi_key VARCHAR(128) UNIQUE,

  plan_type VARCHAR(50) DEFAULT 'free',
  credits_remaining INTEGER DEFAULT 100,

  -- 'direct' | 'rapidapi'
  source VARCHAR(50) NOT NULL,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Safety: exactly one key type must exist
  CONSTRAINT api_keys_one_identity CHECK (
    (api_key IS NOT NULL AND rapidapi_key IS NULL)
    OR
    (api_key IS NULL AND rapidapi_key IS NOT NULL)
  )
);

-- =========================
-- USAGE LOGS
-- =========================
CREATE TABLE IF NOT EXISTS usage_logs (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
  email_validated VARCHAR(255),
  result JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key
  ON api_keys(api_key);

CREATE INDEX IF NOT EXISTS idx_api_keys_rapidapi_key
  ON api_keys(rapidapi_key);

CREATE INDEX IF NOT EXISTS idx_api_keys_user
  ON api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_usage_logs_key
  ON usage_logs(api_key_id);

CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp
  ON usage_logs(timestamp);
