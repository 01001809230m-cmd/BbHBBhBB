import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import PageLayout from '../components/PageLayout';

const MySwal = withReactContent(Swal);

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Settings State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setUser(user);

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (p) {
        if (p.is_banned) {
          await supabase.auth.signOut();
          navigate('/login'); return;
        }
        setProfile(p);
        setFullName(p.full_name || '');
        setPhone(p.phone || '');
        setParentPhone(p.parent_phone || '');
        setAcademicYear(p.academic_year || 'الصف الثالث الثانوي');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: fullName,
        phone: phone,
        parent_phone: parentPhone || null,
        academic_year: academicYear
      }).eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, full_name: fullName, phone, parent_phone: parentPhone, academic_year: academicYear });
      MySwal.fire({
        icon: 'success',
        title: 'تم الحفظ',
        text: 'تم تحديث بياناتك بنجاح',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      MySwal.fire({
        icon: 'error',
        title: 'خطأ',
        text: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  const avatarLetter = profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'ط';

  return (
    <PageLayout profile={profile}>
        <div className="max-w-5xl mx-auto space-y-12 pb-20">
          
          {/* Profile Section */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <h3 className="text-2xl font-bold font-headline text-on-surface mb-2">الملف الشخصي</h3>
                <p className="text-on-surface-variant text-sm">أدر معلوماتك الشخصية وكيفية ظهورك للآخرين.</p>
              </div>
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-6 py-2 border border-outline/20 text-primary font-bold rounded-xl hover:bg-surface-container-low transition-colors disabled:opacity-50">
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col items-center justify-center gap-4 group cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-32 h-32 rounded-full ring-4 ring-primary/5 relative bg-primary flex items-center justify-center text-white text-6xl font-black">
                  {avatarLetter}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-white">
                    <span className="material-symbols-outlined">edit</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary">تغيير الصورة (غير مفعل)</span>
              </div>
              
              <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant px-1">الاسم الكامل</label>
                    <input 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-surface p-4 rounded-xl border-none focus:ring-2 focus:ring-primary-fixed text-on-surface font-medium outline-none" 
                      type="text" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant px-1">السنة الدراسية</label>
                    <select 
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full bg-surface p-4 rounded-xl border-none focus:ring-2 focus:ring-primary-fixed text-on-surface font-medium outline-none appearance-none cursor-pointer">
                      <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                      <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                      <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant px-1">رقم الهاتف</label>
                    <input 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-surface p-4 rounded-xl border-none focus:ring-2 focus:ring-primary-fixed text-on-surface font-medium outline-none text-left" 
                      dir="ltr" 
                      type="tel" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant px-1">رقم هاتف ولي الأمر</label>
                    <input 
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="w-full bg-surface p-4 rounded-xl border-none focus:ring-2 focus:ring-primary-fixed text-on-surface font-medium outline-none text-left" 
                      dir="ltr" 
                      placeholder="أدخل رقم ولي الأمر" 
                      type="tel" 
                    />
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant italic mt-4">* البريد الإلكتروني (لا يمكن تغييره): <span className="font-bold">{user?.email}</span></p>
              </div>

            </div>
          </section>

          {/* Notifications Toggles Section (Mock UI) */}
          <section>
            <h3 className="text-2xl font-bold font-headline text-on-surface mb-8">التنبيهات</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'تحديثات الدروس', sub: 'إشعارات عند إضافة محتوى جديد', icon: 'library_books', color: 'secondary' },
                { title: 'مواعيد الاختبارات', sub: 'تذكير بالاختبارات القادمة', icon: 'alarm', color: 'tertiary' },
                { title: 'تنبيهات الإنجازات', sub: 'عند الحصول على وسام جديد', icon: 'emoji_events', color: 'primary' }
              ].map((item, i) => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant/10 p-6 rounded-xl flex items-center justify-between group hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-sm">{item.title}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={i !== 2} />
                    <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* Security Area */}
          <section>
            <h3 className="text-2xl font-bold font-headline text-on-surface mb-8">الأمان والخصوصية</h3>
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
              <div className="p-6 md:p-8 border-b border-surface">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h4 className="font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">lock</span>
                        كلمة المرور
                    </h4>
                    <p className="text-sm text-on-surface-variant mt-1">قم بتحديث كلمة المرور بانتظام للحفاظ على أمان حسابك.</p>
                  </div>
                  <button className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm w-full md:w-auto">تغيير كلمة المرور</button>
                </div>
              </div>
              <div className="p-6 md:p-8 bg-surface/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h4 className="font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary">verified_user</span>
                      المصادقة الثنائية (2FA)
                    </h4>
                    <p className="text-sm text-on-surface-variant mt-1">أضف طبقة أمان إضافية لحسابك باستخدام هاتفك المحمول.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className="text-xs font-bold text-on-error-container bg-error-container px-3 py-1 rounded-full whitespace-nowrap">غير مفعل</span>
                    <button className="w-full md:w-auto px-6 py-2.5 border border-primary/20 text-primary rounded-xl font-bold text-sm hover:bg-white transition-colors">تفعيل الآن</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="pt-8 border-t border-outline-variant/20">
            <div className="bg-error-container/10 p-6 md:p-8 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-error-container/30">
              <div>
                <h4 className="font-bold text-error flex items-center gap-2">
                    <span className="material-symbols-outlined">delete_forever</span>
                    حذف الحساب
                </h4>
                <p className="text-sm text-on-surface-variant mt-1">بمجرد حذف حسابك، لن تتمكن من استعادة أي من بياناتك أو تقدمك الدراسي.</p>
              </div>
              <button className="px-6 py-2.5 text-error font-bold text-sm hover:bg-error/10 rounded-xl transition-colors w-full md:w-auto">حذف الحساب نهائياً</button>
            </div>
          </section>

        </div>
    </PageLayout>
  );
};

export default Settings;
