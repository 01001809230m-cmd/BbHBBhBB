-- =========================================================================
-- ترقيع الجداول (Schema Patch) لمطابقتها مع واجهة المتصفح (الفرونت إند)
-- السكربت السابق كان يركز على الحماية الصارمة، مما أدى لحذف بعض الأعمدة المتوقعة
-- =========================================================================

-- 1. إصلاح جدول الكورسات (Courses)
-- الواجهة ترسل (is_free, order_index) ولا ترسل (created_by)، لذلك سنجعل قاعدة البيانات تملأ (created_by) أوتوماتيكياً
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

ALTER TABLE public.courses
ALTER COLUMN created_by DROP NOT NULL,
ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 2. إصلاح جدول الفيديوهات (Videos)
-- الواجهة ترسل (source_type, video_url, attachment_url) وليس (youtube_video_id)
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'youtube',
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- مسح متطلب youtube_video_id لجعله اختيارياً حتى لا يتم رفض البيانات القادمة من الواجهة
ALTER TABLE public.videos
ALTER COLUMN youtube_video_id DROP NOT NULL;
