import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Swal from 'sweetalert2';
import TopBar from '../components/TopBar';

const ActivationTab = () => {
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState(new Set());
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        async function loadData() {
            const { data: cData } = await supabase.from('courses').select('id, title');
            if (cData) setCourses(cData);
        }
        loadData();
    }, []);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return setStudents([]);
        setIsSearching(true);
        const { data: sData } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .or(`full_name.ilike.%${searchTerm.trim()}%,phone.ilike.%${searchTerm.trim()}%`)
            .limit(50);
        setIsSearching(false);
        if (sData) setStudents(sData);
    };

    const toggleCourse = (id) => { const newSet = new Set(selectedCourses); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setSelectedCourses(newSet); };
    const toggleStudent = (id) => { const newSet = new Set(selectedStudents); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setSelectedStudents(newSet); };
    const filteredStudents = students;

    const handleExecute = async () => {
        if (selectedCourses.size === 0 || selectedStudents.size === 0) return Swal.fire({ icon: 'warning', text: 'يرجى تحديد كورسات وطلاب أولاً' });
        let enrollments = [];
        selectedStudents.forEach(s_id => {
            selectedCourses.forEach(c_id => { enrollments.push({ student_id: s_id, course_id: c_id }); });
        });
        const { error } = await supabase.from('enrollments').upsert(enrollments, { onConflict: 'student_id, course_id' });
        if (!error) {
            Swal.fire({ icon: 'success', title: 'عملية ناجحة', text: 'تم التفعيل بنجاح للجميع!', confirmButtonColor: '#10b981' });
            setSelectedStudents(new Set()); setSelectedCourses(new Set());
        } else {
            Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
        }
    };

    return (
        <div className="animate-fade-in mb-8">
            <TopBar title="التفعيل اليدوي المتعدد" />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[65vh]">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-800">تحديد الكورسات والطلاب ({selectedStudents.size} طالب محدد)</h3>
                    <button onClick={handleExecute} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 shadow-lg">تنفيذ التفعيل الآن</button>
                </div>
                <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                    <div className="w-full md:w-1/3 border-l border-gray-100 p-5 overflow-y-auto bg-white">
                        <h4 className="font-bold text-gray-500 mb-4 text-sm">1. اختر الكورسات (باقات)</h4>
                        <div className="space-y-3">
                            {courses.map(c => (
                                <label key={c.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-cyan-400 transition">
                                    <input type="checkbox" checked={selectedCourses.has(c.id)} onChange={() => toggleCourse(c.id)} className="w-5 h-5 accent-cyan-400" />
                                    <span className="font-bold text-gray-800 text-sm">{c.title}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="w-full md:w-2/3 p-5 overflow-y-auto bg-slate-50">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedStudents(new Set(filteredStudents.map(s => s.id)))} className="bg-yellow-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-yellow-300">تحديد الكل</button>
                                <button onClick={() => setSelectedStudents(new Set())} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-red-200">إلغاء التحديد</button>
                            </div>
                            <div className="flex gap-2">
                                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="بحث باسم الطالب..." className="text-xs border border-gray-200 rounded-lg px-3 py-2 w-48 outline-none focus:border-cyan-400 text-slate-800" />
                                <button onClick={handleSearch} disabled={isSearching} className="bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-cyan-600 disabled:opacity-50">بحث</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredStudents.length === 0 && !isSearching && <p className="text-sm font-bold text-gray-400 col-span-2 text-center py-8">قم بالبحث عن طالب لإظهاره هنا واستخدم رقم الهاتف للحصول على نتيجة سريعة.</p>}
                            {isSearching && <p className="text-sm font-bold text-cyan-500 col-span-2 text-center py-8">جاري البحث...</p>}
                            {filteredStudents.map(s => (
                                <div key={s.id} onClick={() => toggleStudent(s.id)} className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition ${selectedStudents.has(s.id) ? 'bg-cyan-50 border-cyan-400' : 'bg-white border-gray-200 hover:border-cyan-400'}`}>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">{s.full_name || 'بدون اسم'}</p>
                                        <p className="text-[10px] text-gray-500 font-mono mt-1">{s.phone || '-'}</p>
                                    </div>
                                    <input type="checkbox" checked={selectedStudents.has(s.id)} readOnly className="w-5 h-5 accent-cyan-400" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivationTab;
