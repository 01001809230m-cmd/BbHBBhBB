import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Swal from 'sweetalert2';
import TopBar from '../components/TopBar';
import Icon, { paths } from '../components/Icon';

const StudentsTab = () => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchStudents = async () => {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (data) setStudents(data);
    };

    useEffect(() => { fetchStudents(); }, []);

    const toggleBan = async (id, currentStatus) => {
        Swal.fire({
            title: currentStatus ? 'فك الحظر؟' : 'تأكيد الحظر؟',
            text: currentStatus ? "سيتمكن الطالب من الدخول مجدداً" : "سيتم طرد الطالب ومنعه من الدخول",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentStatus ? '#10b981' : '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'نعم، نفذ!',
            cancelButtonText: 'إلغاء'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', id);
                fetchStudents();
                Swal.fire({ icon: 'success', title: 'تمت العملية', timer: 1500, showConfirmButton: false });
            }
        });
    };

    const logoutDevices = async (id) => {
        Swal.fire({
            title: 'طرد الأجهزة؟',
            text: "سيتم إخراج الطالب من جميع الأجهزة المتصلة حالياً",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'نعم، اطرده',
            cancelButtonText: 'إلغاء'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Replace logic with direct update to a 'force_logout' or handle it if API is down.
                    // For now keeping your API route logic.
                    const { data: { session } } = await supabase.auth.getSession();
                    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                    
                    const req = await fetch(`${apiUrl}/api/admin/logout-devices`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({ studentId: id })
                    });
                    const resJson = await req.json();
                    if(!resJson.success) throw new Error(resJson.error || 'فشلت العملية');
                    Swal.fire({ icon: 'success', title: 'تم مسح الجلسات بنجاح', timer: 1500, showConfirmButton: false });
                } catch(err) {
                    Swal.fire('خطأ', err.message, 'error');
                }
            }
        });
    };

    const filtered = students.filter(s => (s.full_name || '').toLowerCase().includes(searchTerm) || (s.phone || '').includes(searchTerm));

    return (
        <div className="animate-fade-in mb-8">
            <TopBar title="شئون الطلاب المتقدمة" />
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 transition-colors">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">قائمة الطلاب</h3>
                    <div className="relative">
                        <Icon path={paths.search} size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pr-9 pl-3 py-2 outline-none w-64 focus:border-cyan-500 font-bold transition-colors shadow-sm dark:placeholder-slate-400" />
                    </div>
                </div>
                <div className="max-h-[500px] overflow-y-auto w-full">
                    <table className="w-full text-right text-[13px]">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700 transition-colors z-10">
                            <tr>
                                <th className="px-5 py-4">اسم الطالب</th>
                                <th className="px-5 py-4">رقم الهاتف</th>
                                <th className="px-5 py-4">الحالة</th>
                                <th className="px-5 py-4">إجراءات الأمان</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-900 dark:text-white font-semibold divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900 transition-colors">
                            {filtered.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-5 py-4">{s.full_name || 'بدون اسم'}</td>
                                    <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-400">{s.phone || '-'}</td>
                                    <td className="px-5 py-4">
                                        <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide ${!s.is_banned ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400'}`}>
                                            {!s.is_banned ? 'نشط' : 'محظور'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 flex gap-2">
                                        <button onClick={() => toggleBan(s.id, s.is_banned)} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                                            <Icon path={paths.ban} size={14} className={!s.is_banned ? 'text-rose-500' : 'text-emerald-500'} /> 
                                            {!s.is_banned ? 'حظر' : 'فك الحظر'}
                                        </button>
                                        <button onClick={() => logoutDevices(s.id)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center gap-1">
                                            <Icon path={paths.logout} size={14} className="text-blue-500 dark:text-blue-400" /> طرد الأجهزة
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-slate-500 dark:text-slate-400 font-bold">لا يوجد تطابق للبحث.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentsTab;
