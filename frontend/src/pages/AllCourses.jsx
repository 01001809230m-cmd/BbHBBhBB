import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import PageLayout from '../components/PageLayout';

const MySwal = withReactContent(Swal);

// Utility component to fetch video poster 
const CoursePoster = ({ course }) => {
  const [posterUrl, setPosterUrl] = useState(course.image_url);

  useEffect(() => {
    if (!course.image_url) {
      const fetchFirstVideo = async () => {
        const { data } = await supabase.from('videos').select('video_url, source_type').eq('course_id', course.id).limit(1);
        if (data && data.length > 0 && data[0].source_type === 'youtube') {
          let fId = data[0].video_url.split('v=')[1] || data[0].video_url.split('/').pop();
          fId = fId.split('&')[0];
          setPosterUrl(`https://img.youtube.com/vi/${fId}/hqdefault.jpg`);
        } else {
          setPosterUrl(`https://via.placeholder.com/400x500/101f22/20d3ee?text=Course`);
        }
      };
      fetchFirstVideo();
    }
  }, [course]);

  return (
    <div className="absolute inset-0 w-full h-full p-2 bg-gradient-to-b from-surface to-surface-container-low transition-transform duration-700 group-hover:scale-[1.03]">
      <div className="w-full h-full rounded-3xl overflow-hidden relative shadow-inner">
        <img className="object-cover w-full h-full filter saturate-[1.1] contrast-100" src={posterUrl} alt={course.title} loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10"></div>
      </div>
    </div>
  );
};

const AllCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ enrolledCount: 0, watchedCount: 0, completedCount: 0, percent: 0 });
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [codeInputValue, setCodeInputValue] = useState('');
  const [targetCodeCourseId, setTargetCodeCourseId] = useState(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { navigate('/login'); return; }
      setUser(user);

      // Run queries independently so one failure doesn't crash everything
      const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const coursesRes = await supabase.from('courses').select('*').order('order_index', { ascending: true });
      const enrollRes  = await supabase.from('enrollments').select('course_id').eq('student_id', user.id);

      if (profileRes.data) {
        const p = profileRes.data;
        if (p.is_banned) {
          await supabase.auth.signOut();
          MySwal.fire({ icon: 'error', title: 'تم حظر حسابك! 🚫', allowOutsideClick: false });
          navigate('/login'); return;
        }
        setProfile(p);
      }

      const cData = coursesRes.data || [];
      const eIds  = (enrollRes.data || []).map(e => e.course_id);
      setCourses(cData);
      setEnrolledIds(eIds);

      if (eIds.length > 0) {
        await calculateStats(user.id, eIds, cData);
      }
    } catch (err) {
      console.error('AllCourses loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async (userId, eIds, allCourses) => {
    if (eIds.length === 0) { setStats({ enrolledCount: 0, watchedCount: 0, completedCount: 0, percent: 0 }); return; }
    const [videosCountRes, watchedRes, allVideosRes] = await Promise.all([
      supabase.from('videos').select('*', { count: 'exact', head: true }).in('course_id', eIds),
      supabase.from('video_progress').select('video_id').eq('user_id', userId),
      supabase.from('videos').select('id, course_id').in('course_id', eIds)
    ]);
    const totalVideos = videosCountRes.count || 0;
    const watchedData = watchedRes.data || [];
    const watchedCount = watchedData.length;
    const watchedVideoIds = watchedData.map(w => w.video_id);
    const allVideos = allVideosRes.data || [];
    let completedCount = 0;
    eIds.forEach(courseId => {
      const cv = allVideos.filter(v => v.course_id === courseId);
      if (cv.length > 0 && cv.every(v => watchedVideoIds.includes(v.id))) completedCount++;
    });
    const percent = totalVideos === 0 ? 0 : Math.round((watchedCount / totalVideos) * 100);
    setStats({ enrolledCount: eIds.length, watchedCount, completedCount, percent });
  };

  const initiatePaymobPayment = async (courseId, courseTitle, price) => {
    MySwal.fire({ title: '💳 جاري التواصل مع الخادم الآمن', didOpen: () => MySwal.showLoading() });
    try {
      const firstName = profile?.full_name?.split(' ')[0] || 'Student';
      const lastName = profile?.full_name?.split(' ').slice(1).join(' ') || 'User';
      const billingData = {
        email: user?.email || 'test@student.com', first_name: firstName, last_name: lastName,
        phone_number: profile?.phone || '+201000000000', floor: 'NA', apartment: 'NA', street: 'NA',
        building: 'NA', shipping_method: 'NA', postal_code: 'NA', city: 'Cairo', country: 'EG', state: 'NA'
      };
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/paymob/initiate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, title: courseTitle, price, billingData, userId: user?.id })
      });
      const data = await res.json();
      if (!data.success || !data.iframeUrl) throw new Error(data.error || 'خطأ من الخادم');
      localStorage.setItem('pendingCourseId', courseId);
      window.location.href = data.iframeUrl;
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'خطأ في الدفع', text: err.message });
    }
  };

  const openCodeModal = (id) => { if (!user) return; setTargetCodeCourseId(id); setCodeInputValue(''); setCodeModalVisible(true); };

  const executeRedeemCode = async () => {
    if (!codeInputValue.trim()) return;
    setIsRedeeming(true);
    const { data, error } = await supabase.rpc('secure_redeem_code', { p_code: codeInputValue.trim(), p_course_id: targetCodeCourseId });
    setIsRedeeming(false);
    if (error) return MySwal.fire({ title: '❌ خطأ', text: 'حدث خطأ بالاتصال بالخادم.', icon: 'error', confirmButtonText: 'حسناً' });
    if (data.success) {
      setCodeModalVisible(false);
      MySwal.fire({ title: '🎉 مبروك!', text: data.message, icon: 'success', confirmButtonText: 'رائع', confirmButtonColor: '#1b6d24' });
      loadData();
    } else {
      MySwal.fire({ title: '⚠️ تنبيه', text: data.message, icon: 'warning', confirmButtonText: 'حسناً' });
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'الطالب';

  if (loading) return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4 z-50">
      <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-primary font-bold text-lg">جاري التحميل...</p>
    </div>
  );

  const filteredCourses = courses.filter(c => {
    const matchSearch = !searchTerm || c.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'enrolled' && enrolledIds.includes(c.id)) || (filter === 'free' && c.is_free);
    return matchSearch && matchFilter;
  });


  return (
    <PageLayout profile={profile}>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-container p-8 text-white shadow-xl shadow-primary/20 flex flex-col justify-between min-h-[220px]">
              <div className="relative z-10">
                <h3 className="text-2xl md:text-3xl font-headline font-bold mb-2">أهلاً بك، {profile?.full_name || 'بطلنا'}! 👋</h3>
                <p className="text-white/70 max-w-md text-sm leading-relaxed">
                  {stats.percent > 0
                    ? `لقد أنجزت ${stats.percent}٪ من كورساتك المشتركة. استمر في التعلم لتحقيق هدفك!`
                    : 'مرحباً في منصة أ. محمد زايد — اختر كورسك وابدأ رحلتك نحو التفوق الآن.'}
                </p>
              </div>
              <div className="relative z-10 mt-6 flex items-end justify-between flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">مشترك في</span>
                  <span className="text-lg font-bold">{stats.enrolledCount} كورس</span>
                </div>
                <button onClick={() => {
                  const firstEnrolled = courses.find(c => enrolledIds.includes(c.id) || c.is_free);
                  if (firstEnrolled) navigate(`/player?course_id=${firstEnrolled.id}&is_free=${firstEnrolled.is_free}`);
                }}
                  className="bg-white text-primary px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-surface-container-low transition-all active:scale-95 text-sm shadow-lg">
                  <span>استكمل التعلم</span>
                  <span className="material-symbols-outlined text-sm" style={{fontVariationSettings:"'FILL' 1"}}>arrow_back</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-outline-variant/20 transition-all flex flex-col items-center justify-center text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>bolt</span>
                </div>
                <span className="text-2xl font-black text-on-surface dark:text-white">{stats.watchedCount}</span>
                <span className="text-[11px] font-bold text-on-surface-variant">فيديو شاهدته</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-outline-variant/20 transition-all flex flex-col items-center justify-center text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>workspace_premium</span>
                </div>
                <span className="text-2xl font-black text-on-surface dark:text-white">{stats.completedCount}</span>
                <span className="text-[11px] font-bold text-on-surface-variant">كورس مكتمل</span>
              </div>
              <div className="col-span-2 bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-outline-variant/20">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-base">trending_up</span>
                    <span className="text-sm font-bold text-on-background dark:text-white">نسبة الإنجاز</span>
                  </div>
                  <span className="text-xs font-black text-tertiary">{stats.percent}%</span>
                </div>
                <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-l from-tertiary to-tertiary-container transition-all duration-700 rounded-full"
                    style={{width: `${stats.percent}%`}}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-headline font-bold flex items-center gap-3">
                    <span className="w-2 h-7 bg-primary rounded-full inline-block"></span>
                    جميع الكورسات ({filteredCourses.length})
                  </h3>
                  {/* Category Filter tabs */}
                  <div className="flex bg-surface-container-low rounded-xl p-1 gap-1 border border-outline-variant/20">
                    {[{k:'all',l:'الكل'},{k:'enrolled',l:'مشترك'},{k:'free',l:'مجاني'}].map(f => (
                      <button key={f.k} onClick={() => setFilter(f.k)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all
                          ${filter === f.k ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}>
                        {f.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Search */}
                <div className="lg:hidden flex items-center gap-2 bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2.5">
                  <span className="material-symbols-outlined text-on-surface-variant text-base">search</span>
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="ابحث..." dir="rtl"
                    className="bg-transparent outline-none w-full text-sm text-on-background font-bold" />
                </div>

                {filteredCourses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-slate-800 rounded-3xl border border-outline-variant/20">
                    <span className="text-5xl">📭</span>
                    <p className="text-on-surface-variant font-bold">لا توجد كورسات مطابقة للبحث</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredCourses.map(c => {
                      const isUnlocked = enrolledIds.includes(c.id) || c.is_free || ['admin', 'super_admin'].includes(profile?.role);
                      return (
                        <CourseCard key={c.id} course={c} isUnlocked={isUnlocked}
                          onEnter={() => navigate(`/player?course_id=${c.id}&is_free=${c.is_free}`)}
                          onPay={() => initiatePaymobPayment(c.id, c.title, c.price)}
                          onCode={() => openCodeModal(c.id)} />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-headline font-bold flex items-center gap-3">
                <span className="w-2 h-7 bg-tertiary rounded-full inline-block"></span>
                اختبارات قادمة
              </h3>
              <div className="bg-surface-container-low p-5 rounded-3xl border-r-4 border-tertiary shadow-sm">
                <h5 className="font-bold text-sm mb-3 text-on-background dark:text-white">اختبار منتصف الفصل — التراكيب</h5>
                <button className="w-full py-2 bg-secondary/10 text-secondary text-[10px] font-black rounded-xl hover:bg-secondary hover:text-white transition-all active:scale-95">
                  تذكيري بالاختبار
                </button>
              </div>

              {/* Achievement Badge */}
              <div className="bg-gradient-to-br from-tertiary/5 to-tertiary-fixed/30 p-6 rounded-3xl border border-tertiary/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-tertiary" style={{fontVariationSettings:"'FILL' 1"}}>emoji_events</span>
                  </div>
                  <div>
                    <h6 className="text-xs font-black text-on-background dark:text-white">وسام "الطالب المتميز"</h6>
                    <p className="text-[10px] text-on-surface-variant">أنهِ ٥ كورسات متتالية</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary rounded-full transition-all duration-700"
                    style={{width: `${Math.min((stats.completedCount / 5) * 100, 100)}%`}}></div>
                </div>
                <p className="text-[10px] font-black text-tertiary mt-2">{stats.completedCount} / ٥ كورسات مكتملة</p>
              </div>

              {/* WhatsApp Support */}
              <a href="https://wa.me/201000623768" target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-secondary/10 border border-secondary/20 text-secondary rounded-2xl font-bold text-sm hover:bg-secondary hover:text-white transition-all active:scale-95">
                <span className="material-symbols-outlined text-[18px]">support_agent</span>
                تواصل مع الأستاذ
              </a>
            </div>
          </div>      {/* ══════════════════════════════════════════
          CODE REDEMPTION MODAL
      ══════════════════════════════════════════ */}
      {codeModalVisible && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCodeModalVisible(false)}>
          <div className="bg-white border border-outline-variant/20 shadow-2xl w-full max-w-sm rounded-3xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-secondary/10 to-primary/10 p-8 flex flex-col items-center border-b border-outline-variant/15">
              <div className="w-20 h-20 rounded-2xl bg-secondary/20 border border-secondary/25 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-secondary" style={{fontVariationSettings:"'FILL' 1"}}>confirmation_number</span>
              </div>
              <h3 className="font-headline font-black text-on-background text-xl">تفعيل كود السنتر</h3>
              <p className="text-on-surface-variant text-sm text-center mt-2 leading-relaxed">أدخل الكود للحصول على الكورس مجاناً</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <input type="text" value={codeInputValue} onChange={e => setCodeInputValue(e.target.value.toUpperCase())}
                placeholder="أدخل الكود هنا..." autoFocus dir="ltr"
                className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl px-5 py-4 text-center text-on-background text-xl font-mono outline-none focus:border-primary tracking-[0.2em] transition-colors" />
              <button onClick={executeRedeemCode} disabled={isRedeeming || !codeInputValue.trim()}
                className="w-full py-3.5 bg-primary text-white font-black rounded-xl text-base disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-95">
                {isRedeeming
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> جاري التحقق...</>
                  : <><span className="material-symbols-outlined text-base" style={{fontVariationSettings:"'FILL' 1"}}>rocket_launch</span> تفعيل الكورس الآن</>
                }
              </button>
              <button onClick={() => setCodeModalVisible(false)}
                className="w-full py-2 text-on-surface-variant font-bold text-sm hover:text-on-background transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

    </PageLayout>
  );
};

/* ──────────────────────────────────────────────
   COURSE CARD — reusable sub-component
────────────────────────────────────────────── */
const CourseCard = ({ course: c, isUnlocked, onEnter, onPay, onCode }) => {
  return (
    <div className={`group relative rounded-[24px] p-[2px] overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-xl
      ${isUnlocked ? 'bg-gradient-to-br from-primary/30 to-secondary/30' : 'bg-gradient-to-br from-error/30 to-tertiary/30'}`}>
      
      <div className="relative z-10 w-full rounded-[22px] bg-surface-container-highest dark:bg-slate-900 overflow-hidden flex flex-col justify-end aspect-[4/5] p-5">
        <CoursePoster course={c} />
        
        {/* Dynamic gradient overlay to ensure text is readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 z-10 pointer-events-none"></div>
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4 z-20">
          {isUnlocked ? (
            <span className="px-3 py-1 bg-secondary/80 text-white backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg">
              مفتوح
            </span>
          ) : (
             <span className="px-3 py-1 bg-error/80 text-white backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg">
              مغلق
            </span>
          )}
        </div>

        {/* Content */}
        <div className="z-20 relative flex flex-col items-start w-full text-right mt-auto">
          {!isUnlocked && (
             <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mb-4 shadow-lg border-2 border-white/20 self-center">
                 <span className="material-symbols-outlined text-3xl text-white">lock</span>
             </div>
          )}

          <h3 className="font-headline text-xl font-black text-white mb-2 leading-tight drop-shadow-md w-full">
            {c.title}
          </h3>
          <p className="text-white/70 text-xs line-clamp-2 mb-4 font-bold drop-shadow-sm w-full">
            {c.description || 'كورس احترافي في منصة أ. محمد زايد'}
          </p>

          <div className="w-full mt-2">
            {isUnlocked ? (
               <button onClick={onEnter} className="w-full py-3 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl font-black text-sm hover:bg-white hover:text-primary transition-all shadow-lg flex items-center justify-center gap-2">
                 <span className="material-symbols-outlined text-[18px]">play_circle</span>
                 دخول الكورس
               </button>
             ) : (
               <div className="flex gap-2 flex-col w-full">
                 <button onClick={onPay} className="w-full py-2.5 bg-error text-white rounded-xl font-black text-xs hover:bg-error/90 transition-all shadow-lg flex items-center justify-center gap-2 border border-error/50">
                    <span className="material-symbols-outlined text-[16px]">credit_card</span>
                    اشتراك أونلاين ({c.price} ج 💰)
                 </button>
                 <button onClick={onCode} className="w-full py-2 bg-black/50 border border-white/20 text-white backdrop-blur-sm rounded-xl font-bold text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
                    أدخل كود السنتر 🎟️
                 </button>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AllCourses;
