-- مسح الجداول السابقة إن وجدت لإعادة الضبط (احذر، سيمسح البيانات)
-- تأكد من تشغيل هذا الكود في واجهة الـ SQL Editor لـ Supabase (مشروع: nekwsfuxfpshbuzttrnb)

-- إلغاء أوامر الإنشاء إذا كانت موجودة مسبقًا:
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.video_progress CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Profiles (Extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'super_admin')),
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_profiles_email ON public.profiles(email);

-- 2. Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Videos
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  youtube_video_id VARCHAR(50) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  view_limit INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_videos_course ON public.videos(course_id);

-- 4. Enrollments (الحالة الشرائية)
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_id)
);
CREATE INDEX idx_enrollments_user ON public.enrollments(user_id);

-- 5. Video Progress (عداد مرات المشاهدة للمستخدم)
CREATE TABLE public.video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 1,
  last_position INTEGER DEFAULT 0,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, video_id)
);

-- 6. Audit Logs (سجلات الحماية والاختراق)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  target_user UUID REFERENCES public.profiles(id),
  ip_address VARCHAR(50),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- الأمان القاسي: لا أحد يستطيع تعديل البيانات من الواجهة الأمامية تماما (Service Role هو الآمر الوحيد)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- تنبيه: لا توجد Policies للقراءة والكتابة، لأننا نعتمد بنسبة 100٪ على الـ Backend للقيام بذلك
