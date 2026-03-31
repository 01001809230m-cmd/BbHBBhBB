import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

const MySwal = withReactContent(Swal);

const VideoPlayer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = searchParams.get('course_id');
  const initVideoId = searchParams.get('video_id');

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const profileRef = useRef(null);
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [watchedIds, setWatchedIds] = useState(new Set());
  const [currentVideo, setCurrentVideo] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(-1);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(true);

  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const watermarkInterval = useRef(null);
  const progressInterval = useRef(null);

  useEffect(() => {
    loadPlayerContent();
    return () => {
      if (playerRef.current) playerRef.current.destroy();
      if (watermarkInterval.current) clearInterval(watermarkInterval.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
    // eslint-disable-next-line
  }, [courseId]);

  const loadPlayerContent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setUser(user);

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (p) {
        if (p.is_banned) {
          await supabase.auth.signOut();
          navigate('/login');
          return;
        }
        setProfile(p);
        profileRef.current = p;
      }

      if (!courseId) { setLoading(false); return; }

      const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).single();
      setCourse(courseData);

      const { data: enroll } = await supabase.from('enrollments').select('course_id').eq('student_id', user.id);
      const enrolledIds = enroll ? enroll.map(e => e.course_id) : [];
      const isUnlocked = courseData?.is_free || enrolledIds.includes(courseId);

      if (!isUnlocked) {
        MySwal.fire({
          icon: 'warning', title: 'محتوى مدفوع', text: 'يرجى الاشتراك في الكورس أولاً',
          confirmButtonText: 'الذهاب للكورسات'
        }).then(() => navigate('/course'));
        return;
      }

      const { data: vids } = await supabase.from('videos').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
      const { data: watched } = await supabase.from('video_progress').select('video_id').eq('user_id', user.id);
      
      setVideos(vids || []);
      setWatchedIds(new Set((watched || []).map(w => w.video_id)));
      setLoading(false);

      if (vids && vids.length > 0) {
        const target = vids.find(v => v.id === initVideoId) || vids[0];
        playVideo(target);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const playVideo = (v) => {
    if (v.source_type === 'meet') { window.open(v.video_url, '_blank'); return; }

    setCurrentVideo(v);
    setSearchParams({ course_id: courseId, video_id: v.id }, { replace: true });
    
    let ch = [];
    try { ch = typeof v.chapters_json === 'string' ? JSON.parse(v.chapters_json) : (v.chapters_json || []); } catch(e){}
    setChapters(ch);
    setActiveChapterIndex(-1);

    initPlyr(v, ch);
  };

  const initPlyr = (v, ch) => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    if (watermarkInterval.current) clearInterval(watermarkInterval.current);
    if (progressInterval.current) clearInterval(progressInterval.current);

    const container = playerContainerRef.current;
    if (!container) return;
    container.innerHTML = '<div id="watermark" class="absolute z-[9999] pointer-events-none text-emerald-500/80 text-sm p-1 transition-all duration-1000"></div>';

    const plyrOptions = {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
      youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1, controls: 0, disablekb: 1 }
    };

    if (v.source_type === 'youtube') {
      let id = v.video_url.split('v=')[1] || v.video_url.split('/').pop();
      if (id && id.includes('&')) id = id.split('&')[0];
      const playerDiv = document.createElement('div');
      playerDiv.id = 'plyr-element';
      playerDiv.setAttribute('data-plyr-provider', 'youtube');
      playerDiv.setAttribute('data-plyr-embed-id', id);
      container.insertBefore(playerDiv, container.firstChild);
      playerRef.current = new Plyr('#plyr-element', plyrOptions);
    } else {
      const videoEl = document.createElement('video');
      videoEl.id = 'plyr-element';
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('controls', '');
      videoEl.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;';
      const src = document.createElement('source');
      src.src = v.video_url;
      videoEl.appendChild(src);
      container.insertBefore(videoEl, container.firstChild);
      playerRef.current = new Plyr('#plyr-element', plyrOptions);
    }

    const player = playerRef.current;

    player.on('ready', () => {
      // Setup Custom specific DOM overrides
      const wrapper = container.querySelector('.plyr');
      if (wrapper && v.source_type === 'youtube') {
        const iframe = wrapper.querySelector('iframe');
        if (iframe) {
            iframe.style.height = '300%';
            iframe.style.top = '-100%';
            iframe.style.pointerEvents = 'none';
        }
      }

      // ── Speed & Quality menus (matching original player.html) ──
      if (wrapper && !wrapper.querySelector('.gv-speed-menu')) {
        const menuStyle = 'position:absolute;bottom:65px;left:0;background:rgba(4,8,18,.98);border:1px solid rgba(0,229,255,.3);border-radius:14px;padding:6px;width:110px;z-index:3000;display:flex;flex-direction:column;gap:3px;box-shadow:0 15px 35px rgba(0,0,0,.8);';
        
        const sMenu = document.createElement('div');
        sMenu.className = 'gv-speed-menu'; sMenu.style.cssText = menuStyle+'display:none;';
        sMenu.innerHTML = `<div style="text-align:center;font-size:10px;color:#00e5ff;font-weight:900;padding:4px 0;border-bottom:1px solid rgba(0,229,255,.1);margin-bottom:4px;">السرعة</div>
          ${[0.5,0.75,1,1.25,1.5,2].map(s=>`<div data-speed="${s}" style="padding:8px;font-size:12px;color:${s===1?'#000':'#fff'};cursor:pointer;border-radius:6px;text-align:center;background:${s===1?'linear-gradient(135deg,#00e5ff,#0066ff)':'transparent'};font-weight:${s===1?'bold':'normal'}">${s===1?'عادي':s+'x'}</div>`).join('')}`;
        
        const qMenu = document.createElement('div');
        qMenu.className = 'gv-quality-menu'; qMenu.style.cssText = menuStyle+'display:none;';
        qMenu.innerHTML = `<div style="text-align:center;font-size:10px;color:#00e5ff;font-weight:900;padding:4px 0;border-bottom:1px solid rgba(0,229,255,.1);margin-bottom:4px;">الجودة</div>
          ${['تلقائي','1080p','720p','480p','360p'].map((q,i)=>`<div style="padding:8px;font-size:12px;color:${i===0?'#000':'#fff'};cursor:pointer;border-radius:6px;text-align:center;background:${i===0?'linear-gradient(135deg,#00e5ff,#0066ff)':'transparent'};font-weight:${i===0?'bold':'normal'}">${q}</div>`).join('')}`;
        
        wrapper.appendChild(sMenu); wrapper.appendChild(qMenu);

        sMenu.querySelectorAll('[data-speed]').forEach(el => {
          el.addEventListener('click', e => {
            e.stopPropagation();
            if (playerRef.current) playerRef.current.speed = parseFloat(el.dataset.speed);
            sMenu.querySelectorAll('[data-speed]').forEach(o => { o.style.background=''; o.style.color='#fff'; o.style.fontWeight='normal'; });
            el.style.background='linear-gradient(135deg,#00e5ff,#0066ff)'; el.style.color='#000'; el.style.fontWeight='bold';
            sMenu.style.display='none';
            const txt = speedBtnEl?.querySelector('.gv-spd-txt'); if(txt) txt.textContent = parseFloat(el.dataset.speed)===1?'عادي':el.dataset.speed+'x';
          });
        });
        qMenu.querySelectorAll('div+div').forEach((el,i) => {
          el.addEventListener('click', e => {
            e.stopPropagation();
            qMenu.querySelectorAll('div+div').forEach(o=>{o.style.background='';o.style.color='#fff';o.style.fontWeight='normal';});
            el.style.background='linear-gradient(135deg,#00e5ff,#0066ff)';el.style.color='#000';el.style.fontWeight='bold';
            qMenu.style.display='none';
          });
        });

        const controls = wrapper.querySelector('.plyr__controls');
        const fsbtn = controls?.querySelector('[data-plyr="fullscreen"]');
        if (controls && fsbtn) {
          const speedBtnEl = document.createElement('button');
          speedBtnEl.className = 'plyr__controls__item plyr__control';
          speedBtnEl.style.cssText = 'display:flex;align-items:center;gap:4px;padding:5px 10px;font-weight:bold;font-size:13px;background:transparent;border:none;color:#fff;cursor:pointer;border-radius:4px;';
          speedBtnEl.innerHTML = `<span>⚡</span><span class="gv-spd-txt">عادي</span>`;
          speedBtnEl.addEventListener('click', e=>{ e.stopPropagation(); const r=speedBtnEl.getBoundingClientRect(); const w=wrapper.getBoundingClientRect(); sMenu.style.left=(r.left-w.left)+'px'; sMenu.style.display=sMenu.style.display==='none'?'flex':'none'; qMenu.style.display='none'; });
          controls.insertBefore(speedBtnEl, fsbtn);

          const qualBtnEl = document.createElement('button');
          qualBtnEl.className = 'plyr__controls__item plyr__control';
          qualBtnEl.style.cssText = speedBtnEl.style.cssText;
          qualBtnEl.innerHTML = `<span style="font-size:18px">⚙️</span>`;
          qualBtnEl.addEventListener('click', e=>{ e.stopPropagation(); const r=qualBtnEl.getBoundingClientRect(); const w=wrapper.getBoundingClientRect(); qMenu.style.left=(r.left-w.left)+'px'; qMenu.style.display=qMenu.style.display==='none'?'flex':'none'; sMenu.style.display='none'; });
          controls.insertBefore(qualBtnEl, fsbtn);
        }
        document.addEventListener('click', () => { sMenu.style.display='none'; qMenu.style.display='none'; });
      }

      // ── End Screen ──────────────────────────────────────────
      if (wrapper && !wrapper.querySelector('.gv-end-screen')) {
        const currentProfile = profileRef.current;
        const firstName = (currentProfile?.full_name || 'بطل').split(' ')[0];
        const endScreen = document.createElement('div');
        endScreen.className = 'gv-end-screen';
        endScreen.style.cssText = 'position:absolute;inset:0;z-index:200;background:rgba(2,6,23,0.9);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.4s;';
        endScreen.innerHTML = `<div style="text-align:center;padding:2rem;"><h3 style="color:#00e5ff;font-weight:900;font-size:1.8rem;margin-bottom:12px;font-family:'Tajawal',sans-serif;">انتهت المحاضرة 🎓</h3><p style="color:#5a7a99;font-size:1rem;margin-bottom:24px;font-weight:bold;">عاش المجهود يا ${firstName}.. جاهز للي بعده؟</p><button id="gv-restart-btn" style="background:linear-gradient(135deg,#00e5ff,#0066ff);color:#000;font-weight:900;font-size:1rem;padding:12px 30px;border-radius:14px;border:none;cursor:pointer;">إعادة التشغيل 🔄</button></div>`;
        wrapper.appendChild(endScreen);
        endScreen.querySelector('#gv-restart-btn').addEventListener('click', () => { if(playerRef.current) playerRef.current.restart(); endScreen.style.opacity='0'; endScreen.style.pointerEvents='none'; });
      }
      
      // Setup Custom Click Layer for mobile
      if (wrapper && !wrapper.querySelector('.gv-click-layer')) {
        const clickLayer = document.createElement('div');
        clickLayer.className = 'gv-click-layer absolute top-0 left-0 right-0 bottom-[65px] z-10 cursor-pointer';
        const feedback = document.createElement('div');
        feedback.className = 'seek-feedback absolute top-1/2 -translate-y-1/2 bg-slate-900/80 text-cyan-400 px-6 py-3 rounded-full font-black text-xl pointer-events-none opacity-0 z-[100] border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.6)] transition-opacity duration-200';
        wrapper.appendChild(feedback);
        wrapper.appendChild(clickLayer);

        let lastClickTime = 0;
        clickLayer.addEventListener('dblclick', e => { e.preventDefault(); e.stopPropagation(); });
        clickLayer.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const rect = clickLayer.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          const isCenter = (clickX >= rect.width * 0.20 && clickX <= rect.width * 0.80 && clickY >= rect.height * 0.15 && clickY <= rect.height * 0.85);
          
          const currentTime = new Date().getTime();
          const timeDiff = currentTime - lastClickTime;

          if (timeDiff < 300 && timeDiff > 0) {
            lastClickTime = 0;
            if (!isCenter) {
              if (clickX > rect.width / 2) { player.forward(10); feedback.style.left = 'auto'; feedback.style.right = '15%'; feedback.innerHTML = '▶▶ +10 ثانية'; }
              else { player.rewind(10); feedback.style.right = 'auto'; feedback.style.left = '15%'; feedback.innerHTML = '-10 ثواني ◀◀'; }
              feedback.style.opacity = '1'; setTimeout(() => feedback.style.opacity = '0', 500);
            }
            return;
          }
          lastClickTime = currentTime;
          
          if (wrapper.classList.contains('plyr--hide-controls')) {
            player.toggleControls(true);
          } else {
            if (isCenter) { player.togglePlay(); player.muted = false; player.volume = 1; }
            else { player.toggleControls(false); }
          }
        });
      }
      
      // Auto-save progress every 30s
      progressInterval.current = setInterval(async () => {
        if (!player || player.paused || player.ended) return;
        const currentTime = Math.floor(player.currentTime);
        if (currentTime < 5) return; // Don't save at the very beginning
        
        await supabase.from('video_progress').upsert({
          user_id: user.id,
          video_id: v.id,
          last_position: currentTime,
          watched_at: new Date().toISOString()
        }, { onConflict: 'user_id, video_id' });
      }, 30000);
    });

    player.on('timeupdate', () => {
      if (ch.length === 0) return;
      const cTime = player.currentTime;
      let foundIndex = -1;
      for (let i = 0; i < ch.length; i++) {
        if (cTime >= ch[i].time) foundIndex = i;
        else break;
      }
      if (foundIndex !== -1 && foundIndex !== activeChapterIndex) setActiveChapterIndex(foundIndex);
    });

    player.on('ended', () => {
      const wrapper = container.querySelector('.plyr');
      const endScreen = wrapper?.querySelector('.gv-end-screen');
      if (endScreen) { endScreen.style.opacity = '1'; endScreen.style.pointerEvents = 'auto'; }
      markVideoAsWatched(v.id);
    });

    player.on('play', () => {
      const wrapper = container.querySelector('.plyr');
      const endScreen = wrapper?.querySelector('.gv-end-screen');
      if (endScreen) { endScreen.style.opacity = '0'; endScreen.style.pointerEvents = 'none'; }
    });

    enableJumpingWatermark();
  };

  const enableJumpingWatermark = () => {
    watermarkInterval.current = setInterval(() => {
      const pc = playerContainerRef.current;
      const wm = pc?.querySelector('#watermark');
      if (!pc || !wm) return;
      
      const currentProfile = profileRef.current;
      const name = currentProfile?.full_name || 'طالب';
      const phone = currentProfile?.phone || '';
      wm.innerHTML = `${name}${phone ? '<br>' + phone : ''}`;
      
      const w = pc.offsetWidth || 400; const h = pc.offsetHeight || 225;
      const wmW = wm.offsetWidth || 130; const wmH = wm.offsetHeight || 28;
      
      wm.style.left = Math.floor(Math.random() * Math.max(w - wmW - 20, 20)) + 'px';
      wm.style.top = Math.floor(Math.random() * Math.max(h - wmH - 20, 10)) + 'px';
    }, 5000);
  };

  const markVideoAsWatched = async (videoId) => {
    if (!user) return;
    const { error } = await supabase.from('video_progress').upsert({ user_id: user.id, video_id: videoId }, { onConflict: 'user_id, video_id' });
    if (!error) {
      setWatchedIds(prev => new Set([...prev, videoId]));
    }
  };

  const seekToChapter = (time, index) => {
    if (playerRef.current) {
      playerRef.current.currentTime = time;
      playerRef.current.play();
      setActiveChapterIndex(index);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return MySwal.fire({ icon: 'warning', text: 'يرجى كتابة رسالتك' });
    MySwal.fire({ title: 'جاري الإرسال...', didOpen: () => MySwal.showLoading() });
    const { error } = await supabase.from('student_messages').insert([{
      student_id: user.id, course_id: courseId, video_title: currentVideo?.title, message: feedbackText
    }]);
    if (error) {
      MySwal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ، حاول مرة أخرى.' });
    } else {
      setFeedbackText('');
      setIsFeedbackOpen(false);
      MySwal.fire({ icon: 'success', title: 'تم الإرسال', text: 'رسالتك وصلت للمستر!' });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold text-xl">جاري التحميل...</div>;
  if (!courseId || !course) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><p>لم يتم تحديد الكورس</p><button onClick={()=>navigate('/course')} className="mt-4 px-6 py-2 bg-cyan-500 rounded-lg font-bold">عودة للكورسات</button></div>;

  const avatarLetter = profile?.full_name?.[0] || 'ط';
  return (
    <div className="bg-surface min-h-screen text-on-surface font-body overflow-x-hidden selection:bg-primary-fixed selection:text-on-primary-fixed" dir="rtl">
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Global Sidebar Navigation */}
      <aside className={`fixed right-0 top-0 h-screen w-64 flex flex-col z-50 transition-transform duration-300 bg-slate-50 border-l border-slate-200/50 py-6
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        
        <div className="px-6 mb-10 flex items-center justify-between">
          <h1 className="text-lg font-black text-teal-900 font-headline">The Scholarly Lens</h1>
          <button className="md:hidden p-1 rounded-lg bg-slate-200 text-slate-500" onClick={() => setSidebarOpen(false)}>
              <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col items-center px-6 mb-8 text-center">
          <div className="w-20 h-20 rounded-full flex flex-shrink-0 items-center justify-center text-white text-3xl font-black bg-primary mb-3 ring-4 ring-primary-container/10">
            {avatarLetter}
          </div>
          <h2 className="text-teal-800 font-semibold font-headline text-base">{profile?.full_name || 'طالب'}</h2>
          <p className="text-slate-500 text-xs font-medium">Level 12 Curator</p>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { key: '/course', label: 'دروسي', icon: 'menu_book' },
            { key: '/quizzes', label: 'الاختبارات', icon: 'quiz' },
            { key: '/reports', label: 'التقارير', icon: 'analytics' },
            { key: '/settings', label: 'الإعدادات', icon: 'settings' },
          ].map(item => {
            const isActive = location.pathname.includes('/player') && item.key === '/course'; // Highlighting دروسي for player
            return (
              <button key={item.key} onClick={() => navigate(item.key)} className={isActive 
                ? "w-full bg-teal-100/50 text-teal-900 font-semibold rounded-lg mx-2 px-4 py-3 flex items-center gap-3 translate-x-1 duration-200"
                : "w-full text-slate-600 hover:text-teal-700 hover:bg-slate-200 px-4 py-3 mx-2 rounded-lg transition-all flex items-center gap-3 text-right"}>
                <span className="material-symbols-outlined font-label" style={isActive ? {fontVariationSettings: "'FILL' 1"} : {}}>{item.icon}</span>
                <span className="font-label text-sm">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Top Header */}
      <header className="md:mr-64 relative z-40 bg-white/70 backdrop-blur-xl shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-primary bg-surface-container-low rounded-xl" onClick={() => setSidebarOpen(true)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="text-xl font-bold text-teal-900 font-headline hidden md:block">منصة أ. محمد زايد</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/course')} className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 text-primary font-bold text-sm rounded-xl hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_forward</span> العودة للكورسات
          </button>
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              {avatarLetter}
          </div>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="md:mr-64 px-4 md:px-8 py-6 flex flex-col xl:flex-row gap-6 items-start relative pb-24">
        
        {/* Left/Main Content Column */}
        <div className="flex-1 w-full flex flex-col gap-6">
          
          {/* Dark Cinematic Video Wrapper */}
          <section className="relative overflow-hidden bg-slate-950 rounded-[2rem] p-4 md:p-6 shadow-xl border border-outline-variant/10">
            {/* Ambient Background Behind Player */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-cover bg-center opacity-[0.15] blur-md scale-105" style={{backgroundImage: `url(${course?.image_url || ''})`}}></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,229,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-black/80 to-transparent"></div>
            </div>

            <div className="relative z-10 w-full">
               {/* Player Container Div (The injected Plyr resides here) */}
               <div className="w-full relative rounded-2xl overflow-hidden border border-cyan-500/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-black aspect-video" ref={playerContainerRef}>
                 {!currentVideo && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 backdrop-blur-sm">
                      <span className="text-6xl opacity-40 mb-4 drop-shadow-lg text-white">🎬</span>
                      <p className="font-bold text-lg text-slate-300">الرجاء اختيار درس للبدء في المشاهدة</p>
                    </div>
                 )}
               </div>

               {/* Video Actions Area */}
               <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-white/10">
                 <button onClick={() => { if(playerRef.current) playerRef.current.pause(); setIsFeedbackOpen(true); }} className="px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-bold flex items-center gap-2 hover:bg-amber-500/20 transition-all">
                   <span className="material-symbols-outlined text-[18px]">tips_and_updates</span> فكر بصوت عالي
                 </button>
                 <button onClick={() => markVideoAsWatched(currentVideo?.id)} className={`px-5 py-2.5 rounded-xl border flex items-center gap-2 text-sm font-bold transition-all ${watchedIds.has(currentVideo?.id) ? 'bg-secondary/10 border-secondary/20 text-secondary' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'}`}>
                   {watchedIds.has(currentVideo?.id) ? <span className="material-symbols-outlined text-[18px]">check_circle</span> : <span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>}
                   {watchedIds.has(currentVideo?.id) ? 'تم إنهاء الدرس' : 'تحديد كـ مكتمل'}
                 </button>
                 {currentVideo?.attachment_url && (
                   <a href={currentVideo.attachment_url} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-sm font-bold flex items-center gap-2 transition-all mr-auto">
                     <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span> المذكرة
                   </a>
                 )}
               </div>
               
               {/* Video Info (Inside the dark frame) */}
               <div className="mt-4 bg-black/40 backdrop-blur-md border border-white/5 p-5 md:p-6 rounded-2xl">
                 <h2 className="text-2xl font-black text-white mb-2 font-headline leading-tight">{currentVideo?.title || 'عنوان الدرس غير محدد'}</h2>
                 <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">{currentVideo?.description || 'لا يوجد وصف متاح لهذا الدرس في الوقت الحالي.'}</p>
               </div>
            </div>
          </section>

          {/* Chapters Section (Light UI matching general Surface) */}
          {chapters.length > 0 && (
            <div className="bg-surface-container-lowest border border-outline-variant/20 p-6 rounded-3xl shadow-sm">
              <h3 className="text-lg font-black mb-5 flex items-center gap-2 text-teal-900 font-headline">
                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>map</span>
                النقاط الفاصلة في الدرس
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {chapters.map((ch, idx) => {
                  const words = ch.title.trim().split(' ');
                  const firstWord = words[0];
                  const restWords = words.slice(1).join(' ');
                  const isActive = activeChapterIndex === idx;

                  return (
                    <div key={idx} onClick={() => seekToChapter(ch.time, idx)} className={`cursor-pointer border-r-[6px] rounded-xl p-4 flex flex-col justify-between min-h-[90px] transition-all duration-300 shadow-sm ${isActive ? 'bg-primary-container/20 border-primary ring-1 ring-primary/20 scale-[1.02]' : 'bg-surface-container-low border-surface-variant hover:border-primary/50 hover:bg-surface-container-high'}`}>
                      <div className="flex justify-between items-start mb-2">
                         <span className={`text-[10px] font-black px-2.5 py-1 rounded-md ${isActive ? 'bg-primary text-white shadow-sm' : 'bg-surface-variant text-on-surface-variant'}`}>
                           {ch.label}
                         </span>
                         <span className="text-xs font-bold text-slate-400 font-mono tracking-wider">{Math.floor(ch.time / 60)}:{(ch.time % 60).toString().padStart(2, '0')}</span>
                      </div>
                      <div className="text-sm font-bold font-headline mt-1">
                        <span className={isActive ? "text-primary" : "text-teal-900"}>{firstWord}</span>
                        {restWords && <span className={`ml-1 ${isActive ? "text-on-surface" : "text-slate-500"}`}>{restWords}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Lesson List */}
        <aside className="w-full xl:w-[380px] bg-surface-container-lowest rounded-3xl border border-outline-variant/20 overflow-hidden flex flex-col shadow-sm flex-shrink-0 xl:sticky xl:top-[88px] max-h-[70vh] xl:max-h-[calc(100vh-112px)]">
          <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center gap-3 bg-surface z-10">
            <div className="flex flex-col">
               <span className="text-xs text-primary font-bold mb-0.5 tracking-wide">الوحدة الأكاديمية</span>
               <span className="font-bold text-teal-900 font-headline">فهرس المحاضرات</span>
            </div>
            <span className="material-symbols-outlined text-teal-900" style={{fontVariationSettings: "'FILL' 1"}}>format_list_bulleted</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
            {videos.map((v, idx) => {
              const isWatched = watchedIds.has(v.id);
              const isActive = v.id === currentVideo?.id;
              
              const statusText = isWatched ? 'مكتمل' : (isActive ? 'قيد المشاهدة' : '');
              const statusColor = isWatched ? 'text-secondary' : (isActive ? 'text-primary' : 'text-slate-400');
              const statusBg = isWatched ? 'bg-secondary-container text-on-secondary-container' : (isActive ? 'bg-primary-container text-on-primary-container' : '');
              const iconText = isWatched ? 'check_circle' : (isActive ? 'play_circle' : 'radio_button_unchecked');
              
              const baseClass = "relative cursor-pointer transition-all duration-300 border rounded-2xl p-4 flex gap-4 items-center overflow-hidden";
              const activeClass = isActive ? "bg-surface-container-high border-primary/20 shadow-sm" : "bg-surface-container-lowest border-transparent hover:bg-surface-container-low";
              
              return (
                <div key={v.id} className="relative group perspective" onClick={() => playVideo(v)}>
                  <div className={`absolute -right-0 top-1/2 -translate-y-1/2 w-1.5 h-10 rounded-l-md transition-all duration-300 ${isWatched ? 'bg-secondary' : (isActive ? 'bg-primary' : 'bg-transparent group-hover:bg-slate-300')} z-10`}></div>
                  <div className={`${baseClass} ${activeClass}`}>
                    
                    {/* Video Thumbnail Mock */}
                    <div className={`w-20 h-14 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 relative overflow-hidden ring-1 ${isActive ? 'ring-primary/20' : 'ring-outline-variant/20'}`}>
                       <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-[2px]" style={{backgroundImage: `url(${course?.image_url || ''})`}}></div>
                       <span className="material-symbols-outlined absolute text-white/80 drop-shadow-md z-10">{iconText}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="text-sm font-bold text-teal-900 font-headline truncate inline-block group-hover:text-primary transition-colors">
                          {String(idx + 1).padStart(2, '0')}. {v.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {v.duration && <span className="text-xs font-semibold text-slate-500 font-mono tracking-tight flex items-center gap-1"><span className="material-symbols-outlined text-[12px] opacity-70">timer</span> {v.duration}</span>}
                        {statusText && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBg} truncate`}>{statusText}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </main>

      {/* Navigation Shell for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/50 flex justify-around items-center py-2 z-50">
        {[
          { key: '/course', label: 'دروسي', icon: 'menu_book' },
          { key: '/quizzes', label: 'الاختبارات', icon: 'quiz' },
          { key: '/reports', label: 'التقارير', icon: 'analytics' },
          { key: '/settings', label: 'الإعدادات', icon: 'settings' },
        ].map(item => {
          const isActive = item.key === '/course'; // Highlighting دروسي for player
          return (
            <button key={item.key} onClick={() => navigate(item.key)} className={`flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-slate-400'}`}>
              <span className="material-symbols-outlined" style={isActive ? {fontVariationSettings: "'FILL' 1"} : {}}>{item.icon}</span>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          )
        })}
      </nav>
      
      {/* Feedback Modal (Styled to match new theme but keep the playful tone) */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant/20 shadow-2xl w-full max-w-md p-6 rounded-3xl animate-[nd-fadeUp_0.3s_ease]">
            <h3 className="font-black text-amber-500 text-xl mb-2 flex items-center gap-2 font-headline">
               <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>lightbulb</span> 
               صندوق الاقتراحات والفضفضة
            </h3>
            <p className="text-sm text-on-surface-variant mb-5 font-bold leading-relaxed">المساحة دي معمولة عشان تسمعك براحتك.. اكتب اللي في قلبك ومستر محمد زايد هيقراه بنفسه للتطوير.</p>
            <textarea 
              value={feedbackText} 
              onChange={(e)=>setFeedbackText(e.target.value)} 
              placeholder="فضفض، اقترح، أو اكتب مشكلتك هنا..." 
              className="w-full h-32 bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-4 text-on-surface text-sm font-medium outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none transition-all shadow-inner"
            ></textarea>
            <div className="flex gap-3 mt-5">
              <button onClick={submitFeedback} className="flex-1 bg-gradient-to-l from-amber-500 to-amber-400 text-amber-950 font-black py-3 rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/20 transition-all flex justify-center gap-2">
                 إرسال رسالتك <span className="material-symbols-outlined">send</span>
              </button>
              <button onClick={() => setIsFeedbackOpen(false)} className="px-6 border border-outline-variant text-slate-500 font-bold hover:bg-surface-container rounded-xl transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
