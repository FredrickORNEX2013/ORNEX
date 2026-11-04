/*
# ORNEX Worldwide: chats, flagged_messages, rules tables

1. New Tables
- chats: id, sender_id, recipient_id, message, created_at — realtime chat
- flagged_messages: id, user_id, original_text, reason, created_at
- rules: id, title, description, category, created_at (pre-seeded 100)

2. Security
- All tables: RLS enabled, anon + authenticated full CRUD (public app)
- GRANT SELECT, INSERT, UPDATE, DELETE to anon, authenticated

3. Realtime
- chats table added to supabase_realtime publication
*/

CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL,
  recipient_id text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON chats TO anon, authenticated;

DROP POLICY IF EXISTS "read_chats" ON chats;
CREATE POLICY "read_chats" ON chats FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_chats" ON chats;
CREATE POLICY "insert_chats" ON chats FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_chats" ON chats;
CREATE POLICY "update_chats" ON chats FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_chats" ON chats;
CREATE POLICY "delete_chats" ON chats FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS flagged_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  original_text text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE flagged_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON flagged_messages TO anon, authenticated;

DROP POLICY IF EXISTS "read_flagged" ON flagged_messages;
CREATE POLICY "read_flagged" ON flagged_messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_flagged" ON flagged_messages;
CREATE POLICY "insert_flagged" ON flagged_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "delete_flagged" ON flagged_messages;
CREATE POLICY "delete_flagged" ON flagged_messages FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON rules TO anon, authenticated;

DROP POLICY IF EXISTS "read_rules" ON rules;
CREATE POLICY "read_rules" ON rules FOR SELECT TO anon, authenticated USING (true);

DO $$
DECLARE i int; cat text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rules LIMIT 1) THEN
    FOR i IN 1..100 LOOP
      cat := CASE (i % 5)
        WHEN 0 THEN 'safety'
        WHEN 1 THEN 'respect'
        WHEN 2 THEN 'content'
        WHEN 3 THEN 'privacy'
        ELSE 'community'
      END;
      INSERT INTO rules (title, description, category)
      VALUES (
        'Rule ' || i,
        CASE
          WHEN i <= 20 THEN 'No harassment, bullying, or hate speech toward any person or group.'
          WHEN i <= 40 THEN 'No nudity, sexual content, or graphic violence in videos or comments.'
          WHEN i <= 60 THEN 'Do not share personal information about others without consent.'
          WHEN i <= 80 THEN 'No spam, scams, or misleading content designed to deceive users.'
          ELSE 'Respect the community guidelines and report violations to keep ORNEX safe.'
        END,
        cat
      );
    END LOOP;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE chats;
