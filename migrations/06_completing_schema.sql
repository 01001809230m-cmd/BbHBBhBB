-- ==========================================================
-- المرحلة السادسة: استكمال الجداول الناقصة بناءً على الطلبات الجديدة
-- جداول: الأكواد (coupon_codes) والفضفضة (student_messages)
-- ==========================================================

-- 1. جدول أكواد الباقات والكوبونات (coupon_codes)
CREATE TABLE IF NOT EXISTS public.coupon_codes (
  code VARCHAR(50) PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  course_ids UUID[] DEFAULT ARRAY[]::UUID[], -- الباقات (أكثر من كورس)
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES public.profiles(id),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id)
);

-- 2. جدول صندوق الفضفضة والرسائل (student_messages)
CREATE TABLE IF NOT EXISTS public.student_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  video_title VARCHAR(500),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- إعدادات الأمان RLS لهذه الجداول
-- ==========================================================
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_messages ENABLE ROW LEVEL SECURITY;

-- الصلاحيات لجدول الأكواد (coupon_codes)
DROP POLICY IF EXISTS "Admins have full access to codes" ON public.coupon_codes;
CREATE POLICY "Admins have full access to codes" ON public.coupon_codes
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can select codes for checking" ON public.coupon_codes;
CREATE POLICY "Anyone can select codes for checking" ON public.coupon_codes
  FOR SELECT USING (true); -- يُسمح للفرونت إند الاستعلام عن صحة الكود

-- الصلاحيات لجدول الفضفضة (student_messages)
DROP POLICY IF EXISTS "Admins can read all messages" ON public.student_messages;
CREATE POLICY "Admins can read all messages" ON public.student_messages
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Students can insert messages" ON public.student_messages;
CREATE POLICY "Students can insert messages" ON public.student_messages
  FOR INSERT WITH CHECK (auth.uid() = student_id);
