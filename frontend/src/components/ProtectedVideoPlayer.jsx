import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

// تكوين عميل الاتصال بسيرفر الأمان
const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

// إرفاق التوكن بشكل افتراضي
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const ProtectedVideoPlayer = ({ videoId, courseId }) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const heartbeatRef = useRef(null);
  
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    // 1. طلب تصريح مشاهدة
    const initPlayer = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.post('/videos/request-access', { videoId, courseId });
        
        if (res.data.success && isMounted) {
          const ytId = new URL(res.data.embedUrl).pathname.split('/').pop() || '';
          await loadYouTubeAPI();
          createPlayer(res.data.token, ytId);
        }
      } catch (err) {
        if (isMounted) setErrorMsg(err.response?.data?.error || 'Access Denied: Unrecognized User.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    initPlayer();

    return () => { 
        isMounted = false; 
        if (heartbeatRef.current) clearInterval(heartbeatRef.current); 
        playerRef.current?.destroy(); 
    };
  }, [videoId, courseId]);

  // 2. تحميل مكتبة اليوتيوب الآمنة
  const loadYouTubeAPI = () => new Promise(resolve => {
    if (window.YT) return resolve(true);
    const script = document.createElement('script'); 
    script.src = 'https://www.youtube.com/iframe_api'; 
    document.body.appendChild(script);
    window.onYouTubeIframeAPIReady = () => resolve(true);
  });

  // 3. إنشاء مشغل غير قابل للتفاعل 
  const createPlayer = (token, ytVideoId) => {
    if (!containerRef.current) return;
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: ytVideoId,
      playerVars: { 
          controls: 0, 
          disablekb: 1, 
          rel: 0, 
          modestbranding: 1, 
          origin: window.location.origin, 
          fs: 0 
      },
      events: { 
          onReady: () => { 
              startHeartbeat(token, ytVideoId); 
              disableInterop(); 
          } 
      }
    });
  };

  // 4. ارسال نبض مستمر (Heartbeat) يضمن بقاء الشخص وتأكيد شرعية الـ Session
  const startHeartbeat = (token, ytVideoId) => {
    heartbeatRef.current = setInterval(async () => {
      try {
        await apiClient.post('/videos/heartbeat', { 
            token, 
            videoId, 
            youtubeVideoId: ytVideoId, 
            currentTime: playerRef.current?.getCurrentTime() 
        });
      } catch {
        clearInterval(heartbeatRef.current); 
        playerRef.current?.destroy();
        setErrorMsg('Security Block: Connection closed or tampering detected.');
      }
    }, 10000);
  };

  // 5. إبطال عمل أزرار التحميل، نسخ الروابط وأدوات المتصفح (Inspect)
  const disableInterop = () => {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.onkeydown = e => { 
        if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && e.keyCode === 73)) { 
            e.preventDefault(); 
            return false; 
        } 
    };
  };

  if (errorMsg) {
      return (
        <div className="w-full aspect-video bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center border border-red-500 rounded">
            <p className="text-slate-900 dark:text-slate-100 font-bold">{errorMsg}</p>
        </div>
      );
  }

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded overflow-hidden group border border-slate-200 dark:border-slate-800">
      {isLoading && (
          <div className="absolute inset-0 z-20 flex justify-center items-center bg-slate-50 dark:bg-slate-950">
              <div className="animate-spin h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100 rounded-full"></div>
          </div>
      )}
      
      {/* طبقات حماية الشاشة تمنع النقر المباشر */}
      <div className="absolute inset-0 z-10 bg-transparent" onContextMenu={e => e.preventDefault()} />
      
      {/* أزرار التحكم المُدارة من السيستم الخارجي وليس يوتيوب */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-4 opacity-0 group-hover:opacity-100 transition">
        <button onClick={() => playerRef.current?.playVideo()} className="px-4 py-2 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-slate-400">تشغيل</button>
        <button onClick={() => playerRef.current?.pauseVideo()} className="px-4 py-2 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-slate-400">إيقاف</button>
      </div>

      {/* مشغل يوتيوب الخفي */}
      <div ref={containerRef} className="absolute inset-0 z-0 w-full h-full pointer-events-none" />
    </div>
  );
};
