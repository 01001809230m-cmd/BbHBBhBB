import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import PageLayout from '../components/PageLayout';

const MySwal = withReactContent(Swal);

/* ──────────────────────────────────────────────
   CoursePoster — auto-fetches YouTube thumbnail
────────────────────────────────────────────── */
const CoursePoster = ({ course }) => {
  const [posterUrl, setPosterUrl] = useState(
    course.image_url || 'https://via.placeholder.com/400x500/0e1a1f/8ad3d7?text=Course'
  );

  useEffect(() => {
    if (!course.image_url) {
      supabase
        .from('videos')
        .select('video_url, source_type')
        .eq('course_id', course.id)
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0 && data[0].source_type === 'youtube') {
            let fId = data[0].video_url.split('v=')[1] || data[0].video_url.split('/').pop();
            fId = fId.split('&')[0];
            setPosterUrl(`https://img.youtube.com/vi/${fId}/hqdefault.jpg`);
          }
        });
    }
  }, [course.id, course.image_url]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <img
        className="w-full h-full object-cover"
        src={posterUrl}
        alt={course.title}
        loading="lazy"
        onError={(e) => { e.target.src = 'https://via.placeholder.com/400x500/0e1a1f/8ad3d7?text=Course'; }}
      />
    </div>
  );
};

/* ──────────────────────────────────────────────
   CourseCard — vertical poster card
────────────────────────────────────────────── */
const CourseCard = ({ course: c, isUnlocked, onEnter, onPay, onCode }) => (
  <div className={`group relative rounded-[24px] p-[2px] overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-xl
    ${isUnlocked ? 'bg-gradient-to-br from-primary/30 to-secondary/30' : 'bg-gradient-to-br from-error/30 to-tertiary/30'}`}>

    <div className="relative z-10 w-full rounded-[22px] bg-slate-900 overflow-hidden flex flex-col justify-end aspect-[4/5] p-5">
      <CoursePoster course={c} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

      {/* Status Badge */}
      <div className="absolute top-4 left-4 z-20">
        <span className={`px-3 py-1 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg text-white
          ${isUnlocked ? 'bg-secondary/80' : 'bg-error/80'}`}>
          {isUnlocked ? 'مفتوح' : 'مغلق'}
        </span>
      </div>

      {/* Content */}
      <div className="z-20 relative flex flex-col w-full mt-auto">
        {!isUnlocked && (
          <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mb-4 shadow-lg border-2 border-white/20 self-center">
            <span className="material-symbols-outlined text-3xl text-white">lock</span>
          </div>
        )}
        <h3 className="font-headline text-xl font-black text-white mb-1 leading-tight drop-shadow-md">{c.title}</h3>
        <p className="text-white/70 text-xs line-clamp-2 mb-4 font-bold drop-shadow-sm">
          {c.description || 'كورس احترافي في منصة أ. محمد زايد'}
        </p>
        <div className="w-full">
          {isUnlocked ? (
            <button onClick={onEnter}
              className="w-full py-3 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl font-black text-sm hover:bg-white hover:text-primary transition-all shadow-lg flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
              دخول الكورس
            </button>
          ) : (
            <div className="flex gap-2 flex-col">
              <button onClick={onPay}
                className="w-full py-2.5 bg-error text-white rounded-xl font-black text-xs hover:bg-error/90 transition-all shadow-lg flex items-center justify-center gap-2 border border-error/50">
                <span className="material-symbols-outlined text-[16px]">credit_card</span>
                اشتراك أونلاين ({c.price} ج 💰)
              </button>
              <button onClick={onCode}
                className="w-full py-2 bg-black/50 border border-white/20 text-white backdrop-blur-sm rounded-xl font-bold text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
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

/* ──────────────────────────────────────────────
   MAIN CourseCatalog Page
────────────────────────────────────────────── */
const CourseCatalog = () => {
  const navigate = useNavigate();
  const [courses,        setCourses]        = useState([]);
  const [enrolledIds,    setEnrolledIds]    = useState([]);
  const [user,           setUser]           = useState(null);
  const [profile,        setProfile]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [codeInputValue,   setCodeInputValue]   = useState('');
  const [targetCodeCourseId, setTargetCodeCourseId] = useState(null);
  const [isRedeeming,    setIsRedeeming]    = useState(false);
  const [stats,          setStats]          = useState({ enrolled: 0, watched: 0, completed: 0, percent: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) { navigate('/login'); return; }
      const u = authData.user;
      setUser(u);

      const [profileRes, coursesRes, enrollRes] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', u.id).single(),
        supabase.from('courses').select('*').order('order_index', { ascending: true }),
        supabase.from('enrollments').select('course_id').eq('student_id', u.id),
      ]);

      const p = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
      if (p) {
        if (p.is_banned) {
          await supabase.auth.signOut();
          MySwal.fire({ icon: 'error', title: 'تم حظر حسابك! 🚫', allowOutsideClick: false });
          navigate('/login'); return;
        }
        setProfile(p);
      }

      const cData = (coursesRes.status === 'fulfilled' ? coursesRes.value.data : null) || [];
      const eIds  = ((enrollRes.status === 'fulfilled' ? enrollRes.value.data : null) || []).map(e => e.course_id);
      setCourses(cData);
      setEnrolledIds(eIds);

      // Calculate progress stats
      if (eIds.length > 0) {
        const [vcRes, wpRes, avRes] = await Promise.allSettled([
          supabase.from('videos').select('*', { count: 'exact', head: true }).in('course_id', eIds),
          supabase.from('video_progress').select('video_id').eq('user_id', u.id),
          supabase.from('videos').select('id, course_id').in('course_id', eIds),
        ]);
        const totalVids  = vcRes.status === 'fulfilled' ? (vcRes.value.count || 0) : 0;
        const watched    = wpRes.status === 'fulfilled' ? (wpRes.value.data || []) : [];
        const allVids    = avRes.status === 'fulfilled' ? (avRes.value.data || []) : [];
        const watchedIds = watched.map(w => w.video_id);
        let completed = 0;
        eIds.forEach(cId => {
          const cv = allVids.filter(v => v.course_id === cId);
          if (cv.length > 0 && cv.every(v => watchedIds.includes(v.id))) completed++;
        });
        const percent = totalVids === 0 ? 0 : Math.round((watched.length / totalVids) * 100);
        setStats({ enrolled: eIds.length, watched: watched.length, completed, percent });
      }
    } catch (err) {
      console.error('CourseCatalog error:', err);
    } finally {
      setLoading(false);
    }
  };

  const initiatePaymobPayment = async (courseId, courseTitle, price) => {
    MySwal.fire({ title: '💳 جاري تجهيز بوابة الدفع', didOpen: () => MySwal.showLoading() });
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const billingData = {
        email: user?.email || 'test@student.com',
        first_name: profile?.full_name?.split(' ')[0] || 'Student',
        last_name:  profile?.full_name?.split(' ').slice(1).join(' ') || 'User',
        phone_number: profile?.phone || '+201000000000',
        floor: 'NA', apartment: 'NA', street: 'NA', building: 'NA',
        shipping_method: 'NA', postal_code: 'NA', city: 'Cairo', country: 'EG', state: 'NA',
      };
      const res  = await fetch(`${apiUrl}/api/paymob/initiate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, title: courseTitle, price, billingData, userId: user?.id }),
      });
      const data = await res.json();
      if (!data.success || !data.iframeUrl) throw new Error(data.error || 'خطأ من الخادم');
      localStorage.setItem('pendingCourseId', courseId);
      window.location.href = data.iframeUrl;
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'خطأ في الدفع', text: err.message });
    }
  };

  const openCodeModal = (id) => {
    if (!user) return;
    setTargetCodeCourseId(id);
    setCodeInputValue('');
    setCodeModalVisible(true);
  };

  const executeRedeemCode = async () => {
    if (!codeInputValue.trim()) return;
    setIsRedeeming(true);
    const { data, error } = await supabase.rpc('secure_redeem_code', {
      p_code: codeInputValue.trim(),
      p_course_id: targetCodeCourseId,
    });
    setIsRedeeming(false);
    if (error) {
      MySwal.fire({ icon: 'error', title: '❌ خطأ', text: 'حدث خطأ بالاتصال بالخادم.' });
      return;
    }
    if (data.success) {
      setCodeModalVisible(false);
      await MySwal.fire({ icon: 'success', title: '🎉 مبروك!', text: data.message, confirmButtonColor: '#1b6d24' });
      loadData();
    } else {
      MySwal.fire({ icon: 'warning', title: '⚠️ تنبيه', text: data.message });
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4 z-50">
      <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-primary font-bold text-lg">جاري التحميل...</p>
    </div>
  );

  const firstName      = profile?.full_name?.split(' ')[0] || 'الطالب';
  const isAdmin         = ['admin', 'super_admin'].includes(profile?.role);
  const enrolledCourses = courses.filter(c => enrolledIds.includes(c.id) || c.is_free || isAdmin);
  const lockedCourses   = courses.filter(c => !enrolledIds.includes(c.id) && !c.is_free && !isAdmin);

  return (
    <PageLayout profile={profile}>

      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-container p-8 text-white shadow-xl shadow-primary/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-3xl font-headline font-extrabold mb-2">أهلاً بك، {firstName}! 👋</h2>
            <p className="text-white/70 text-sm leading-relaxed max-w-md">
              {stats.percent > 0
                ? `أنجزت ${stats.percent}٪ من كورساتك. استمر في التعلم!`
                : 'مرحباً في منصة أ. محمد زايد — اختر كورسك وابدأ رحلتك.'}
            </p>
          </div>
          <button
            onClick={() => {
              const first = enrolledCourses[0];
              if (first) navigate(`/player?course_id=${first.id}&is_free=${first.is_free}`);
            }}
            className="self-start md:self-auto bg-white text-primary px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-surface-container-low transition-all active:scale-95 text-sm shadow-lg whitespace-nowrap">
            <span>استكمل التعلم</span>
            <span className="material-symbols-outlined text-sm" style={{fontVariationSettings:"'FILL' 1"}}>arrow_back</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="relative z-10 mt-6 flex gap-6 flex-wrap">
          {[
            { label: 'كورسات مسجّلة', value: stats.enrolled, icon: 'school' },
            { label: 'فيديو شاهدته',   value: stats.watched,  icon: 'play_circle' },
            { label: 'كورس مكتمل',     value: stats.completed, icon: 'workspace_premium' },
            { label: 'نسبة الإنجاز',   value: stats.percent + '%', icon: 'trending_up' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-white/60 text-base">{s.icon}</span>
              <div>
                <div className="text-xl font-black">{s.value}</div>
                <div className="text-[10px] text-white/50 font-bold">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Enrolled Courses ── */}
      {enrolledCourses.length > 0 && (
        <div>
          <h3 className="text-lg font-headline font-bold flex items-center gap-3 mb-5">
            <span className="w-2 h-7 bg-secondary rounded-full inline-block" />
            كورساتي المشتركة
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {enrolledCourses.map(c => (
              <CourseCard
                key={c.id}
                course={c}
                isUnlocked={true}
                onEnter={() => navigate(`/player?course_id=${c.id}&is_free=${c.is_free}`)}
                onPay={() => initiatePaymobPayment(c.id, c.title, c.price)}
                onCode={() => openCodeModal(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Locked Courses ── */}
      {lockedCourses.length > 0 && (
        <div>
          <h3 className="text-lg font-headline font-bold flex items-center gap-3 mb-5">
            <span className="w-2 h-7 bg-error rounded-full inline-block" />
            كورسات متاحة للاشتراك
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {lockedCourses.map(c => (
              <CourseCard
                key={c.id}
                course={c}
                isUnlocked={false}
                onEnter={() => {}}
                onPay={() => initiatePaymobPayment(c.id, c.title, c.price)}
                onCode={() => openCodeModal(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      {courses.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <span className="material-symbols-outlined text-7xl text-on-surface-variant/30">school</span>
          <h3 className="text-xl font-bold text-on-surface-variant">لا توجد كورسات بعد</h3>
          <p className="text-sm text-on-surface-variant/70">سيتم إضافة الكورسات قريباً</p>
        </div>
      )}

      {/* ── Code Redemption Modal ── */}
      {codeModalVisible && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCodeModalVisible(false)}>
          <div className="bg-white dark:bg-slate-900 border border-outline-variant/20 shadow-2xl w-full max-w-sm rounded-3xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-secondary/10 to-primary/10 p-8 flex flex-col items-center border-b border-outline-variant/15">
              <div className="w-20 h-20 rounded-2xl bg-secondary/20 border border-secondary/25 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-secondary" style={{fontVariationSettings:"'FILL' 1"}}>confirmation_number</span>
              </div>
              <h3 className="font-headline font-black text-on-background dark:text-white text-xl">تفعيل كود السنتر</h3>
              <p className="text-on-surface-variant text-sm text-center mt-2 leading-relaxed">أدخل الكود للحصول على الكورس</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <input
                type="text"
                value={codeInputValue}
                onChange={e => setCodeInputValue(e.target.value.toUpperCase())}
                placeholder="أدخل الكود هنا..."
                autoFocus
                dir="ltr"
                className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl px-5 py-4 text-center text-on-background dark:text-white text-xl font-mono outline-none focus:border-primary tracking-[0.2em] transition-colors"
              />
              <button
                onClick={executeRedeemCode}
                disabled={isRedeeming || !codeInputValue.trim()}
                className="w-full py-3.5 bg-primary text-white font-black rounded-xl text-base disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-95">
                {isRedeeming
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري التحقق...</>
                  : <><span className="material-symbols-outlined text-base" style={{fontVariationSettings:"'FILL' 1"}}>rocket_launch</span> تفعيل الكورس الآن</>}
              </button>
              <button onClick={() => setCodeModalVisible(false)}
                className="w-full py-2 text-on-surface-variant font-bold text-sm hover:text-on-background transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </PageLayout>
  );
};

export default CourseCatalog;
