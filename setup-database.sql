-- ============================================================
-- CareerPath AI — Full Database Setup
-- Run this entire script in Supabase SQL Editor
-- Project: wmnwhzpezfyhtvgxfrxu
-- ============================================================

-- ── 1. PROFILES TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  job_title TEXT,
  target_position TEXT,
  experience_years INTEGER DEFAULT 0,
  -- Resume & AI fields
  parsed_resume JSONB DEFAULT NULL,
  job_matches JSONB DEFAULT NULL,
  skills JSONB DEFAULT '[]',
  career_goals JSONB DEFAULT '{}',
  job_preferences JSONB DEFAULT '{}',
  skill_assessments JSONB DEFAULT '[]',
  career_progression JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ── 2. JOBS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  salary_range TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ── 3. CERTIFICATIONS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  credential_id TEXT,
  credential_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ── 4. JOB APPLICATIONS TABLE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'interview', 'offer', 'rejected', 'accepted')),
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  salary_range TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ── 5. CAREER CHATS TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.career_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ── 6. USER SETTINGS TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  theme TEXT DEFAULT 'default'
    CHECK (theme IN ('default', 'ocean', 'sunset', 'forest', 'midnight')),
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ── 7. ENABLE ROW LEVEL SECURITY ──────────────────────────────
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_chats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings   ENABLE ROW LEVEL SECURITY;

-- ── 8. RLS POLICIES — PROFILES ────────────────────────────────
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id"   ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authentication service"   ON public.profiles;

CREATE POLICY "Profiles: select own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Profiles: insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

GRANT ALL ON public.profiles TO authenticated;

-- ── 9. RLS POLICIES — JOBS (public read) ──────────────────────
DROP POLICY IF EXISTS "Jobs are viewable by all users" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON public.jobs;

CREATE POLICY "Jobs: public read"
  ON public.jobs FOR SELECT
  USING (true);

CREATE POLICY "Jobs: authenticated insert"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ── 10. RLS POLICIES — OTHER TABLES ──────────────────────────
CREATE POLICY "Certs: select own"  ON public.certifications  FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "Certs: insert own"  ON public.certifications  FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Certs: update own"  ON public.certifications  FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "Certs: delete own"  ON public.certifications  FOR DELETE  USING (auth.uid() = user_id);

CREATE POLICY "Apps: select own"   ON public.job_applications FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "Apps: insert own"   ON public.job_applications FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Apps: update own"   ON public.job_applications FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "Apps: delete own"   ON public.job_applications FOR DELETE  USING (auth.uid() = user_id);

CREATE POLICY "Chats: select own"  ON public.career_chats    FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "Chats: insert own"  ON public.career_chats    FOR INSERT  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Settings: select own" ON public.user_settings FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "Settings: insert own" ON public.user_settings FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Settings: update own" ON public.user_settings FOR UPDATE  USING (auth.uid() = user_id);

-- ── 11. AUTO-UPDATED TIMESTAMPS ───────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at      ON public.profiles;
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON public.job_applications;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
DROP TRIGGER IF EXISTS jobs_updated_at                 ON public.jobs;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 12. AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 13. STORAGE BUCKET FOR RESUMES ────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Resume: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Resume: owner read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── DONE ──────────────────────────────────────────────────────
SELECT 'Database setup complete! All tables created.' AS status;
