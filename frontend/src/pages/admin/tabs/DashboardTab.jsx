import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import TopBar from '../components/TopBar';
import Icon, { paths } from '../components/Icon';

const DashboardTab = () => {
    const [stats, setStats] = useState({ students: 0, courses: 0, codes: 0, revenue: 0 });
    const chart1Ref = useRef(null);
    const chart2Ref = useRef(null);

    useEffect(() => {
        let chart1Instance = null;
        let chart2Instance = null;
        let isMounted = true;

        async function fetchStats() {
            const { count: students } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: courses } = await supabase.from('courses').select('*', { count: 'exact', head: true });
            
            // Real Revenue Calculation
            const { data: codesData } = await supabase.from('coupon_codes').select('is_used, courses(price)');
            let realRevenue = 0;
            let usedCodes = 0;
            let unusedCodes = 0;
            if (codesData) {
                codesData.forEach(c => {
                    if (c.is_used) {
                        usedCodes++;
                        realRevenue += c.courses?.price || 0;
                    } else {
                        unusedCodes++;
                    }
                });
            }

            // Real 7-day activity
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            const { data: progressData } = await supabase.from('video_progress').select('updated_at, watched_at').gte('updated_at', lastWeek.toISOString());
            
            const daysCount = [0, 0, 0, 0, 0, 0, 0];
            if (progressData) {
                progressData.forEach(p => {
                    const dateStr = p.watched_at || p.updated_at;
                    if (dateStr) {
                        const dayIndex = new Date(dateStr).getDay();
                        daysCount[dayIndex]++;
                    }
                });
            }

            if (!isMounted) return;
            setStats({ students: students || 0, courses: courses || 0, codes: usedCodes, revenue: realRevenue });

            // Ensure dark mode chart text logic - dynamically detect text color.
            const isDarkMode = document.documentElement.classList.contains('dark');
            const textColor = isDarkMode ? '#cbd5e1' : '#475569';
            const gridColor = isDarkMode ? '#334155' : '#f1f5f9';

            if (window.Chart) {
                if (chart1Ref.current) {
                    chart1Instance = new window.Chart(chart1Ref.current, {
                        type: 'doughnut',
                        data: {
                            labels: ['مستخدم', 'غير مستخدم'],
                            datasets: [{ data: [usedCodes, unusedCodes], backgroundColor: ['#ef4444', '#10b981'], borderWidth: 0 }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', weight: 'bold' }, color: textColor } } } }
                    });
                }
                if (chart2Ref.current) {
                    chart2Instance = new window.Chart(chart2Ref.current, {
                        type: 'bar',
                        data: {
                            labels: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
                            datasets: [{ label: 'مشاهدات الفيديوهات', data: daysCount, backgroundColor: '#06b6d4', borderRadius: 4 }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: 'Cairo', weight: 'bold' }, color: textColor } } }, scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { precision: 0, color: textColor, font: {weight: 'bold'} } }, x: { grid: { display: false }, ticks: { color: textColor, font: {weight: 'bold'} } } } }
                    });
                }
            }
        }
        fetchStats();

        return () => {
            isMounted = false;
            if (chart1Instance) chart1Instance.destroy();
            if (chart2Instance) chart2Instance.destroy();
        };
    }, []);

    return (
        <div className="animate-fade-in mb-8">
            <TopBar title="الرئيسية والإحصائيات" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-8">
                <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
                    <h3 className="text-slate-600 dark:text-slate-400 text-xs md:text-sm font-bold flex justify-between items-center">إجمالي الطلاب <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 text-cyan-500"><Icon path={paths.user} size={16} /></div></h3>
                    <div className="mt-3 text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.students}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
                    <h3 className="text-slate-600 dark:text-slate-400 text-xs md:text-sm font-bold flex justify-between items-center">إجمالي الكورسات <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 text-purple-500"><Icon path={paths.bed} size={16} /></div></h3>
                    <div className="mt-3 text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.courses}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
                    <h3 className="text-slate-600 dark:text-slate-400 text-xs md:text-sm font-bold flex justify-between items-center">الأكواد المحجوزة <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 text-amber-500"><Icon path={paths.star} size={16} /></div></h3>
                    <div className="mt-3 text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.codes}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
                    <h3 className="text-slate-600 dark:text-slate-400 text-xs md:text-sm font-bold flex justify-between items-center">المبيعات التقريبية <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 text-emerald-500"><Icon path={paths.wallet} size={16} /></div></h3>
                    <div className="mt-3 text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.revenue.toLocaleString()} ج</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 md:col-span-2 transition-colors">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">📈 معدل تفاعل الطلاب هذا الأسبوع</h3>
                    <div className="h-64"><canvas ref={chart2Ref}></canvas></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">🎟️ حالة أكواد المنصة</h3>
                    <div className="h-64"><canvas ref={chart1Ref}></canvas></div>
                </div>
            </div>
        </div>
    );
};

export default DashboardTab;
