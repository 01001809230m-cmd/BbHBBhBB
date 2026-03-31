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

            if (window.Chart) {
                if (chart1Ref.current) {
                    chart1Instance = new window.Chart(chart1Ref.current, {
                        type: 'doughnut',
                        data: {
                            labels: ['مستخدم', 'غير مستخدم'],
                            datasets: [{ data: [usedCodes, unusedCodes], backgroundColor: ['#ef4444', '#10b981'], borderWidth: 0 }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo' }, color: '#64748b' } } } }
                    });
                }
                if (chart2Ref.current) {
                    chart2Instance = new window.Chart(chart2Ref.current, {
                        type: 'bar',
                        data: {
                            labels: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
                            datasets: [{ label: 'مشاهدات الفيديوهات', data: daysCount, backgroundColor: '#0EA5E9', borderRadius: 5 }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: 'Cairo' }, color: '#64748b' } } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { precision: 0 } }, x: { grid: { display: false } } } }
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
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <h3 className="text-gray-500 text-xs md:text-sm font-bold flex justify-between items-center">إجمالي الطلاب <div className="bg-slate-50 p-2 rounded-lg"><Icon path={paths.user} size={16} className="text-cyan-500" /></div></h3>
                    <div className="mt-3 text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{stats.students}</div>
                </div>
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <h3 className="text-gray-500 text-xs md:text-sm font-bold flex justify-between items-center">إجمالي الكورسات <div className="bg-slate-50 p-2 rounded-lg"><Icon path={paths.bed} size={16} className="text-cyan-500" /></div></h3>
                    <div className="mt-3 text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{stats.courses}</div>
                </div>
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <h3 className="text-gray-500 text-xs md:text-sm font-bold flex justify-between items-center">الأكواد المحجوزة <div className="bg-slate-50 p-2 rounded-lg"><Icon path={paths.star} size={16} className="text-cyan-500" /></div></h3>
                    <div className="mt-3 text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{stats.codes}</div>
                </div>
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <h3 className="text-gray-500 text-xs md:text-sm font-bold flex justify-between items-center">المبيعات التقريبية <div className="bg-slate-50 p-2 rounded-lg"><Icon path={paths.wallet} size={16} className="text-cyan-500" /></div></h3>
                    <div className="mt-3 text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{stats.revenue.toLocaleString()} ج</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-1 md:col-span-2">
                    <h3 className="font-bold text-gray-700 mb-4">📈 معدل تفاعل الطلاب هذا الأسبوع</h3>
                    <div className="h-64"><canvas ref={chart2Ref}></canvas></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-700 mb-4">🎟️ حالة أكواد المنصة</h3>
                    <div className="h-64"><canvas ref={chart1Ref}></canvas></div>
                </div>
            </div>
        </div>
    );
};

export default DashboardTab;
