-- ==========================================================
-- إصلاح نهائي لجدول Profiles بناءً على بنية الجدول الحالية لديك
-- ==========================================================

-- 1. التأكد من أن عمود full_name يقبل قيم افتراضية ولا يسبب خطأ
ALTER TABLE public.profiles ALTER COLUMN full_name SET DEFAULT 'طالب جديد';
-- إذا كان العمود name موجوداً من المحاولات السابقة، يمكن حذفه أو تركه، سنستخدم full_name كما يطلب الخطأ
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- 2. تحديث الدالة لتستخدم full_name بدلاً من name
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'طالب جديد'), 
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إعادة تعيين الترجر
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. إصلاح البوليصي
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. مزامنة الحسابات التي لم ترحل (باستخدام full_name)
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', 'طالب جديد'), 'student'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
