-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  last_checkin_at TIMESTAMPTZ DEFAULT NOW(),
  checkin_interval_days INTEGER DEFAULT 7,
  conflict_analysis TEXT,
  stage2_unlocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  category TEXT,
  label TEXT,
  policy_number TEXT,
  nominee TEXT,
  nominee_relation TEXT,
  expiry_date DATE,
  sum_assured NUMERIC,
  status TEXT DEFAULT 'active',
  warnings_json TEXT,
  raw_json TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trusted_contacts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  confirmed BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalation_state (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_day INTEGER DEFAULT 0,
  last_action_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS obituaries (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  recipient_name TEXT,
  recipient_email TEXT,
  message_encrypted TEXT,
  delivered BOOLEAN DEFAULT FALSE,
  draft_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monitor log (self-healing agent)
CREATE TABLE IF NOT EXISTS monitor_log (
  id BIGSERIAL PRIMARY KEY,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  category TEXT NOT NULL,
  user_id BIGINT,
  action_taken TEXT NOT NULL,
  detail_json TEXT
);

-- Analysis queue (auto re-analysis on asset change)
CREATE TABLE IF NOT EXISTS analysis_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending'
);

-- Score history (daily tracking + regression detection)
CREATE TABLE IF NOT EXISTS score_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  score INTEGER NOT NULL,
  breakdown_json TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
