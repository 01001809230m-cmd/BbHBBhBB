import React, { useState, useEffect, Fragment } from 'react';
import { supabase, ADMIN_EMAIL } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardTab from './tabs/DashboardTab';
import ContentTab from './tabs/ContentTab';
import ActivationTab from './tabs/ActivationTab';
import StudentsTab from './tabs/StudentsTab';
import CodesTab from './tabs/CodesTab';
import HistoryTab from './tabs/HistoryTab';
import NotificationsTab from './tabs/NotificationsTab';
import MessagesTab from './tabs/MessagesTab';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isAuth, setIsAuth] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/');
                return;
            }
            
            // Try DB role check first, fall back to email check if column missing
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                const isAdminByRole  = ['admin', 'super_admin'].includes(profile?.role);
                const isAdminByEmail = user.email === ADMIN_EMAIL;

                if (!isAdminByRole && !isAdminByEmail) {
                    navigate('/all-courses');
                } else {
                    setIsAuth(true);
                }
            } catch {
                // Column missing — fall back to email comparison
                if (user.email !== ADMIN_EMAIL) {
                    navigate('/all-courses');
                } else {
                    setIsAuth(true);
                }
            }
        };
        checkUser();
    }, [navigate]);

    if (!isAuth) return null;

    return (
        <Fragment>
            <div className="flex h-screen overflow-hidden bg-slate-50 relative" dir="rtl">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
                
                <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full relative flex flex-col justify-between" id="main-content" style={{fontFamily: "'Cairo', sans-serif"}}>
                    <div className="w-full max-w-7xl mx-auto">
                        {activeTab === 'dashboard' && <DashboardTab />}
                        {activeTab === 'content' && <ContentTab />}
                        {activeTab === 'activation' && <ActivationTab />}
                        {activeTab === 'students' && <StudentsTab />}
                        {activeTab === 'codes' && <CodesTab />}
                        {activeTab === 'history' && <HistoryTab />}
                        {activeTab === 'notifications' && <NotificationsTab />}
                        {activeTab === 'messages' && <MessagesTab />}
                    </div>

                    <div className="text-center pt-8 pb-4 mt-auto border-t border-gray-200/60 w-full max-w-7xl mx-auto">
                        <p className="text-sm font-bold text-gray-500 mb-2 tracking-wide">
                            صُنع بكل حب من طالب نهل من علم أستاذه فكان العلم نوراً.
                        </p>
                        <p className="glowing-text font-black text-cyan-400 tracking-[0.2em] text-lg uppercase drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                            Created By Mustafa Mahmoud
                        </p>
                    </div>
                </main>
            </div>
        </Fragment>
    );
};

export default AdminDashboard;
