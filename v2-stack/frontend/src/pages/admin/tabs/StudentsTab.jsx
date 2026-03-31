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
            confirmButtonColor: currentStatus ? '#10b981' : '#ef4444',
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
            text: "سيتم إخراج الطالب من جميع الأجهزة المتصلة حالياً وإلغاء جلساته النبضية",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'نعم، اطرده',
            cancelButtonText: 'إلغاء'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
                    
                    const req = await fetch(`${apiUrl}/admin/users/suspend/${id}`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({ reason: 'إعادة ضبط الجلسات يدوياً من الأدمن' })
                    });
                    const resJson = await req.json();
                    if(!resJson.success) throw new Error(resJson.error || 'فشلت العملية');
                    Swal.fire({ icon: 'success', title: 'تم مسح الجلسات بنجاح', timer: 1500, showConfirmButton: false });
                    fetchStudents();
                } catch(err) {
                    Swal.fire('خطأ', err.message, 'error');
                }
            }
        });
    };

    const promoteToAdmin = async (id, name) => {
        Swal.fire({
            title: `ترقية ${name}؟`,
            text: "سيتم منح المستخدم صلاحيات إدارية",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            confirmButtonText: 'ترقية 🚀',
            cancelButtonText: 'إلغاء'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
                    
                    const req = await fetch(`${apiUrl}/admin/users/promote/${id}`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({ permissions: ['manage_content', 'view_reports'] })
                    });
                    const resJson = await req.json();
                    if(!resJson.success) throw new Error(resJson.error || 'فشلت العملية');
                    Swal.fire('تمت الترقية!', 'المستخدم أصبح مشرفاً الآن.', 'success');
                    fetchStudents();
                } catch(err) {
                    Swal.fire('خطأ', err.message, 'error');
                }
            }
        });
    };

    const filtered = students.filter(s => (s.full_name || '').toLowerCase().includes(searchTerm) || (s.phone || '').includes(searchTerm));

    return (
        <div className="animate-fade-in mb-8">
            <TopBar title="إدارة المستخدمين والأمان (11/10)" />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-sm font-bold text-slate-800">قائمة الأعضاء</h3>
                    <div className="relative">
                        <Icon path={paths.search} size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="text-xs text-slate-800 border border-gray-200 rounded-lg pr-8 pl-3 py-2 outline-none w-64 focus:border-cyan-400 font-bold" />
                    </div>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-right text-[13px]">
                        <thead className="bg-slate-50 text-gray-600 font-bold sticky top-0">
                            <tr>
                                <th className="px-5 py-4">العضو</th>
                                <th className="px-5 py-4">رقم الهاتف</th>
                                <th className="px-5 py-4">الدور</th>
                                <th className="px-5 py-4">الحالة</th>
                                <th className="px-5 py-4 text-center">إجراءات الأمان</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-800 font-semibold divide-y divide-gray-100">
                            {filtered.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div>{s.full_name || 'بدون اسم'}</div>
                                        <div className="text-[10px] text-gray-400 font-bold">{s.email}</div>
                                    </td>
                                    <td className="px-5 py-4 font-mono text-gray-500">{s.phone || '-'}</td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${s.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-gray-600'}`}>
                                            {s.role || 'student'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide ${!s.is_banned ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {!s.is_banned ? 'نشط' : 'محظور'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 flex gap-2 justify-center">
                                        {s.role !== 'admin' && !s.is_banned && (
                                            <button onClick={() => promoteToAdmin(s.id, s.full_name)} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1" title="ترقية لمشرف"><Icon path={paths.upgrade} size={14} /></button>
                                        )}
                                        <button onClick={() => toggleBan(s.id, s.is_banned)} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 flex items-center gap-1" title={!s.is_banned ? 'حظر' : 'فك الحظر'}><Icon path={paths.ban} size={14} /></button>
                                        <button onClick={() => logoutDevices(s.id)} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 hover:bg-red-100 flex items-center gap-1" title="طرد فوري من الأجهزة"><Icon path={paths.logout} size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentsTab;
