import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Swal from 'sweetalert2';
import TopBar from '../components/TopBar';
import Icon, { paths } from '../components/Icon';

const HistoryTab = () => {
    const [history, setHistory] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedCodes, setSelectedCodes] = useState(new Set());
    const [coursesToAdd, setCoursesToAdd] = useState(new Set());
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchData = async () => {
        const { data: cData } = await supabase.from('courses').select('id, title');
        if (cData) setAllCourses(cData);

        const { data: hData } = await supabase.from('coupon_codes').select('*, profiles(full_name)').order('created_at', { ascending: false });
        if (hData) setHistory(hData);
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = history.filter(item => {
        if (search && !item.code.includes(search)) return false;
        if (filter === 'used' && !item.is_used && (!item.redeemed_courses || item.redeemed_courses.length === 0)) return false;
        if (filter === 'unused' && (item.is_used || (item.redeemed_courses && item.redeemed_courses.length > 0))) return false;
        return true;
    });

    const toggleCodeSelection = (code) => { const newSet = new Set(selectedCodes); newSet.has(code) ? newSet.delete(code) : newSet.add(code); setSelectedCodes(newSet); };
    const toggleSelectAll = (e) => { e.target.checked ? setSelectedCodes(new Set(filtered.map(c => c.code))) : setSelectedCodes(new Set()); };

    const applyBulkEdit = async () => {
        if (coursesToAdd.size === 0) return Swal.fire({ icon: 'warning', text: 'يرجى اختيار كورس واحد على الأقل لإضافته للأكواد المحددة.' });

        Swal.fire({
            title: 'تأكيد التحديث الجماعي',
            text: `سيتم إضافة الكورسات لـ ${selectedCodes.size} كود، هل أنت متأكد؟`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'تأكيد وحفظ',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#10b981'
        }).then(async (result) => {
            if (result.isConfirmed) {
                setIsUpdating(true);
                Swal.fire({ title: 'جاري التحديث...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

                const codesArr = Array.from(selectedCodes);
                const newCoursesArr = Array.from(coursesToAdd);

                for (let code of codesArr) {
                    const item = history.find(h => h.code === code);
                    const currentCourses = item.course_ids || [];
                    const newCourseSet = new Set([...currentCourses, ...newCoursesArr]);
                    await supabase.from('coupon_codes').update({ course_ids: Array.from(newCourseSet) }).eq('code', code);
                }

                Swal.fire({ icon: 'success', title: 'عملية ناجحة', text: `تم تحديث ${codesArr.length} كود بنجاح!`, confirmButtonColor: '#10b981' });
                setSelectedCodes(new Set()); setCoursesToAdd(new Set()); setIsUpdating(false); fetchData();
            }
        });
    };

    return (
        <div className="animate-fade-in mb-8">
            <TopBar title="سجل الأكواد الشامل" />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-col md:flex-row gap-4">
                    <h3 className="text-sm font-bold text-slate-800">متابعة وحالة الأكواد</h3>
                    <div className="flex gap-4 items-center w-full md:w-auto">
                        <select value={filter} onChange={e => setFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none font-bold bg-white text-gray-700 cursor-pointer hover:border-cyan-400">
                            <option value="all">الكل</option>
                            <option value="used">المستخدمة / المسحوبة</option>
                            <option value="unused">غير المستخدمة نهائياً</option>
                        </select>
                        <div className="relative flex-1 md:flex-none">
                            <Icon path={paths.search} size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث برقم الكود..." className="w-full text-xs text-slate-800 border border-gray-200 rounded-lg pr-8 pl-3 py-2 outline-none md:w-64 focus:border-cyan-400 font-bold" />
                        </div>
                    </div>
                </div>

                {selectedCodes.size > 0 && (
                    <div className="p-5 bg-blue-50 border-b border-blue-100 flex flex-col gap-3">
                        <div className="flex justify-between items-center"><h4 className="font-bold text-blue-900 text-sm">🛠️ ترقية الأكواد المحددة ({selectedCodes.size} كود): أضف كورسات جديدة لباقتهم</h4></div>
                        <div className="flex flex-wrap gap-2">
                            {allCourses.map(c => (
                                <label key={c.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-xs font-bold ${coursesToAdd.has(c.id) ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-white border-blue-200 text-gray-600 hover:border-cyan-400'}`}>
                                    <input type="checkbox" className="hidden" checked={coursesToAdd.has(c.id)} onChange={() => { const newSet = new Set(coursesToAdd); newSet.has(c.id) ? newSet.delete(c.id) : newSet.add(c.id); setCoursesToAdd(newSet); }} />
                                    {c.title}
                                </label>
                            ))}
                        </div>
                        <div>
                            <button onClick={applyBulkEdit} disabled={isUpdating} className="bg-slate-900 text-white px-5 py-2 rounded-lg font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg">⚡ تأكيد وحفظ التعديلات</button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-right text-[13px] whitespace-nowrap">
                        <thead className="bg-[#EAF4F6] text-gray-600 font-bold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-5 py-4"><input type="checkbox" className="w-4 h-4 accent-cyan-400 cursor-pointer" checked={selectedCodes.size > 0 && selectedCodes.size === filtered.length} onChange={toggleSelectAll} title="تحديد الكل" /></th>
                                <th className="px-5 py-4">رقم الكود</th>
                                <th className="px-5 py-4">حالة الباقة (الرصيد الجزئي)</th>
                                <th className="px-5 py-4">الطالب المالك</th>
                                <th className="px-5 py-4">تاريخ التوليد</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 font-semibold divide-y divide-gray-100">
                            {filtered.map(c => {
                                const total = c.course_ids ? c.course_ids.length : 0;
                                const used = c.redeemed_courses ? c.redeemed_courses.length : 0;
                                const isFull = c.is_used || used === total;
                                return (
                                    <tr key={c.code} className={`transition-colors ${selectedCodes.has(c.code) ? 'bg-cyan-50' : 'hover:bg-gray-50'}`}>
                                        <td className="px-5 py-4"><input type="checkbox" className="w-4 h-4 accent-cyan-400 cursor-pointer" checked={selectedCodes.has(c.code)} onChange={() => toggleCodeSelection(c.code)} /></td>
                                        <td className="px-5 py-4 font-mono text-lg text-cyan-500 tracking-widest font-black">{c.code}</td>
                                        <td className="px-5 py-4">
                                            <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${isFull ? 'bg-red-100 text-red-700 border border-red-200' : (used > 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-green-100 text-green-700 border border-green-200')}`}>
                                                {isFull ? 'مكتمل' : (used > 0 ? `ساري (${used}/${total})` : `متاح (${total})`)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-bold max-w-[150px] truncate">{c.profiles?.full_name || '-'}</td>
                                        <td className="px-5 py-4 text-gray-500">{new Date(c.created_at).toLocaleDateString('ar-EG')}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HistoryTab;
