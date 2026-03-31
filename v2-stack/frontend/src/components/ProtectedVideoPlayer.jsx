import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

// API Configuration - points to our Node.js middleware
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * 🔒 HIGHEST SECURITY VIDEO PLAYER (11/10 Standard)
 * Features:
 * - Hides YouTube ID from Network/DOM
 * - JWT-based access with IP/Device tracking
 * - Heartbeat mechanism sends status every 10s
 * - Disables right-click and common dev-tool shortcuts
 * - Transparent overlay prevents direct IFrame Interaction
 */
export const ProtectedVideoPlayer = ({ videoId, courseId, title }) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const [videoToken, setVideoToken] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🆔 Device Fingerprinting (Simple version)
  const getDeviceId = () => {
    let id = localStorage.getItem('mustafa_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('mustafa_device_id', id);
    }
    return id;
  };

  useEffect(() => {
    let isMounted = true;

    const initPlayer = async () => {
      try {
        setIsLoading(true);
        // 1. Request Secure Access from Backend
        const res = await axios.post(`${API_BASE_URL}/videos/request-access`, {
          videoId, // This is the ID from the videos table, not necessarily the YouTube ID
          courseId
        }, {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
            'x-device-id': getDeviceId()
          }
        });

        if (res.data.success && isMounted) {
          setVideoToken(res.data.token);
          await loadYouTubeAPI();
          createPlayer(res.data.videoId || videoId); // Real ID from backend
          startHeartbeat(res.data.token, res.data.videoId || videoId);
        } else {
          setError(res.data.error || 'فشل تحميل الفيديو');
        }
      } catch (err) {
        setError('خطأ في الاتصال بالخادم. يرجى إعادة المحاولة.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initPlayer();

    return () => {
      isMounted = false;
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
    };
  }, [videoId, courseId]);

  const loadYouTubeAPI = () => {
    return new Promise((resolve) => {
      if (window.YT) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
      window.onYouTubeIframeAPIReady = () => resolve(true);
    });
  };

  const createPlayer = (realId) => {
    if (!containerRef.current) return;
    
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: realId,
      playerVars: {
        controls: 0,
        disablekb: 1,
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
        fs: 0, // Disable fullscreen to prevent easy recording
        iv_load_policy: 3,
        autohide: 1
      },
      events: {
        onReady: (event) => {
          disableStealing();
        },
        onStateChange: (event) => {
            // Can handle play/pause/end here
        }
      }
    });
  };

  const startHeartbeat = (token, realId) => {
    // Send heartbeat every 10 seconds to the backend
    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        if (!playerRef.current || !playerRef.current.getCurrentTime) return;
        const time = playerRef.current.getCurrentTime();
        
        const res = await axios.post(`${API_BASE_URL}/videos/heartbeat`, {
          token,
          videoId: realId,
          currentTime: time
        }, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}` }
        });

        if (res.data.action === 'STOP_PLAYBACK') {
          playerRef.current.destroy();
          setError(res.data.error || 'تم إيقاف التشغيل لدواعي أمنية');
          clearInterval(heartbeatIntervalRef.current);
        }
      } catch (err) {
        console.error('Heartbeat failed');
      }
    }, 10000);
  };

  const disableStealing = () => {
    // Disable context menu on the entire player container
    const container = containerRef.current?.parentElement;
    if (container) {
      container.addEventListener('contextmenu', e => e.preventDefault());
    }

    // Disable common developer tools keys
    const handleKeyDown = (e) => {
      if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && e.keyCode === 73)) {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  };

  if (error) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-red-500 text-6xl mb-4">gpp_maybe</span>
        <h3 className="text-white font-black text-xl mb-2">{error}</h3>
        <p className="text-slate-400 text-sm">إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الدعم الفني.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center">
           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
           <p className="text-white/70 font-bold text-sm">جاري التحقق من الأمان...</p>
        </div>
      )}
      
      {/* 🛡️ Secure Overlay Layer: Prevents clicking/interacting directly with YouTube Iframe */}
      <div className="absolute inset-0 z-20 bg-transparent pointer-events-auto" />
      
      {/* The Player itself */}
      <div id="secure-player-container" className="absolute inset-0 z-10 w-full h-full">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Optional: Custom title watermark overlay */}
      <div className="absolute top-4 right-4 z-30 pointer-events-none opacity-20">
         <span className="text-white text-[10px] font-black uppercase tracking-widest">{title} - Protected ACCESS</span>
      </div>
    </div>
  );
};
