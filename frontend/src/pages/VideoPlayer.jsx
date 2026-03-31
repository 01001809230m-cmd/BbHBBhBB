import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import PageLayout from '../components/PageLayout';

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
  const userRef = useRef(null);
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
      userRef.current = user;
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
      const isUnlocked = courseData?.is_free || enrolledIds.includes(courseId) || ['admin', 'super_admin'].includes(p?.role);

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
    container.innerHTML = ''; // Clean up

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
      const wrapper = container.querySelector('.plyr');
      
      // Inject Watermark into Plyr wrapper so it shows in fullscreen
      if (wrapper && !wrapper.querySelector('#gv-watermark')) {
        const wm = document.createElement('div');
        wm.id = 'gv-watermark';
        wm.className = 'absolute z-[9999] pointer-events-none text-emerald-500/80 text-[10px] sm:text-xs font-bold p-1 transition-all duration-1000 select-none';
        wm.style.textShadow = '0 0 4px rgba(0,0,0,0.3)';
        wrapper.appendChild(wm);
        
        const updateWM = () => {
          const p = profileRef.current;
          wm.innerHTML = `${p?.full_name || ''}<br/>${p?.phone || ''}`;
          const top = Math.random() * 80 + 5;
          const left = Math.random() * 70 + 5;
          wm.style.top = top + '%';
          wm.style.left = left + '%';
        };
        updateWM();
        watermarkInterval.current = setInterval(updateWM, 8000);
      }

      if (wrapper && v.source_type === 'youtube') {
        const iframe = wrapper.querySelector('iframe');
        if (iframe) {
            iframe.style.height = '300%';
            iframe.style.top = '-100%';
            iframe.style.pointerEvents = 'none';
        }
      }

      if (wrapper && !wrapper.querySelector('.gv-speed-menu')) {
        const menuStyle = 'position:absolute;bottom:55px;background:rgba(4,8,18,.98);border:1px solid rgba(0,229,255,.3);border-radius:12px;padding:4px;width:90px;z-index:3000;display:flex;flex-direction:column;gap:2px;box-shadow:0 10px 25px rgba(0,0,0,.8);';
        
        const sMenu = document.createElement('div');
        sMenu.className = 'gv-speed-menu'; sMenu.style.cssText = menuStyle + 'display:none;';
        sMenu.innerHTML = `<div style="text-align:center;font-size:9px;color:#00e5ff;font-weight:900;padding:3px 0;border-bottom:1px solid rgba(0,229,255,.1);margin-bottom:3px;">السرعة</div>
          ${[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => `<div data-speed="${s}" style="padding:6px;font-size:11px;color:${s === 1 ? '#000' : '#fff'};cursor:pointer;border-radius:6px;text-align:center;background:${s === 1 ? 'linear-gradient(135deg,#00e5ff,#0066ff)' : 'transparent'};font-weight:${s === 1 ? 'bold' : 'normal'}">${s === 1 ? '1x' : s + 'x'}</div>`).join('')}`;
        
        const qMenu = document.createElement('div');
        qMenu.className = 'gv-quality-menu'; qMenu.style.cssText = menuStyle + 'display:none;';
        qMenu.innerHTML = `<div style="text-align:center;font-size:9px;color:#00e5ff;font-weight:900;padding:3px 0;border-bottom:1px solid rgba(0,229,255,.1);margin-bottom:3px;">الجودة</div>
          ${['تلقائي', '1080p', '720p', '480p', '360p'].map((q, i) => `<div style="padding:6px;font-size:11px;color:${i === 0 ? '#000' : '#fff'};cursor:pointer;border-radius:6px;text-align:center;background:${i === 0 ? 'linear-gradient(135deg,#00e5ff,#0066ff)' : 'transparent'};font-weight:${i === 0 ? 'bold' : 'normal'}">${q}</div>`).join('')}`;
        
        wrapper.appendChild(sMenu); 
        wrapper.appendChild(qMenu);
        const controls = wrapper.querySelector('.plyr__controls');
        const fsbtn = controls?.querySelector('[data-plyr="fullscreen"]');
        
        if (controls && fsbtn) {
          controls.style.zIndex = '30'; // Ensure controls are above click layer
          const speedBtnEl = document.createElement('button');
          speedBtnEl.className = 'plyr__controls__item plyr__control gv-speed-btn';
          speedBtnEl.style.cssText = 'display:flex;align-items:center;gap:4px;padding:5px 10px;font-weight:bold;font-size:13px;background:transparent;border:none;color:#fff;cursor:pointer;border-radius:4px;z-index:40;';
          speedBtnEl.innerHTML = `<span>⚡</span><span class="gv-spd-txt">1x</span>`;
          speedBtnEl.addEventListener('click', e => { 
            e.stopPropagation(); 
            const r = speedBtnEl.getBoundingClientRect(); 
            const w = wrapper.getBoundingClientRect(); 
            sMenu.style.right = (w.right - r.right) + 'px'; 
            sMenu.style.display = sMenu.style.display === 'none' ? 'flex' : 'none'; 
            qMenu.style.display = 'none'; 
          });
          controls.insertBefore(speedBtnEl, fsbtn);

          const qualBtnEl = document.createElement('button');
          qualBtnEl.className = 'plyr__controls__item plyr__control gv-qual-btn';
          qualBtnEl.style.cssText = speedBtnEl.style.cssText;
          qualBtnEl.innerHTML = `<span style="font-size:18px">⚙️</span>`;
          qualBtnEl.addEventListener('click', e => { 
            e.stopPropagation(); 
            const r = qualBtnEl.getBoundingClientRect(); 
            const w = wrapper.getBoundingClientRect(); 
            qMenu.style.right = (w.right - r.right) + 'px'; 
            qMenu.style.display = qMenu.style.display === 'none' ? 'flex' : 'none'; 
            sMenu.style.display = 'none'; 
          });
          controls.insertBefore(qualBtnEl, fsbtn);

          // Now add listeners to menu items that reference the buttons
          sMenu.querySelectorAll('[data-speed]').forEach(el => {
            el.addEventListener('click', e => {
              e.stopPropagation();
              const speed = parseFloat(el.dataset.speed);
              if (playerRef.current) playerRef.current.speed = speed;
              sMenu.querySelectorAll('[data-speed]').forEach(o => { o.style.background = ''; o.style.color = '#fff'; o.style.fontWeight = 'normal'; });
              el.style.background = 'linear-gradient(135deg,#00e5ff,#0066ff)'; el.style.color = '#000'; el.style.fontWeight = 'bold';
              sMenu.style.display = 'none';
              const txt = speedBtnEl.querySelector('.gv-spd-txt'); 
              if (txt) txt.textContent = speed === 1 ? '1x' : speed + 'x';
            });
          });
        }

        qMenu.querySelectorAll('div+div').forEach((el, i) => {
          el.addEventListener('click', e => {
            e.stopPropagation();
            qMenu.querySelectorAll('div+div').forEach(o => { o.style.background = ''; o.style.color = '#fff'; o.style.fontWeight = 'normal'; });
            el.style.background = 'linear-gradient(135deg,#00e5ff,#0066ff)'; el.style.color = '#000'; el.style.fontWeight = 'bold';
            qMenu.style.display = 'none';
          });
        });

        document.addEventListener('click', () => { sMenu.style.display = 'none'; qMenu.style.display = 'none'; });
      }

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
      
      if (wrapper && !wrapper.querySelector('.gv-click-layer')) {
        const clickLayer = document.createElement('div');
        clickLayer.className = 'gv-click-layer absolute top-0 left-0 right-0 bottom-[80px] z-20 cursor-pointer'; // Increased bottom space
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
      
      progressInterval.current = setInterval(async () => {
        if (!player || player.paused || player.ended) return;
        const currentTime = Math.floor(player.currentTime);
        if (currentTime < 5) return;
        const uid = userRef.current?.id;
        if (!uid) return;
        await supabase.from('video_progress').upsert({
          user_id: uid,
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

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <PageLayout profile={profileRef.current}>
      <nav className="flex items-center gap-2 text-xs font-bold text-on-surface-variant bg-surface-container-lowest px-4 py-3 rounded-2xl border border-outline-variant/20 shadow-sm w-fit dark:bg-slate-800 dark:border-slate-700">
        <span className="material-symbols-outlined text-[16px] text-primary">school</span>
        <button onClick={() => navigate('/all-courses')} className="hover:text-primary transition-colors">الكورسات</button>
        <span className="material-symbols-outlined text-[16px] text-outline-variant">chevron_left</span>
        <span className="text-on-surface">{course?.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
        <div className="lg:col-span-2 xl:col-span-3 space-y-6">
          <div className="bg-black rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-outline-variant/10 group relative isolate w-full pb-[56.25%] min-h-[250px]">
            <div id="gv-playerContainer" ref={playerContainerRef} className="absolute inset-0 w-full h-full bg-black">
              {!currentVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
                  <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-white/70 font-bold text-sm">جاري تحضير المحاضرة...</p>
                </div>
              )}
            </div>
          </div>

          {/* Title & Actions Block - RESTORED */}
          <div className="bg-surface-container-lowest dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-outline-variant/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-headline font-black text-on-background dark:text-white mb-2">
                {currentVideo ? currentVideo.title : 'جاري التحميل...'}
              </h1>
              <p className="text-sm text-on-surface-variant font-bold">
                {currentVideo ? currentVideo.description : ''}
              </p>
            </div>
            
            <div className="flex gap-3 flex-wrap">
              {currentVideo?.attachment_url && (
                <a href={currentVideo.attachment_url} target="_blank" rel="noreferrer"
                  className="px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-secondary hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                  تحميل المذكرة
                </a>
              )}
              <button 
                onClick={() => { if(currentVideo) markVideoAsWatched(currentVideo.id); }}
                className="px-5 py-2 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                تمييز كمكتمل
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-3xl border border-outline-variant/20 shadow-sm overflow-hidden h-[calc(100vh-200px)] flex flex-col">
            <div className="p-5 border-b border-outline-variant/15 bg-surface-container-lowest/90 dark:bg-slate-800/90 backdrop-blur-sm z-10 sticky top-0">
               <h3 className="font-headline font-black text-lg text-on-surface dark:text-white leading-tight">
                 {course?.title || 'جاري التحميل...'}
               </h3>
               <div className="flex justify-between items-center mt-3 text-[10px] text-on-surface-variant font-bold uppercase tracking-wide">
                  <span>المحتويات</span>
                  <span>{videos.filter((v) => watchedIds.has(v.id)).length} / {videos.length} مكتمل</span>
               </div>
               <div className="h-1.5 bg-surface-container dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{width:`${(videos.filter((v) => watchedIds.has(v.id)).length/Math.max(videos.length,1))*100}%`}}></div>
               </div>
            </div>
            
            <div className="p-3 space-y-2 overflow-y-auto flex-1 h-[calc(100vh-280px)]">
               {videos.map((v, i) => {
                 const isActive = (v.id === currentVideo?.id);
                 const isWatched = watchedIds.has(v.id);
                 return (
                   <button
                     key={v.id}
                     onClick={() => playVideo(v)}
                     className={`w-full flex items-start gap-3 p-3 text-right transition-all group rounded-2xl
                       ${isActive 
                         ? 'bg-primary border-primary text-white shadow-md' 
                         : 'hover:bg-surface-container-low dark:hover:bg-slate-700 text-on-surface dark:text-white bg-surface-container-lowest dark:bg-slate-800'}`}
                   >
                     <div className={`mt-0.5 w-6 h-6 rounded-full flex flex-shrink-0 items-center justify-center border-2 transition-colors
                       ${isActive ? 'bg-primary border-white/50 text-white' 
                       : isWatched ? 'bg-secondary border-secondary text-white' : 'border-outline-variant/40 dark:border-slate-600 text-transparent bg-transparent'}`}>
                       {isActive ? <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                       : isWatched ? <span className="material-symbols-outlined text-[12px] font-black">check</span> : ''}
                     </div>
                     <div className="flex-1">
                       <p className={`text-sm font-bold leading-tight mb-0.5 transition-colors
                         ${isActive ? 'text-white' : 'text-on-surface dark:text-slate-200 group-hover:text-primary dark:group-hover:text-cyan-400'}`}>
                         {i+1}. {v.title}
                       </p>
                     </div>
                   </button>
                 );
               })}
            </div>
          </div>
          
          <button onClick={() => setIsFeedbackOpen(true)} className="flex items-center justify-center gap-2 w-full text-secondary dark:text-cyan-600 bg-secondary/10 dark:bg-cyan-950/40 hover:bg-secondary hover:text-white px-6 py-4 rounded-2xl font-black transition-all border border-secondary/20 dark:border-cyan-900/50 hover:border-transparent active:scale-95 shadow-sm">
             <span className="material-symbols-outlined">volunteer_activism</span>
             <span className="text-sm">رسالة/فضفضة للمستر</span>
          </button>

          {/* Chapters Section - MOVED TO SIDEBAR */}
          {chapters && chapters.length > 0 && (
            <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-3xl border border-outline-variant/20 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-outline-variant/15 bg-surface-container-low dark:bg-slate-700/30">
                <h3 className="font-headline font-black text-sm text-on-surface dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">segment</span>
                  أجزاء الحصة
                </h3>
              </div>
              <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                {chapters.map((ch, idx) => {
                  const words = ch.title.split(' ');
                  const firstWord = words[0];
                  const rest = words.slice(1).join(' ');
                  return (
                    <button 
                      key={idx}
                      onClick={() => { if(playerRef.current) playerRef.current.currentTime = ch.time; }}
                      className="w-full flex items-center justify-between p-3 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-xl transition-all group text-right border border-transparent hover:border-primary/20"
                    >
                      <div className="flex flex-col items-start text-[13px] font-bold">
                        <span className="text-primary-600 dark:text-primary leading-tight">{firstWord}</span>
                        <span className="text-on-surface-variant dark:text-slate-400 group-hover:text-on-surface dark:group-hover:text-white leading-tight mt-0.5">{rest}</span>
                      </div>
                      <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        {Math.floor(ch.time / 60)}:{(ch.time % 60).toString().padStart(2, '0')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

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
    </PageLayout>
  );
};

export default VideoPlayer;
