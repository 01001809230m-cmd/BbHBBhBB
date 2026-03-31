import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDarkMode } from '../hooks/useDarkMode';

const Home = ({ session }) => {
  const [dark, toggleDark] = useDarkMode();
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [typedTitle, setTypedTitle] = useState('');
  const [typedDesc, setTypedDesc] = useState('');
  const carouselRef = useRef(null);
  const angleRef = useRef(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const rafId = useRef(null);

  const fullTitle = "نصنع التفوق ولا ننتظره";
  const fullDesc = "انضم إلى آلاف الطلاب في أقوى منصة تعليمية لمادتي الأحياء والجيولوجيا مع الأستاذ محمد زايد. شرح مبسط، خرائط ذهنية، وتدريبات تحاكي النظام الجديد.";

  useEffect(() => {
    let t1, t2;
    const type = (text, setter, speed, onComplete) => {
      let i = 0;
      const step = () => {
        if (i < text.length) {
          setter(text.slice(0, ++i));
          t1 = setTimeout(step, speed);
        } else if (onComplete) onComplete();
      };
      step();
    };
    type(fullTitle, setTypedTitle, 70, () => type(fullDesc, setTypedDesc, 20));
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // --- Countdown Logic (Azhar Secondary June 1st, 2025) ---
  useEffect(() => {
    const target = new Date('2025-06-01T00:00:00').getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) {
        clearInterval(interval);
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        secs: Math.floor((diff % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- 3D Carousel Logic ---
  useEffect(() => {
    const autoRotate = () => {
      if (!isDragging.current && carouselRef.current) {
        angleRef.current -= 0.15;
        carouselRef.current.style.transform = `rotateY(${angleRef.current}deg)`;
      }
      rafId.current = requestAnimationFrame(autoRotate);
    };
    rafId.current = requestAnimationFrame(autoRotate);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  const handleDragStart = (e) => {
    isDragging.current = true;
    startX.current = e.clientX || e.touches[0].clientX;
  };
  const handleDragMove = (e) => {
    if (!isDragging.current) return;
    const currentX = e.clientX || e.touches[0].clientX;
    const delta = (currentX - startX.current) * 0.3;
    angleRef.current += delta;
    startX.current = currentX;
    if (carouselRef.current) {
      carouselRef.current.style.transform = `rotateY(${angleRef.current}deg)`;
    }
  };
  const handleDragEnd = () => { isDragging.current = false; };

  const carouselItems = [
    { title: 'أ. محمد زايد', desc: 'خبير مادتي الأحياء والجيولوجيا للثانوية العامة', img: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400' },
    { title: '#من_أراد_استطاع', desc: 'شعارنا الدائم.. نصنع التفوق ولا ننتظره', img: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400' },
    { title: 'شرح تفصيلي', desc: 'أحدث طرق الشرح التفاعلية لضمان الفهم العميق', img: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400' },
    { title: 'مذكرات شاملة', desc: 'المصدر الوحيد الذي ستحتاجه للوصول للدرجة النهائية', img: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=400' },
    { title: 'امتحانات دورية', desc: 'تدريب مستمر على أسئلة النظام الجديد المعقدة', img: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400' },
    { title: 'متابعة مستمرة', desc: 'فريق كامل لمتابعة مستواك خطوة بخطوة', img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400' },
    { title: 'بنك أسئلة', desc: 'آلاف الأسئلة المتوقعة في امتحانات آخر العام', img: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400' },
    { title: 'جودة عالية', desc: 'فيديوهات مصورة بأعلى جودة لراحة عينيك', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400' },
    { title: 'دعم فني', desc: 'نحن معك في أي وقت للرد على كل أسئلتك', img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400' },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container" dir="rtl">
      {/* Intro Scanline */}
      <div className="scanline" />

      {/* --- Ambient Blobs --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30 dark:opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-orb-float" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] animate-orb-float" style={{ animationDelay: '-4s' }} />
      </div>

      {/* --- Progress Navigation Bar --- */}
      <nav className="fixed top-0 w-full z-50 glass-nav px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link to="/" className="text-2xl font-black text-primary font-headline flex items-center gap-2">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center text-xl">م</div>
            <span className="hidden sm:inline">أ. محمد زايد</span>
          </Link>
          <div className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-sm">المميزات</a>
            <a href="#stats" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-sm">الإحصائيات</a>
            <a href="#countdown" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-sm">المراجعات</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleDark} className="dark-toggle p-2 hover:bg-surface-container rounded-xl text-on-surface-variant transition-all">
             <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {dark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <Link to={session ? "/all-courses" : "/login"} className="btn-primary px-6 py-2.5 flex items-center gap-2 group transition-all">
            <span className="text-sm">{session ? 'منصتي التعليمية' : 'ابدأ رحلتك الآن'}</span>
            <span className="material-symbols-outlined text-base group-hover:translate-x-[-4px] transition-transform">arrow_back</span>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-20 px-6">
        {/* --- Hero Section --- */}
        <section className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 mb-32">
          <div className="flex-1 text-center lg:text-right">
             <div className="inline-flex items-center gap-3 px-5 py-2 mb-8 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest border border-primary/20 backdrop-blur-md">
               <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
               أكاديمية التفوق العلمي
             </div>
             <h1 className="text-5xl lg:text-7xl font-headline font-black text-on-background leading-[1.1] mb-8 min-h-[160px]">
                <span className="text-gradient-primary">{typedTitle}</span>
             </h1>
             <p className="text-xl text-on-surface-variant leading-relaxed mb-12 max-w-2xl mx-auto lg:mx-0 font-medium min-h-[80px]">
               {typedDesc}
             </p>
             <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
               <Link to={session ? "/all-courses" : "/login"} className="btn-primary hover:scale-105 active:scale-95 px-10 py-5 text-xl relative overflow-hidden group">
                  <span className="relative z-10">سجل مجاناً الآن</span>
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
               </Link>
               <a href="https://wa.me/201001809230" target="_blank" rel="noreferrer" 
                 className="flex items-center gap-2 px-8 py-5 text-lg font-bold text-secondary border border-secondary/20 rounded-2xl hover:bg-secondary/5 transition-all">
                  <span className="material-symbols-outlined">forum</span>
                  تحدث مع خبير
               </a>
             </div>
          </div>

          <div className="flex-1 w-full flex justify-center">
             <div className="relative w-full max-w-[450px]">
                {/* 3D Visual Decor */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-pulse" />
                
                <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden border-[12px] border-white dark:border-surface-container shadow-ambient relative animate-fade-in-up">
                   <img 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4hHde86R7ahbZOCgSI9er2IOiuAtCt1sMWvTvuoLJEVEcUKrmOgdcAX6lT396MF43XuYgafofFE31BEaC3ez0v9Wfz8-UfwgVVhUhysO4L5XDBFtlsB9H3N-P1NVKq-XW17ZdCBoG3pDhsggF0-mAk7pAHhf02HgRDiaGQZrFWdiUI67j93FHa-L904HqK51LAeUhgjl-QY_PB4j_eLmUVk9-XcPxIiAXEhw3ljZoJC5zJq4e7CQl7v4dVYAdtrSfRLoJM2VKKguz" 
                      alt="الأستاذ محمد زايد" 
                      className="w-full h-full object-cover"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                   <div className="absolute bottom-6 left-6 right-6 p-6 glass-card rounded-[2rem] border border-white/20">
                      <div className="flex items-center justify-between gap-4">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
                               <span className="material-symbols-outlined">science</span>
                            </div>
                            <div>
                               <div className="text-white font-bold text-sm">المحاضرة المباشرة</div>
                               <div className="text-white/70 text-xs font-medium">الوراثة والبيولوجيا</div>
                            </div>
                         </div>
                         <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] text-red-500 font-black">مباشر</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* --- Stats Strip --- */}
        <section id="stats" className="max-w-7xl mx-auto mb-40">
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { val: 15000, prefix: '+', label: 'طالب مسجل', sub: 'ثقة واختيار الأوائل', color: 'text-primary' },
                { val: 98, prefix: '', suffix: '%', label: 'درجات التفوق', sub: 'أوائل الجمهورية والمحافظات', color: 'text-secondary' },
                { val: 500, prefix: '+', label: 'فيديو تعليمي', sub: 'شرح مفصل بأحدث التقنيات', color: 'text-tertiary' },
                { val: 2000, prefix: '+', label: 'اختبار تدريبي', sub: 'محاكاة لواقع الامتحانات', color: 'text-primary' },
              ].map((s, idx) => {
                const [count, setCount] = useState(0);
                useEffect(() => {
                  let start = 0;
                  const end = s.val;
                  if (start === end) return;
                  const duration = 2000;
                  const increment = end / (duration / 16);
                  const timer = setInterval(() => {
                    start += increment;
                    if (start >= end) {
                      setCount(end);
                      clearInterval(timer);
                    } else {
                      setCount(Math.floor(start));
                    }
                  }, 16);
                  return () => clearInterval(timer);
                }, [s.val]);

                return (
                  <div key={idx} className="surface-card p-10 text-center flex flex-col items-center group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full translate-x-12 translate-y-[-12px] group-hover:scale-110 transition-transform" />
                    <div className={`text-5xl font-black ${s.color} mb-3 tracking-tighter`}>
                      {s.prefix}{count.toLocaleString('ar-EG')}{s.suffix}
                    </div>
                    <div className="text-on-background font-black text-xl mb-1">{s.label}</div>
                    <div className="text-on-surface-variant text-xs font-bold opacity-60 tracking-wider uppercase">{s.sub}</div>
                  </div>
                );
              })}
           </div>
        </section>

        {/* --- 3D Carousel Section --- */}
        <section className="max-w-7xl mx-auto mb-40 py-20 px-6 overflow-hidden">
           <div className="text-center mb-24">
              <div className="section-label flex justify-center items-center gap-3 mb-4">
                 <div className="w-12 h-[1px] bg-primary/40" />
                 <span className="text-primary font-bold uppercase tracking-widest text-xs">محتوى أسطوري</span>
                 <div className="w-12 h-[1px] bg-primary/40" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-headline font-black text-on-background leading-normal">كل ما تحلم به في <span className="text-primary underline decoration-primary/20 decoration-8 underline-offset-8">مكان واحد</span></h2>
           </div>

           <div className="flex flex-col lg:flex-row items-center gap-20">
              {/* Visual Side */}
              <div className="flex-1 w-full flex justify-center perspective-1000">
                 <div 
                    className="relative w-[280px] h-[380px] preserve-3d transition-transform duration-75 cursor-grab active:cursor-grabbing" 
                    ref={carouselRef}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={handleDragEnd}
                  >
                    {carouselItems.map((item, idx) => {
                      const rotation = idx * 40;
                      return (
                        <div 
                           key={idx} 
                           className="c3d-card"
                           style={{ transform: `rotateY(${rotation}deg) translateZ(300px)` }}
                        >
                           <img 
                              src={item.img} 
                              alt={item.title} 
                              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" 
                           />
                           <div className="relative z-10">
                              <h3 className="text-primary font-black text-lg mb-2">{item.title}</h3>
                              <p className="text-white/80 text-xs leading-relaxed font-medium">{item.desc}</p>
                           </div>
                        </div>
                      );
                    })}
                 </div>
                 {/* Decorative Rings */}
                 <div className="absolute top-1/2 left-1/2 w-[550px] h-[550px] border border-primary/10 rounded-full translate-x-[-50%] translate-y-[-50%] animate-ring-rotate pointer-events-none" />
                 <div className="absolute top-1/2 left-1/2 w-[450px] h-[450px] border-[1px] border-secondary/10 rounded-full translate-x-[-50%] translate-y-[-50%] animate-ring-rotate-rev pointer-events-none" />
              </div>

              {/* Text Side */}
              <div className="flex-1 text-right space-y-10">
                 {[
                   { title: 'شرح احترافي بجودة 4K', desc: 'نستخدم أحدث وسائل التصوير والإنتاج السينمائي لتوصيل المعلومة بمتعة بصرية.', icon: 'movie' },
                   { title: 'بنك أسئلة ذكي', desc: 'آلاف الأسئلة المتدرجة من السهولة للصعوبة لتحاكي نظام الامتحانات الجديد.', icon: 'database' },
                   { title: 'تقارير أداء دورية', desc: 'نرسل لولي الأمر تقارير دورية تظهر مستوى الطالب وتقدمه في كل قسم.', icon: 'monitoring' },
                 ].map((feat, i) => (
                   <div key={i} className="flex gap-6 items-start group">
                      <div className="flex-1">
                         <h3 className="text-2xl font-headline font-black text-on-background mb-2 group-hover:text-primary transition-colors">{feat.title}</h3>
                         <p className="text-on-surface-variant leading-relaxed font-medium">{feat.desc}</p>
                      </div>
                      <div className="w-14 h-14 bg-surface-container rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                         <span className="material-symbols-outlined text-2xl">{feat.icon}</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* --- Countdown Banner --- */}
        <section id="countdown" className="max-w-7xl mx-auto mb-40">
           <div className="rounded-[3rem] bg-on-background relative overflow-hidden p-12 lg:p-20 text-center group">
              <div className="absolute top-0 left-0 w-full h-full bg-primary/10 animate-pulse opacity-50 pointer-events-none" />
              <div className="absolute top-[-50%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] group-hover:bg-primary/30 transition-colors" />
              
              <div className="relative z-10 max-w-4xl mx-auto">
                 <h2 className="text-4xl lg:text-5xl font-headline font-black text-white mb-6">العد التنازلي لامتحانات <span className="text-primary italic">الثانوية الأزهرية</span></h2>
                 <p className="text-white/60 mb-16 text-lg font-medium">الوقت يمر وأنت تصنع مستقبلك الآن! استلهم القوة من هدفك واستعد معنا لأقوى مراجعات ليلة الامتحان.</p>
                 
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10">
                    {[
                      { val: countdown.days, label: 'يوم' },
                      { val: countdown.hours, label: 'ساعة' },
                      { val: countdown.mins, label: 'دقيقة' },
                      { val: countdown.secs, label: 'ثانية' },
                    ].map((t, idx) => (
                      <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-10 group/timer transition-all hover:bg-white/10 hover:scale-105">
                         <div className="text-5xl lg:text-7xl font-black text-primary mb-3 font-headline tabular-nums tracking-tighter group-hover/timer:scale-110 transition-transform">
                           {String(t.val).padStart(2, '0')}
                         </div>
                         <div className="text-white/40 text-sm font-bold uppercase tracking-widest">{t.label}</div>
                      </div>
                    ))}
                 </div>

                 <div className="mt-20 flex flex-wrap justify-center gap-6">
                    <Link to={session ? "/all-courses" : "/login"} className="btn-primary px-12 py-5 text-xl rounded-[1.5rem] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                       سجل في مراجعة ليلة الامتحان
                    </Link>
                    <a href="https://wa.me/201001809230" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-12 py-5 text-xl font-black text-white border border-white/20 rounded-[1.5rem] hover:bg-white/10 transition-all">
                       <span className="material-symbols-outlined">description</span>
                       تحميل جدول المراجعة
                    </a>
                 </div>
              </div>
           </div>
        </section>

        {/* --- Testimonials Section --- */}
        <section className="max-w-7xl mx-auto mb-40 text-center">
           <h2 className="text-4xl font-headline font-black text-on-background mb-20 text-center">عن <span className="text-secondary">كتيبة التفوق</span> يتحدثون</h2>
           <div className="grid lg:grid-cols-3 gap-10">
              {[
                { name: 'أحمد خالد', role: 'كلية الطب 2024', text: 'بصراحة الجيولوجيا مع أ. محمد في حتة تانية خالص! الشرح الممتع والخرائط الذهنية اللي كان بيعملها خلّت الموقف يتغير تماماً لدرجة إن المادة كانت المفضلة عندي.' },
                { name: 'مريم يوسف', role: 'أوائل الجمهورية 2024', text: 'كنت خايفة من الأحياء جداً، لكن المنصة والامتحانات الدورية والربط بين الأبواب خلّوني حاسة بالثقة في أي سؤال مهما كانت صعوبته.' },
                { name: 'ياسين محمود', role: 'كلية الهندسة 2024', text: 'ميزة المنصة إنها مرتبة جداً وفريق المتابعة مش بيسيبك لحظة.. فعلاً حسيت إني بذاكر مع مدرس قاعد جنبي في البيت طول اليوم.' },
              ].map((test, i) => (
                <div key={i} className="surface-card p-12 text-right relative flex flex-col items-center">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
                   </div>
                   <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-black text-2xl mb-6 relative z-10">
                      {test.name[0]}
                   </div>
                   <p className="text-on-surface-variant font-medium leading-relaxed italic mb-8 relative z-10">"{test.text}"</p>
                   <div className="border-t border-outline-variant/30 w-full pt-6">
                      <div className="font-black text-on-background text-lg">{test.name}</div>
                      <div className="text-secondary text-sm font-bold">{test.role}</div>
                   </div>
                </div>
              ))}
           </div>
        </section>

        {/* --- Footer Header --- */}
        <footer className="w-full mt-40 pt-20 border-t border-outline-variant/20">
           <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 mb-20 text-center md:text-right">
              <div>
                 <div className="text-2xl font-black text-primary font-headline mb-4">منصة أ. محمد زايد</div>
                 <p className="text-on-surface-variant leading-relaxed font-medium">المنصة التعليمية الأولى في مصر لشرح مادتي الأحياء والجيولوجيا لطلاب الثانوية العامة بأسلوب علمي متطور.</p>
              </div>
              <div className="flex flex-col items-center">
                 <h4 className="font-black text-on-background mb-6 text-xl">روابط سريعة</h4>
                 <div className="flex flex-wrap justify-center gap-6">
                   {['الرئيسية','المحاضرات','المذكرات','اتصل بنا'].map(it=>(
                     <a key={it} href="#" className="text-on-surface-variant hover:text-primary transition-colors font-black">{it}</a>
                   ))}
                 </div>
              </div>
              <div className="flex flex-col items-center md:items-end">
                 <h4 className="font-black text-on-background mb-6 text-xl">تابعنا</h4>
                 <div className="flex gap-4">
                    {['facebook','youtube','telegram','public'].map(sn => (
                      <a key={sn} href="#" className="w-12 h-12 rounded-[1rem] bg-surface-container flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                        <span className="material-symbols-outlined">{sn === 'facebook' ? 'groups' : (sn === 'youtube' ? 'video_library' : (sn === 'telegram' ? 'forum' : 'public'))}</span>
                      </a>
                    ))}
                 </div>
              </div>
           </div>
           <div className="w-full py-8 border-t border-outline-variant/10 text-center">
              <p className="text-on-surface-variant text-xs font-bold opacity-60">© 2025 منصة أ. محمد زايد. جميع الحقوق محفوظة. صُمم بكل حب لدعم طموح الطلاب بمصر.</p>
           </div>
        </footer>
      </main>

      {/* WhatsApp FAB */}
      <a href="https://wa.me/201001809230" target="_blank" rel="noreferrer" className="whatsapp-float group">
         <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
           <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      </a>
    </div>
  );
};

export default Home;
