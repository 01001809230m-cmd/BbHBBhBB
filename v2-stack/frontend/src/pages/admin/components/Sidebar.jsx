import React, { Fragment } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Icon, { paths } from './Icon';

const Sidebar = ({ activeTab, setActiveTab, isMobileOpen, setIsMobileOpen }) => {
    const navigate = useNavigate();

    const navItems = [
        { id: 'dashboard', name: 'الرئيسية والإحصائيات', icon: paths.dashboard },
        { id: 'content', name: 'إدارة المحتوى', icon: paths.bed },
        { id: 'activation', name: 'التفعيل المتعدد', icon: paths.calendar },
        { id: 'students', name: 'شئون الطلاب', icon: paths.user },
        { id: 'codes', name: 'مولد الأكواد', icon: paths.sparkles },
        { id: 'history', name: 'سجل الأكواد الشامل', icon: paths.list },
        { id: 'notifications', name: 'نظام الإشعارات', icon: paths.bell },
        { id: 'messages', name: 'رسائل وصندوق الفضفضة', icon: paths.star },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const handlePreview = () => {
        window.open('/', '_blank');
    };

    return (
        <Fragment>
            {isMobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileOpen(false)}></div>}

            <aside className={`fixed md:static inset-y-0 right-0 w-64 bg-slate-50 h-full p-4 flex flex-col border-l border-gray-200 shrink-0 z-50 transform transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                <div className="flex items-center justify-between mb-8 px-2 mt-2">
                    <div className="flex items-center gap-2">
                        <div className="text-xl font-black text-blue-900 tracking-tighter">Admin Panel</div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 mt-2"></div>
                    </div>
                    <button className="md:hidden text-gray-500" onClick={() => setIsMobileOpen(false)}>✕</button>
                </div>
                <nav className="flex flex-col gap-1 overflow-y-auto flex-1">
                    {navItems.map((item) => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileOpen(false); }} className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === item.id ? 'bg-yellow-200 text-gray-900 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 font-semibold'}`}>
                            <Icon path={item.icon} size={20} className={`ml-3 ${activeTab === item.id ? 'text-gray-800' : 'text-gray-400'}`} />
                            <span className="text-sm">{item.name}</span>
                        </button>
                    ))}
                </nav>
                <div className="mt-auto pt-4 border-t border-gray-200 space-y-1">
                    <button onClick={handlePreview} className="flex items-center w-full px-4 py-3 rounded-xl transition-all text-gray-500 hover:bg-gray-100 font-semibold text-sm">
                        <span>🌐 معاينة المنصة</span>
                    </button>
                    <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 rounded-xl transition-all text-red-600 hover:bg-red-50 font-semibold text-sm">
                        <Icon path={paths.logout} size={20} className="ml-3 text-red-500" />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </aside>
        </Fragment>
    );
};

export default Sidebar;
