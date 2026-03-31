import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageLayout from '../components/PageLayout';

const Quizzes = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <PageLayout profile={profile}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Performance Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Score Card */}
            <div className="lg:col-span-2 bg-primary rounded-[2rem] p-8 text-on-primary flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
              <div className="relative z-10 text-center md:text-right">
                <h3 className="text-2xl font-bold mb-2 font-headline">ملخص الأداء العلمي</h3>
                <p className="opacity-80 max-w-xs mb-6">أداءك ممتاز هذا الشهر! لقد تجاوزت 85% من الطلاب في وحدات الجيولوجيا.</p>
                <div className="flex gap-4 justify-center md:justify-start">
                  <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                    <p className="text-xs opacity-70">المعدل العام</p>
                    <p className="text-xl font-bold">92%</p>
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                    <p className="text-xs opacity-70">اختبارات مكتملة</p>
                    <p className="text-xl font-bold">24</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex justify-center relative z-10">
                <div className="w-40 h-40 rounded-full border-[12px] border-white/10 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-[12px] border-secondary-fixed border-t-transparent -rotate-45"></div>
                  <span className="text-4xl font-black font-headline">A+</span>
                </div>
              </div>
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>
            </div>

            {/* Secondary Stats */}
            <div className="bg-surface-container-lowest rounded-[2rem] p-6 shadow-sm border border-outline-variant/15 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="p-3 bg-tertiary-fixed rounded-2xl text-tertiary">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>analytics</span>
                  </span>
                  <span className="text-xs font-bold text-secondary bg-secondary-container px-3 py-1 rounded-full">+12% تحسن</span>
                </div>
                <h4 className="font-bold text-lg text-teal-900 mb-1 font-headline">نقاط القوة</h4>
                <p className="text-sm text-slate-700">الوحدة الثانية: علم الأحياء الخلوي</p>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-600">التقدم نحو الهدف السنوي</span>
                  <span className="font-bold text-teal-900">75%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-3/4 rounded-full"></div>
                </div>
              </div>
            </div>
          </section>

          {/* Filters & Sorting */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-8">
            <div className="flex bg-surface-container rounded-2xl p-1.5 w-full md:w-auto">
              <button className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white text-teal-900 shadow-sm transition-all">الاختبارات القادمة</button>
              <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:text-teal-700 transition-all">المكتملة</button>
              <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:text-teal-700 transition-all">الفائتة</button>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input className="w-full pr-10 pl-4 py-2.5 bg-white border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 shadow-sm outline-none" placeholder="البحث عن اختبار..." type="text"/>
              </div>
            </div>
          </div>

          {/* Exam List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Exam Card 1: Active */}
            <div className="group bg-surface-container-lowest rounded-[2rem] p-6 border border-outline-variant/15 hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-300 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-secondary/10 p-3 rounded-2xl text-secondary">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>biotech</span>
                </div>
                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase tracking-wider">In Progress</span>
              </div>
              <div className="mb-6">
                <h4 className="text-xl font-bold text-teal-900 mb-2 group-hover:text-primary transition-colors font-headline">Biology Chapter 1 Quiz</h4>
                <p className="text-sm text-slate-700 font-medium">مراجعة شاملة للوحدة الأولى: تركيب الخلية ووظائفها.</p>
              </div>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">schedule</span><span>45 دقيقة</span></div>
                  <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">event</span><span>اليوم، 04:00 م</span></div>
                </div>
                <button className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-container transition-all flex items-center justify-center gap-2 group/btn">
                    ابدأ الاختبار الآن
                    <span className="material-symbols-outlined text-lg group-hover/btn:-translate-x-1 transition-transform">arrow_back</span>
                </button>
              </div>
            </div>

            {/* Exam Card 2: Upcoming */}
            <div className="group bg-surface-container-lowest rounded-[2rem] p-6 border border-outline-variant/15 hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-300 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-tertiary/10 p-3 rounded-2xl text-tertiary">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>landscape</span>
                </div>
                <span className="px-3 py-1 bg-surface-container-highest text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Upcoming</span>
              </div>
              <div className="mb-6">
                <h4 className="text-xl font-bold text-teal-900 mb-2 group-hover:text-primary transition-colors font-headline">Sedimentary Rocks Analysis</h4>
                <p className="text-sm text-slate-500">اختبار تجريبي يركز على أنواع الصخور الرسوبية وتحليل الطبقات الأرضية.</p>
              </div>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">schedule</span><span>60 دقيقة</span></div>
                  <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">event</span><span>غداً، 10:00 ص</span></div>
                </div>
                <button className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl cursor-not-allowed flex items-center justify-center gap-2">
                    مغلق حالياً
                    <span className="material-symbols-outlined text-lg">lock</span>
                </button>
              </div>
            </div>

            {/* Exam Card 3: Finished */}
            <div className="group bg-surface-container-low/50 rounded-[2rem] p-6 border border-outline-variant/15 transition-all duration-300 flex flex-col opacity-80 hover:opacity-100">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-secondary/10 p-3 rounded-2xl text-secondary">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>biotech</span>
                </div>
                <span className="px-3 py-1 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full uppercase tracking-wider">Finished</span>
              </div>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xl font-bold text-teal-900 font-headline">Genetic Foundations</h4>
                  <span className="text-xl font-black text-secondary">98%</span>
                </div>
                <p className="text-sm text-slate-500">اختبار الوحدة الثالثة: الوراثة والجينات البشرية.</p>
              </div>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">check_circle</span><span>اكتمل في 12 أكتوبر</span></div>
                </div>
                <button className="w-full py-4 border-2 border-primary text-primary font-bold rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2">
                    مراجعة النتائج
                    <span className="material-symbols-outlined text-lg">visibility</span>
                </button>
              </div>
            </div>

            {/* Exam Card 4: Missed */}
            <div className="group bg-surface-container-lowest rounded-[2rem] p-6 border border-outline-variant/15 hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-300 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>experiment</span>
                </div>
                <span className="px-3 py-1 bg-error-container text-on-error-container text-[10px] font-bold rounded-full uppercase tracking-wider">Missed</span>
              </div>
              <div className="mb-6">
                <h4 className="text-xl font-bold text-teal-900 mb-2 font-headline">Lab Safety Standards</h4>
                <p className="text-sm text-slate-500">اختبار السلامة المعملية - متطلب أساسي لدخول المعمل.</p>
              </div>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-4 text-xs text-error">
                  <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">warning</span><span>فاتك الموعد النهائي</span></div>
                </div>
                <button className="w-full py-4 bg-tertiary text-white font-bold rounded-2xl hover:bg-tertiary-container transition-all flex items-center justify-center gap-2">
                    طلب إعادة محاولة
                </button>
              </div>
            </div>

            {/* Empty State / Add Suggestion */}
            <div className="border-2 border-dashed border-outline-variant rounded-[2rem] p-6 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-primary transition-all">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-3xl text-slate-300 group-hover:text-primary">add_task</span>
              </div>
              <h4 className="font-bold text-slate-400 group-hover:text-teal-900 font-headline">جدولة اختبار دراسي خاص</h4>
              <p className="text-xs text-slate-400 mt-2">يمكنك إنشاء اختبار مخصص لمراجعة نقاط ضعفك</p>
            </div>
          </div>
        </div>
    </PageLayout>
  );
};

export default Quizzes;
