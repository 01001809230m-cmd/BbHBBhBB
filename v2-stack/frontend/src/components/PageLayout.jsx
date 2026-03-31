import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../context/ThemeProvider';
import NotificationsBell from './NotificationsBell';

const PageLayout = ({ children, profile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    navigate('/'); 
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const navItems = [
    { key: '/all-courses', label: 'الكورسات', icon: 'school' },
    { key: '/quizzes', label: 'الاختبارات', icon: 'quiz' },
    { key: '/reports', label: 'التقارير', icon: 'analytics' },
    { key: '/settings', label: 'الإعدادات', icon: 'settings' },
  ];

  const avatarLetter = profile?.full_name?.[0] || 'ط';

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body selection:bg-primary-fixed selection:text-on-primary-fixed" dir="rtl">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ════ SIDEBAR ════ */}
      <aside className={`fixed right-0 top-0 h-screen w-64 flex flex-col z-50 transition-transform duration-300 bg-surface-container-lowest border-l border-outline-variant/30 py-6 overflow-y-auto
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full md:translate-x-0'}`}>
        
        {/* Branding */}
        <div className="px-6 mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/25">
              <span className="material-symbols-outlined text-[20px]">science</span>
            </div>
            <h1 className="text-lg font-black text-on-surface font-headline leading-tight">ا.محمد زايد</h1>
          </div>
          <button className="md:hidden text-on-surface-variant p-1 bg-surface-container rounded-lg hover:bg-surface-container-high transition-colors" onClick={closeSidebar}>✕</button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname.includes(item.key);
            return (
            <button key={item.key} onClick={() => { navigate(item.key); closeSidebar(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-right
                ${isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-on-surface font-bold hover:bg-surface-container hover:text-primary dark:text-slate-100'}`}>
              <span className="material-symbols-outlined text-[20px]"
                style={isActive ? {fontVariationSettings:"'FILL' 1"} : {}}>{item.icon}</span>
              <span className="text-sm text-right">{item.label}</span>
            </button>
            )
          })}
        </nav>

        {/* Support + Logout */}
        <div className="px-4 mt-auto">
          <button onClick={toggleTheme} className="flex items-center justify-between w-full px-4 py-3 mb-2 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container transition-colors group">
            <span className="flex items-center gap-2 font-bold text-sm">
                <span className="material-symbols-outlined text-[18px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                {theme === 'dark' ? 'الوضع المضيء' : 'الوضع المظلم'}
            </span>
          </button>
          <button onClick={handleLogout} className="flex items-center justify-between w-full px-4 py-3 bg-error-container/50 hover:bg-error-container text-on-error-container rounded-xl transition-colors group">
            <span className="flex items-center gap-2 font-bold text-sm"><span className="material-symbols-outlined text-[18px]">logout</span> تسجيل خروج</span>
          </button>
        </div>
      </aside>

      {/* ════ MAIN CONTENT ════ */}
      <main className={`min-h-screen transition-all duration-300 md:mr-64 ${sidebarOpen ? 'mr-0' : 'mr-0'}`}>
        {/* TOP APP BAR */}
        <header className={`fixed top-0 left-0 right-0 md:right-64 z-30 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-outline-variant/10 px-6 py-3 flex justify-between items-center ${sidebarOpen ? 'right-0' : 'right-0'}`}>
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high transition-all shadow-sm"
              onClick={toggleSidebar}>
              <span className="material-symbols-outlined text-primary font-black">more_vert</span>
            </button>
            <h2 className="text-xl font-headline font-black text-slate-900 dark:text-white">ا.محمد زايد</h2>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsBell userId={profile?.id} />
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-black shadow-lg">
              {avatarLetter}
            </div>
          </div>
        </header>

        {/* Render child content */}
        <div className="pt-24 pb-24 lg:pb-16 px-6 lg:px-10 max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>

      {/* ════ BOTTOM NAV (Mobile) ════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-outline-variant/20 px-6 py-2 flex justify-around items-center z-50">
        {navItems.map(item => {
          const isActive = location.pathname.includes(item.key);
          return (
            <button key={item.key} onClick={() => navigate(item.key)}
              className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-on-surface-variant dark:text-slate-400'}`}>
              <span className="material-symbols-outlined text-[20px]"
                style={isActive ? {fontVariationSettings:"'FILL' 1"} : {}}>{item.icon}</span>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  );
};

export default PageLayout;
