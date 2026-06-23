-- API usage tracking table for per-user rate limiting across all Edge Functions
CREATE TABLE IF NOT EXISTS api_usage (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text        NOT NULL,
  date          date        NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_lookup
  ON api_usage (user_id, function_name, date);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_usage" ON api_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);
