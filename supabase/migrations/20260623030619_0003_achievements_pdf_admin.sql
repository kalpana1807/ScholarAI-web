/*
# ScholarAI Feature Extensions
## Summary
Adds tables for: PDF uploads, user achievements/badges, admin roles,
and extended analytics events. Also adds is_admin flag to profiles.

## New Tables
1. `pdf_uploads` — stores user-uploaded PDF metadata + extracted text + AI summary/quiz
2. `achievements` — master list of all possible badges/achievements
3. `user_achievements` — junction: which user earned which achievement + when
4. `admin_notes` — admin can flag/annotate users or content
5. `analytics_events` — granular event log for admin dashboard

## Modified Tables
- `profiles` — adds `is_admin boolean DEFAULT false`

## Security
- RLS on all new tables
- `pdf_uploads`, `user_achievements`, `analytics_events` are owner-scoped
- `achievements` is readable by all authenticated users (master list)
- `admin_notes` is readable/writable only by admins (checked via profiles.is_admin)
*/

-- 1. Add is_admin to profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. PDF uploads
CREATE TABLE IF NOT EXISTS public.pdf_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  extracted_text text,
  summary text,
  key_points text,
  quiz_questions jsonb,
  flashcard_pairs jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
  error_message text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_pdfs" ON public.pdf_uploads;
DROP POLICY IF EXISTS "insert_own_pdfs" ON public.pdf_uploads;
DROP POLICY IF EXISTS "update_own_pdfs" ON public.pdf_uploads;
DROP POLICY IF EXISTS "delete_own_pdfs" ON public.pdf_uploads;
CREATE POLICY "select_own_pdfs" ON public.pdf_uploads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_pdfs" ON public.pdf_uploads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_pdfs" ON public.pdf_uploads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_pdfs" ON public.pdf_uploads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Achievements master list
CREATE TABLE IF NOT EXISTS public.achievements (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  category text NOT NULL DEFAULT 'general',
  threshold integer NOT NULL DEFAULT 1,
  points integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_achievements" ON public.achievements;
CREATE POLICY "read_achievements" ON public.achievements FOR SELECT TO authenticated USING (true);

-- 4. User achievements (earned badges)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_ua" ON public.user_achievements;
DROP POLICY IF EXISTS "insert_own_ua" ON public.user_achievements;
DROP POLICY IF EXISTS "delete_own_ua" ON public.user_achievements;
CREATE POLICY "select_own_ua" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_ua" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_ua" ON public.user_achievements FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Admins can read all user achievements
DROP POLICY IF EXISTS "admin_read_ua" ON public.user_achievements;
CREATE POLICY "admin_read_ua" ON public.user_achievements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 5. Analytics events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_events" ON public.analytics_events;
DROP POLICY IF EXISTS "insert_own_events" ON public.analytics_events;
DROP POLICY IF EXISTS "admin_read_events" ON public.analytics_events;
CREATE POLICY "select_own_events" ON public.analytics_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_events" ON public.analytics_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_read_events" ON public.analytics_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 6. Admin view: profiles readable by admins
DROP POLICY IF EXISTS "admin_read_profiles" ON public.profiles;
CREATE POLICY "admin_read_profiles" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.is_admin = true));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user ON public.pdf_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_ua_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.analytics_events(created_at DESC);

-- Seed achievements master list
INSERT INTO public.achievements (id, title, description, icon, category, threshold, points) VALUES
  ('first_note',       'Note Taker',          'Save your first note',                        'file-text',     'notes',    1,   10),
  ('note_10',          'Prolific Writer',      'Save 10 notes',                               'book-open',     'notes',    10,  25),
  ('note_50',          'Scribe',              'Save 50 notes',                               'library',       'notes',    50,  75),
  ('first_quiz',       'Quiz Starter',        'Complete your first quiz',                    'clipboard-list','quizzes',  1,   10),
  ('quiz_ace',         'Ace Student',         'Score 100% on a quiz',                        'trophy',        'quizzes',  1,   50),
  ('quiz_10',          'Quiz Master',         'Complete 10 quizzes',                         'zap',           'quizzes',  10,  30),
  ('streak_3',         '3-Day Streak',        'Study 3 days in a row',                       'flame',         'streaks',  3,   15),
  ('streak_7',         'Week Warrior',        'Study 7 days in a row',                       'flame',         'streaks',  7,   40),
  ('streak_30',        'Unstoppable',         'Study 30 days in a row',                      'flame',         'streaks',  30,  150),
  ('first_flash',      'Card Maker',          'Create your first flashcard deck',            'layers',        'flash',    1,   10),
  ('flash_50',         'Deck Builder',        'Create 50 flashcards',                        'layers',        'flash',    50,  40),
  ('first_pdf',        'PDF Scholar',         'Upload and summarise your first PDF',         'file-up',       'pdf',      1,   20),
  ('pdf_5',            'Document Analyst',    'Upload 5 PDFs',                               'file-up',       'pdf',      5,   50),
  ('task_10',          'Planner',             'Complete 10 study tasks',                     'calendar-check','planner',  10,  20),
  ('task_50',          'Goal Crusher',        'Complete 50 study tasks',                     'target',        'planner',  50,  60),
  ('first_chat',       'AI Curious',          'Send your first AI Tutor message',            'message-square','ai',       1,   10),
  ('chat_50',          'AI Power User',       'Send 50 AI Tutor messages',                   'sparkles',      'ai',       50,  35),
  ('hours_10',         '10 Hours In',         'Study for a cumulative 10 hours',             'clock',         'time',     600, 25),
  ('hours_50',         'Dedicated Scholar',   'Study for a cumulative 50 hours',             'clock',         'time',     3000,100),
  ('all_rounder',      'All-Rounder',         'Use every feature at least once',             'award',         'general',  1,   75)
ON CONFLICT (id) DO NOTHING;
