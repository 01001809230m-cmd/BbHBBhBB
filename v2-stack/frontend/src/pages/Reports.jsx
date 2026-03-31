import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageLayout from '../components/PageLayout';

const Reports = () => {
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

  const firstName = profile?.full_name?.split(' ')[0] || 'الطالب';

  return (
    <PageLayout profile={profile}>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-teal-950 font-headline mb-2">تقرير الأداء التحليلي</h1>
            <p className="text-on-surface-variant font-medium">مرحباً {firstName}، إليك ملخص لتقدمك الأكاديمي هذا الشهر.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 md:flex-none justify-center items-center gap-2 px-4 py-2 bg-surface-container-lowest text-primary font-bold rounded-xl shadow-sm border border-outline-variant/10 hover:bg-surface-bright transition-all flex">
              <span className="material-symbols-outlined text-xl">file_download</span>
              <span>تحميل التقرير</span>
            </button>
            <button className="flex-1 md:flex-none justify-center items-center gap-2 px-4 py-2 bg-primary text-on-primary font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex">
              <span className="material-symbols-outlined text-xl">calendar_month</span>
              <span>الفترة الحالية</span>
            </button>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-20">
          
          {/* XP Growth Chart (Large Card) */}
          <div className="md:col-span-8 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/5 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                <h2 className="text-lg font-bold text-teal-900 font-headline">تاريخ اكتساب نقاط الخبرة (XP)</h2>
              </div>
              <div className="text-xs text-on-surface-variant flex gap-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> هذا الأسبوع</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-surface-variant"></span> الأسبوع الماضي</span>
              </div>
            </div>
            {/* Mock Bar Chart */}
            <div className="flex items-end justify-between h-48 gap-2 sm:gap-4 px-2 sm:px-4">
              {[
                { label: 'SAT', h1: 'h-24', h2: 'h-3/4' },
                { label: 'SUN', h1: 'h-40', h2: 'h-4/5' },
                { label: 'MON', h1: 'h-32', h2: 'h-2/3' },
                { label: 'TUE', h1: 'h-44', h2: 'h-full' },
                { label: 'WED', h1: 'h-36', h2: 'h-1/2' },
                { label: 'THU', h1: 'h-40', h2: 'h-5/6' },
                { label: 'FRI', h1: 'h-28', h2: 'h-2/5' },
              ].map(day => (
                <div key={day.label} className="flex-1 flex flex-col items-center gap-2">
                  <div className={`w-full bg-primary/20 rounded-t-lg relative group ${day.h1}`}>
                    <div className={`absolute bottom-0 w-full bg-primary rounded-t-lg transition-all ${day.h2}`}></div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rank & Level Progress (Side Card) */}
          <div className="md:col-span-4 bg-gradient-to-br from-teal-900 to-teal-800 rounded-xl p-6 shadow-xl text-white relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-teal-200 text-xs font-bold mb-1">الرتبة الحالية</p>
                  <h3 className="text-2xl font-black font-headline">Curator Elite</h3>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>military_tech</span>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-2">
                  <span>المستوى 12</span>
                  <span>المستوى 13</span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary-fixed w-[72%] rounded-full shadow-[0_0_10px_rgba(163,246,156,0.5)]"></div>
                </div>
                <p className="text-[10px] mt-2 opacity-70 text-center">تبعد 420 XP عن المستوى التالي</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-3 border border-white/5">
                  <p className="text-[10px] opacity-60">المركز العالمي</p>
                  <p className="text-lg font-bold">#142</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 border border-white/5">
                  <p className="text-[10px] opacity-60">سلسلة المذاكرة</p>
                  <p className="text-lg font-bold">12 يوم</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subject performance (Split Cards) */}
          <div className="md:col-span-6 bg-surface-container-low rounded-xl p-6 border-r-4 border-secondary">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-secondary">biotech</span>
                </div>
                <h3 className="font-bold text-teal-900 font-headline">أداء الأحياء (Biology)</h3>
              </div>
              <span className="text-secondary font-bold">88%</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold text-slate-600">
                  <span>علم الوراثة</span>
                  <span>94%</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-[94%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold text-slate-600">
                  <span>البيولوجيا الجزيئية</span>
                  <span>76%</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-[76%]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-6 bg-surface-container-low rounded-xl p-6 border-r-4 border-tertiary">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-tertiary/10 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-tertiary">landscape</span>
                </div>
                <h3 className="font-bold text-teal-900 font-headline">أداء الجيولوجيا (Geology)</h3>
              </div>
              <span className="text-tertiary font-bold">72%</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold text-slate-600">
                  <span>الصخور النارية</span>
                  <span>62%</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary w-[62%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold text-slate-600">
                  <span>الطبقات الرسوبية</span>
                  <span>82%</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary w-[82%]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Test Scores Table (Mid Card) */}
          <div className="md:col-span-8 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/5">
            <h3 className="text-lg font-bold text-teal-900 font-headline mb-6">نتائج الاختبارات الأخيرة</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[500px]">
                <thead>
                  <tr className="text-on-surface-variant text-xs border-b border-slate-100">
                    <th className="pb-3 font-semibold">الاختبار</th>
                    <th className="pb-3 font-semibold text-center">التاريخ</th>
                    <th className="pb-3 font-semibold text-center">الدرجة</th>
                    <th className="pb-3 font-semibold text-center">التريند</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    {name: 'اختبار الأحماض النووية', color: 'bg-secondary', date: '14 أكتوبر', score: '48/50', trendIcon: 'trending_up', trendColor: 'text-secondary'},
                    {name: 'تحليل دورة الصخور', color: 'bg-tertiary', date: '12 أكتوبر', score: '35/50', trendIcon: 'trending_down', trendColor: 'text-error'},
                    {name: 'أساسيات الخلية', color: 'bg-secondary', date: '08 أكتوبر', score: '50/50', trendIcon: 'trending_flat', trendColor: 'text-slate-400'},
                  ].map((row, i) => (
                    <tr key={i} className={i !== 2 ? "border-b border-slate-50" : ""}>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${row.color}`}></div>
                          <span className="font-semibold">{row.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-center text-slate-700">{row.date}</td>
                      <td className="py-4 text-center font-bold text-teal-900">{row.score}</td>
                      <td className="py-4">
                        <div className={`flex justify-center ${row.trendColor}`}>
                          <span className="material-symbols-outlined">{row.trendIcon}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Badges Earned (Small Card) */}
          <div className="md:col-span-4 bg-white rounded-xl p-6 shadow-sm border border-outline-variant/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-teal-900 font-headline">الأوسمة المكتسبة</h3>
              <button className="text-xs text-primary font-bold hover:underline">عرض الكل</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-3 bg-surface-container-low rounded-xl group transition-all hover:bg-primary/5">
                <div className="w-12 h-12 bg-gradient-to-tr from-amber-400 to-yellow-200 rounded-full flex items-center justify-center shadow-inner mb-2">
                  <span className="material-symbols-outlined text-white text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center">أسرع متعلم</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-surface-container-low rounded-xl">
                <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-teal-300 rounded-full flex items-center justify-center shadow-inner mb-2">
                  <span className="material-symbols-outlined text-white text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>menu_book</span>
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center">قارئ نهم</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-surface-container-low rounded-xl opacity-40 grayscale">
                <div className="w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center shadow-inner mb-2">
                  <span className="material-symbols-outlined text-white text-2xl">trophy</span>
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center">البطل المحلي</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-surface-container-low rounded-xl opacity-40 grayscale">
                <div className="w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center shadow-inner mb-2">
                  <span className="material-symbols-outlined text-white text-2xl">science</span>
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center">خبير المعامل</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Quote Area */}
        <div className="mt-12 p-6 md:p-8 bg-surface-container-highest/30 rounded-2xl border border-dashed border-teal-200 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 text-center sm:text-right">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-surface-container-high flex items-center justify-center text-4xl">
              💎
            </div>
          </div>
          <div>
            <h4 className="text-xl font-bold text-teal-900 font-headline mb-2 italic">"الجيولوجيا ليست مجرد دراسة للصخور، بل هي تاريخ كوكبنا المكتوب في طبقات الأرض."</h4>
            <p className="text-sm text-on-surface-variant">— نصيحة الأستاذ لهذا الأسبوع: ركز على الربط بين العمليات التكتونية وتكوين الجبال في الفصل الرابع.</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Reports;
