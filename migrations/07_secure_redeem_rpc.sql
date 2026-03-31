-- ==========================================================
-- المرحلة السابعة: برمجة دالة قاعدة البيانات لتفعيل الأكواد بأمان
-- Function: secure_redeem_code
-- ==========================================================

CREATE OR REPLACE FUNCTION public.secure_redeem_code(p_code text, p_course_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record RECORD;
BEGIN
  -- 1. التأكد من أن الكود موجود
  SELECT * INTO v_code_record FROM public.coupon_codes WHERE code = p_code;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'الكود غير صحيح أو غير موجود.');
  END IF;

  -- 2. التأكد من أن الكود غير مستخدم
  IF v_code_record.is_used THEN
    RETURN json_build_object('success', false, 'message', 'عذراً، هذا الكود تم استخدامه من قبل.');
  END IF;

  -- 3. التأكد من أن الكود يشمل هذا الكورس
  -- إما أن يكون هو الكورس الأساسي (course_id) أو موجود بداخل باقة (course_ids)
  IF p_course_id != v_code_record.course_id AND NOT (p_course_id = ANY(v_code_record.course_ids)) THEN
    RETURN json_build_object('success', false, 'message', 'هذا الكود غير صالح لهذا الكورس بالذات.');
  END IF;

  -- 4. إعطاء الصلاحية للطالب (Insert Enrollment)
  -- إذا كان الطالب مسجل مسبقاً، سيتجاهل الخطأ (DO NOTHING)
  INSERT INTO public.enrollments (student_id, course_id, payment_method)
  VALUES (auth.uid(), p_course_id, 'كود')
  ON CONFLICT (student_id, course_id) DO NOTHING;

  -- 5. إبطال الكود (تحديث الحالة)
  UPDATE public.coupon_codes 
  SET is_used = true, used_by = auth.uid(), used_at = now()
  WHERE code = p_code;

  -- 6. إرسال رد النجاح للفرونت إند
  RETURN json_build_object('success', true, 'message', 'تم تفعيل الكورس بنجاح!');
END;
$$;
