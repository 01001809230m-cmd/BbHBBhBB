-- 1. ADDDING ADMIN ROLE
-- Run this in the Supabase SQL Editor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- To set yourself as admin, run:
-- UPDATE profiles SET is_admin = true WHERE email = 'your_email@example.com';

-- 2. ENABLING ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES FOR PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin sees all profiles" ON profiles;
CREATE POLICY "Admin sees all profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. POLICIES FOR VIDEOS (Only enrolled students can see videos of a course)
DROP POLICY IF EXISTS "Enrolled students see videos" ON videos;
CREATE POLICY "Enrolled students see videos" ON videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE student_id = auth.uid() AND course_id = videos.course_id
    )
    OR EXISTS (SELECT 1 FROM courses WHERE id = videos.course_id AND is_free = true)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 5. POLICIES FOR NOTIFICATIONS (Student sees own or global)
DROP POLICY IF EXISTS "Users see own and global notifications" ON notifications;
CREATE POLICY "Users see own and global notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid() OR type = 'global' OR user_id IS NULL);

-- 6. RPC: CHECK PHONE EXISTS (Used during login/signup)
CREATE OR REPLACE FUNCTION check_phone_exists(phone_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE phone = phone_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated/anon for the check_phone_exists function
GRANT EXECUTE ON FUNCTION check_phone_exists TO authenticated, anon;
