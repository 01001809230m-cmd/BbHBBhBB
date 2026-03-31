import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const NotificationsBell = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadIds, setUnreadIds] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      // 1. Fetch all notifications
      const { data: notifs, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notifError) throw notifError;

      // 2. Fetch reads for this user
      const { data: reads, error: readsError } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId);

      if (readsError) throw readsError;

      const readIds = reads.map(r => r.notification_id);
      
      // 3. Calculate unread
      const unread = notifs
        .filter(n => !readIds.includes(n.id))
        .map(n => n.id);

      setNotifications(notifs);
      setUnreadIds(unread);
      
      // Show tooltip if there are new notifications
      if (unread.length > 0) {
          setShowTooltip(true);
          // Hide it after 5 seconds automatically
          setTimeout(() => setShowTooltip(false), 5000);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const openNotifications = async () => {
    setIsOpen(!isOpen);
    setShowTooltip(false); // Hide tooltip when opening
    
    if (!isOpen && unreadIds.length > 0) {
      try {
        const readsToInsert = unreadIds.map(n_id => ({
          notification_id: n_id,
          user_id: userId
        }));
        
        await supabase.from('notification_reads').insert(readsToInsert);
        setUnreadIds([]); // Mark all as read locally instantly
      } catch (e) {
        console.error('Failed to mark notifications as read', e);
      }
    }
  };

  const latestUnreadTitle = unreadIds.length > 0 && notifications.find(n => n.id === unreadIds[0])?.title;

  return (
    <div className="relative z-50">
      {/* Bell Button */}
      <button 
        onClick={openNotifications} 
        className={`p-2 rounded-full transition-colors relative ${unreadIds.length > 0 ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:bg-surface-container-low'}`}>
        <span className={`material-symbols-outlined ${unreadIds.length > 0 ? 'animate-bounce' : ''}`} style={unreadIds.length > 0 ? {fontVariationSettings: "'FILL' 1"} : {}}>
          notifications
        </span>
        {unreadIds.length > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-error border border-white dark:border-slate-900 text-[8px] font-bold text-white items-center justify-center">
              {unreadIds.length > 9 ? '+9' : unreadIds.length}
            </span>
          </span>
        )}
      </button>

      {/* Tooltip for new notifications */}
      {showTooltip && unreadIds.length > 0 && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-surface border border-primary/20 shadow-2xl px-4 py-2 rounded-xl flex flex-col items-center gap-1 animate-fade-in-up whitespace-nowrap z-50 before:content-[''] before:absolute before:-top-2 before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-surface">
              <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">إشعار جديد</span>
              <span className="text-sm font-black text-primary">{latestUnreadTitle || 'لديك إشعارات جديدة لم تقرأها'}</span>
          </div>
      )}

      {/* Dropdown Modal */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute left-0 top-12 mt-2 w-80 max-h-96 overflow-y-auto bg-surface dark:bg-slate-900 border border-outline-variant/20 rounded-2xl shadow-2xl z-50 flex flex-col animate-[nd-fadeUp_0.2s_ease]">
            <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest sticky top-0 z-10">
              <h3 className="font-bold text-teal-900 dark:text-white font-headline">الإشعارات</h3>
              {unreadIds.length > 0 && <span className="text-xs text-primary font-bold bg-primary-container px-2 py-0.5 rounded-full">{unreadIds.length} جديد</span>}
            </div>
            
            <div className="p-2 flex flex-col gap-1">
              {loading ? (
                <div className="p-4 text-center text-sm text-slate-500">جاري التحميل...</div>
              ) : notifications.length === 0 ? (
                <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_paused</span>
                  <br/>لا توجد إشعارات جديدة
                </div>
              ) : (
                notifications.map(n => {
                  const isNew = unreadIds.includes(n.id);
                  const date = new Date(n.created_at).toLocaleDateString('ar-EG');
                  return (
                    <div key={n.id} className={`p-4 rounded-xl transition-colors ${isNew ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-container-lowest'}`}>
                      <div className="flex justify-between items-start mb-2 gap-3">
                        <h4 className={`text-sm break-words flex-1 leading-tight ${isNew ? 'font-black text-teal-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 bg-surface-container-low px-2 py-1 rounded-full shrink-0">{date}</span>
                      </div>
                      <p className={`text-xs leading-relaxed break-words whitespace-pre-wrap ${isNew ? 'text-slate-600 dark:text-slate-400 font-medium' : 'text-slate-500 dark:text-slate-500'}`}>
                        {n.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationsBell;
