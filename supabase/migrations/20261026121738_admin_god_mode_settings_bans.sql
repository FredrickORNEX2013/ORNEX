/*
# Admin God Mode: app settings, admin bans, login attempts

1. New Tables
- `app_settings`: single-row key-value store for app customization (app name, icon, colors, layout, tabs, youtube API key, channels)
  - key (text, PK), value (jsonb), updated_at (timestamptz)
- `admin_bans`: permanent admin-to-admin bans (banned_email, banned_by, reason, created_at)
- `login_attempts`: tracks failed admin login attempts per email+IP for auto-ban after 5 tries

2. Security
- RLS enabled on all tables
- All tables writable only via service_role (edge function); anon/authenticated get SELECT on app_settings only
- app_settings is publicly readable so the frontend can load app config
*/

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON app_settings TO anon, authenticated;
GRANT ALL ON app_settings TO service_role;

DROP POLICY IF EXISTS "public_read_app_settings" ON app_settings;
CREATE POLICY "public_read_app_settings"
ON app_settings FOR SELECT
TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS admin_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banned_email text NOT NULL,
  banned_by text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(banned_email)
);

ALTER TABLE admin_bans ENABLE ROW LEVEL SECURITY;
GRANT ALL ON admin_bans TO service_role;

CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON login_attempts TO service_role;

-- Seed default app settings
INSERT INTO app_settings (key, value) VALUES
  ('app_config', '{"appName":"ORNEX","primaryColor":"#000000","accentColor":"#ffffff","logoIcon":"play","showTabs":["foryou","explore","post","inbox","me"]}'::jsonb)
ON CONFLICT (key) DO NOTHING;
