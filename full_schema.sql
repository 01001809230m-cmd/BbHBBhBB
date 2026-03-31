-- ======================================================
-- 🚀 Full Database Schema - Educational Platform (11/10 Standard)
-- 🏢 Purpose: Complete Rebuild for Security, Performance & Scalability
-- ======================================================

-- 1. Extensions (Required for UUID and searching)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS (For standardized roles and types)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('active', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. USERS & PROFILES
-- We keep compatibility with Supabase but extend with custom fields
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Linked to auth.users if using Supabase
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    parent_phone VARCHAR(20),
    academic_year VARCHAR(100) DEFAULT 'الصف الثالث الثانوي',
    role user_role DEFAULT 'student',
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_banned BOOLEAN DEFAULT FALSE,
    xp_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- 4. COURSES
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_free BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. VIDEOS (The Core Security Layer)
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    youtube_video_id VARCHAR(100) NOT NULL, -- Hidden from unauthorized frontend requests
    video_url TEXT, -- In case of other sources (Vimeo/Direct)
    source_type VARCHAR(20) DEFAULT 'youtube', -- 'youtube', 'vimeo', 'meet'
    order_index INTEGER NOT NULL,
    attachment_url TEXT, -- PDF for the lesson
    chapters_json JSONB DEFAULT '[]', -- [{ "time": 0, "title": "Intro" }]
    view_limit INTEGER DEFAULT 3, -- Max allowed views per user
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_videos_course ON public.videos(course_id);
CREATE INDEX idx_videos_order ON public.videos(course_id, order_index);

-- 6. ENROLLMENTS & ACCESS
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT TRUE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    UNIQUE(user_id, course_id)
);

-- 7. PROGRESS TRACKING (Heartbeat Data)
CREATE TABLE IF NOT EXISTS public.video_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    last_position INTEGER DEFAULT 0, -- Time in seconds
    is_completed BOOLEAN DEFAULT FALSE,
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    view_count INTEGER DEFAULT 1,
    UNIQUE(user_id, video_id)
);

-- 8. SECURITY: DEVICE TRACKING (Fingerprinting)
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL, -- Fingerprint from browser
    device_name VARCHAR(255), -- User-Agent parsed name
    ip_address VARCHAR(50),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status session_status DEFAULT 'active',
    UNIQUE(user_id, device_id)
);

-- 9. AUDIT LOGS (Admin actions & suspicious activity)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL, -- 'BAN_USER', 'PROMOTE_ADMIN', 'VIDEO_SHARING_DETECTED'
    performed_by UUID REFERENCES public.profiles(id),
    target_user UUID REFERENCES public.profiles(id),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. MESSAGES & FEEDBACK
CREATE TABLE IF NOT EXISTS public.student_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id),
    video_title TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. QUIZZES SYSTEM
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    duration_minutes INTEGER DEFAULT 60,
    pass_mark INTEGER DEFAULT 50,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published'
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- ["Alt A", "Alt B"]
    correct_option_index INTEGER NOT NULL,
    marks INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'in_progress' -- 'in_progress', 'completed'
);

-- 12. TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ======================================================
-- 🔐 Row Level Security (RLS) - Example Policies
-- ======================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Courses: Read access if published or enrolled
CREATE POLICY "Public can view published courses" ON public.courses
    FOR SELECT USING (is_published = TRUE);

-- Enrollments: Only students see their own data
CREATE POLICY "Students can view own enrollments" ON public.enrollments
    FOR SELECT USING (auth.uid() = user_id);

-- Videos: Special policy - user must be enrolled to see video details
CREATE POLICY "Enrolled students can view videos" ON public.videos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.enrollments 
            WHERE user_id = auth.uid() AND course_id = videos.course_id AND active = TRUE
        )
    );
