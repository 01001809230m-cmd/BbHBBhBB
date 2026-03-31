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
        
        try {
            // Inserting instead of upserting if unique constraint isn't perfectly matched.
            const { error } = await supabase.from('enrollments').insert(enrollments);
            if (!error || error.code === '23505') { // 23505 is unique violation (already enrolled)
                Swal.fire({ icon: 'success', title: 'عملية ناجحة', text: 'تم التفعيل بنجاح للجميع!', confirmButtonColor: '#10b981' });
                setSelectedStudents(new Set()); setSelectedCourses(new Set());
            } else {
                Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ غير متوقع' });
        }
    };

    return (
        <div className="animate-fade-in mb-8">
            <TopBar title="التفعيل اليدوي المتعدد" />
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[65vh]">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center transition-colors">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        تحديد الكورسات والطلاب ({selectedStudents.size} محدد)
                    </h3>
                    <button onClick={handleExecute} className="bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 px-6 py-2 rounded-lg font-bold text-sm hover:bg-cyan-700 dark:hover:bg-cyan-400 shadow-lg transition-all">
                        تنفيذ التفعيل الآن
                    </button>
                </div>
                
                <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                    {/* Courses Sidebar */}
                    <div className="w-full md:w-1/3 border-l border-slate-200 dark:border-slate-700 p-5 overflow-y-auto bg-white dark:bg-slate-900 transition-colors">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-sm">1. اختر الكورسات (باقات)</h4>
                        <div className="space-y-3">
                            {courses.map(c => (
                                <label key={c.id} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-400 transition-all bg-slate-50 dark:bg-slate-800">
                                    <input type="checkbox" checked={selectedCourses.has(c.id)} onChange={() => toggleCourse(c.id)} className="w-5 h-5 accent-cyan-500" />
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{c.title}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    {/* Students Main Area */}
                    <div className="w-full md:w-2/3 p-5 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
                        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedStudents(new Set(filteredStudents.map(s => s.id)))} className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors">تحديد الكل</button>
                                <button onClick={() => setSelectedStudents(new Set())} className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-rose-200 dark:hover:bg-rose-900/60 transition-colors">إلغاء التحديد</button>
                            </div>
                            <div className="flex gap-2">
                                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="بحث باسم الطالب أو الهاتف..." className="text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 w-56 outline-none focus:border-cyan-500 text-slate-900 dark:text-white dark:placeholder-slate-400" />
                                <button onClick={handleSearch} disabled={isSearching} className="bg-cyan-500 text-white dark:bg-cyan-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-cyan-600 dark:hover:bg-cyan-500 disabled:opacity-50 transition-colors">بحث</button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredStudents.length === 0 && !isSearching && <p className="text-sm font-bold text-slate-500 dark:text-slate-400 col-span-2 text-center py-8">قم بالبحث عن طالب لإظهاره هنا واستخدم رقم الهاتف للبحث السريع.</p>}
                            {isSearching && <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400 col-span-2 text-center py-8 animate-pulse">جاري البحث عن الطلاب...</p>}
                            
                            {filteredStudents.map(s => (
                                <div key={s.id} onClick={() => toggleStudent(s.id)} className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${selectedStudents.has(s.id) ? 'bg-cyan-50 border-cyan-500 dark:bg-cyan-900/30 dark:border-cyan-400' : 'bg-white border-slate-200 hover:border-cyan-400 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-cyan-500'}`}>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900 dark:text-white">{s.full_name || 'بدون اسم'}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">{s.phone || 'بدون رقم'}</p>
                                    </div>
                                    <input type="checkbox" checked={selectedStudents.has(s.id)} readOnly className="w-5 h-5 accent-cyan-500" />
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
