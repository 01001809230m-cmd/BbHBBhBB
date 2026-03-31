-- ==========================================================
-- حل جذري لجميع مشاكل لوحة التحكم (الداش بورد) مع RLS
-- ==========================================================

-- 1. دالة ذكية وسريعة للتحقق مما إذا كان المستخدم الحالي أدمن أو سوبر أدمن
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. فتح صلاحيات القراءة للجميع (طلاب أو زوار)
-- كورسات
DROP POLICY IF EXISTS "Anyone can read courses" ON public.courses;
CREATE POLICY "Anyone can read courses" ON public.courses FOR SELECT USING (true);

-- فيديوهات
DROP POLICY IF EXISTS "Anyone can read videos" ON public.videos;
CREATE POLICY "Anyone can read videos" ON public.videos FOR SELECT USING (true);

-- 3. إعطاء الصلاحية المطلقة للأدمن بإنشاء وتعديل وحذف كل شيء (لتحل مشكلة الداش بورد)
-- الكورسات (Courses)
DROP POLICY IF EXISTS "Admins have full access to courses" ON public.courses;
CREATE POLICY "Admins have full access to courses" ON public.courses FOR ALL USING (public.is_admin());

-- الفيديوهات (Videos)
DROP POLICY IF EXISTS "Admins have full access to videos" ON public.videos;
CREATE POLICY "Admins have full access to videos" ON public.videos FOR ALL USING (public.is_admin());

-- الاشتراكات (Enrollments)
DROP POLICY IF EXISTS "Admins have full access to enrollments" ON public.enrollments;
CREATE POLICY "Admins have full access to enrollments" ON public.enrollments FOR ALL USING (public.is_admin());
-- السماح للطالب برؤية اشتراكاته فقط
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.enrollments;
CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);

-- سجل المشاهدة (Video Progress)
DROP POLICY IF EXISTS "Admins have full access to progress" ON public.video_progress;
CREATE POLICY "Admins have full access to progress" ON public.video_progress FOR ALL USING (public.is_admin());
-- السماح للطالب برؤية وتعديل سجل مشاهداته
DROP POLICY IF EXISTS "Students can access own progress" ON public.video_progress;
CREATE POLICY "Students can access own progress" ON public.video_progress FOR ALL USING (auth.uid() = user_id);

-- 4. إعطاء الأدمن القدرة على قراءة وتعديل حسابات الطلاب (لتمكينه من رؤية الطلاب في لوحة التحكم)
DROP POLICY IF EXISTS "Admins can view and edit all profiles" ON public.profiles;
CREATE POLICY "Admins can view and edit all profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- 5. سجل الأمان (Audit Logs) - للأدمن فقط
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin());
