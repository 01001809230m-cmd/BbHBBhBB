-- ==========================================
-- منصة أ. محمد زايد - التحديثات الجديدة لـ Supabase
-- ==========================================

-- 1. تحديث جدول المستخدمين (Profiles) لدعم السنة الدراسية والهاتف الإضافي وتفضيلات الإشعارات
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS parent_phone TEXT,
ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT 'الصف الثالث الثانوي',
ADD COLUMN IF NOT EXISTS notify_lessons BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_exams BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_achievements BOOLEAN DEFAULT true;

-- ==========================================
-- 2. جداول الاختبارات (Quizzes System)
-- ==========================================

-- جدول الاختبارات الرئيسية
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT DEFAULT 'draft', -- 'draft', 'published'
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الأسئلة بداخل كل اختبار
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- مثال: ["أ", "ب", "ج", "د"]
    correct_option_index INTEGER NOT NULL,
    marks INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0
);

-- جدول محاولات الطالب (Student Attempts)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'in_progress' -- 'in_progress', 'completed', 'missed'
);

-- ==========================================
-- 3. جداول التقارير والإنجازات (Reports & Gamification)
-- ==========================================

-- جدول نقاط الخبرة (XP) والتطور
CREATE TABLE IF NOT EXISTS public.student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    rank_title TEXT DEFAULT 'Beginner',
    last_study_date TIMESTAMP WITH TIME ZONE
);

-- جدول الأوسمة (Badges/Achievements)
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    icon_name TEXT NOT NULL, -- اسم الأيقونة (مثال: 'bolt')
    required_xp INTEGER DEFAULT 0,
    required_quizzes INTEGER DEFAULT 0
);

-- ربط الأوسمة بالطلاب
CREATE TABLE IF NOT EXISTS public.student_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, badge_id)
);

-- ==========================================
-- الـ RLS Policies (أذونات الوصول لحماية البيانات)
-- ==========================================

-- تفعيل RLS للجداول الجديدة
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- 1. الاختبارات يراها الجميع إذا كانت منشورة
CREATE POLICY "Students can view published quizzes" ON public.quizzes
    FOR SELECT USING (status = 'published');

-- 2. الأسئلة يراها الطلاب فقط للاختبارات التي يمتحنونها (أو بشكل عام إذا كانت منشورة)
CREATE POLICY "Students can view questions for published quizzes" ON public.quiz_questions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id AND status = 'published')
    );

-- 3. الطالب يرى محاولات نفسه فقط
CREATE POLICY "Students can view own attempts" ON public.quiz_attempts
    FOR SELECT USING (auth.uid() = student_id);
    
CREATE POLICY "Students can insert own attempts" ON public.quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = student_id);
    
CREATE POLICY "Students can update own attempts" ON public.quiz_attempts
    FOR UPDATE USING (auth.uid() = student_id);

-- 4. الطالب يرى تقاريره وإنجازاته الخاصة
CREATE POLICY "Students can view own progress" ON public.student_progress
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can view own badges" ON public.student_badges
    FOR SELECT USING (auth.uid() = student_id);
