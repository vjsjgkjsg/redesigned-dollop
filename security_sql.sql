-- ══════════════════════════════════════════
-- SECURITY TABLES — Портал педагога СКО
-- Выполнить в Supabase → SQL Editor
-- ══════════════════════════════════════════

-- 1. Таблица попыток входа (rate limiting + блокировка)
CREATE TABLE IF NOT EXISTS login_attempts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  login       TEXT NOT NULL,
  ip_hint     TEXT,                    -- fingerprint браузера (не реальный IP)
  success     BOOLEAN NOT NULL DEFAULT false,
  stage       TEXT DEFAULT 'password', -- 'password' | 'pin'
  ua          TEXT,                    -- user agent
  device      TEXT,                    -- устройство
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_insert" ON login_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "attempts_select" ON login_attempts FOR SELECT USING (true);

-- Индекс для быстрых запросов по логину + времени
CREATE INDEX IF NOT EXISTS idx_attempts_login_time 
  ON login_attempts(login, created_at DESC);

-- 2. Таблица блокировок
CREATE TABLE IF NOT EXISTS login_blocks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  login       TEXT NOT NULL UNIQUE,
  blocked_at  TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ NOT NULL,
  reason      TEXT DEFAULT 'too_many_attempts',
  attempt_count INT DEFAULT 0
);

ALTER TABLE login_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_all" ON login_blocks FOR ALL USING (true) WITH CHECK (true);

-- 3. Таблица сессий (лог успешных входов)
CREATE TABLE IF NOT EXISTS login_sessions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  login       TEXT NOT NULL,
  device      TEXT,
  os          TEXT,
  browser     TEXT,
  ip_hint     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_insert" ON login_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions_select" ON login_sessions FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_sessions_user 
  ON login_sessions(user_id, created_at DESC);

-- 4. Функция автоочистки старых записей (запускать вручную или по cron)
CREATE OR REPLACE FUNCTION cleanup_old_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM login_attempts WHERE created_at < now() - interval '7 days';
  DELETE FROM login_sessions  WHERE created_at < now() - interval '90 days';
  DELETE FROM login_blocks    WHERE blocked_until < now();
END;
$$ LANGUAGE plpgsql;
