import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Swal from 'sweetalert2';
import TopBar from '../components/TopBar';

const CodesTab = () => {
    const [courses, setCourses] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState(new Set());
    const [genMode, setGenMode] = useState('random');
    const [codeCount, setCodeCount] = useState(10);
    const [manualCodes, setManualCodes] = useState('');
    const [generatedCodes, setGeneratedCodes] = useState([]);

    useEffect(() => {
        async function fetchCourses() {
            const { data } = await supabase.from('courses').select('id, title');
            if (data) setCourses(data);
        }
        fetchCourses();
    }, []);

    const toggleCourse = (id) => { const newSet = new Set(selectedCourses); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setSelectedCourses(newSet); };

    const handleGenerate = async () => {
        if (selectedCourses.size === 0) return Swal.fire({ icon: 'warning', text: 'الرجاء اختيار كورس واحد على الأقل للباقة' });

        const courseArr = Array.from(selectedCourses);
        let newCodes = [];

        if (genMode === 'random') {
            if (codeCount <= 0) return Swal.fire({ icon: 'error', text: 'أدخل عدد صحيح' });
            for (let i = 0; i < codeCount; i++) {
                newCodes.push({ code: Math.floor(100000000 + Math.random() * 900000000).toString(), course_ids: courseArr, course_id: courseArr[0] });
            }
        } else {
            const lines = manualCodes.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length === 0) return Swal.fire({ icon: 'warning', text: 'لم تقم بإدخال أي أكواد!' });
            newCodes = lines.map(c => ({ code: c, course_ids: courseArr, course_id: courseArr[0] }));
        }

        const { data, error } = await supabase.from('coupon_codes').insert(newCodes).select();
        if (!error && data) {
            setGeneratedCodes(data);
            Swal.fire({ icon: 'success', title: 'عملية ناجحة', text: 'تم تجهيز الأكواد بنجاح!', confirmButtonColor: '#10b981' });
            setManualCodes('');
        } else {
            Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
        }
    };

    const handleCopyCodes = () => {
        if (generatedCodes.length === 0) return Swal.fire({ icon: 'info', text: 'لا توجد أكواد لنسخها!' });
        navigator.clipboard.writeText(generatedCodes.map(c => c.code).join('\n'));
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'تم نسخ الأكواد 📋', showConfirmButton: false, timer: 2000 });
    };

    return (
        <div className="animate-fade-in mb-8">
            <TopBar title="مولد وإضافة الأكواد" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Codes Builder Panel */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit transition-colors">
                    <h3 className="font-black text-xl mb-6 text-slate-900 dark:text-white">🎟️ باقة الكورسات</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl max-h-48 overflow-y-auto space-y-2">
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">حدد الكورسات التي سيشملها الكود:</p>
                            {courses.map(c => (
                                <label key={c.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-400 transition">
                                    <input type="checkbox" checked={selectedCourses.has(c.id)} onChange={() => toggleCourse(c.id)} className="w-5 h-5 accent-cyan-500" />
                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{c.title}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-2 pt-2">
                            <button onClick={() => setGenMode('random')} className={`font-bold pb-2 px-2 transition-all ${genMode === 'random' ? 'text-cyan-600 border-b-2 border-cyan-600 dark:text-cyan-400 dark:border-cyan-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>توليد عشوائي</button>
                            <button onClick={() => setGenMode('manual')} className={`font-bold pb-2 px-2 transition-all ${genMode === 'manual' ? 'text-cyan-600 border-b-2 border-cyan-600 dark:text-cyan-400 dark:border-cyan-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>إدخال يدوي</button>
                        </div>

                        {genMode === 'random' ? (
                            <input type="number" value={codeCount} onChange={e => setCodeCount(e.target.value)} placeholder="عدد الأكواد المطلوبة" className="text-slate-900 dark:text-white w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400 font-bold text-center text-lg" />
                        ) : (
                            <textarea value={manualCodes} onChange={e => setManualCodes(e.target.value)} placeholder="أدخل أكوادك هنا... (كود في كل سطر)" className="text-slate-900 dark:text-white w-full p-4 h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400 font-mono text-left" dir="ltr"></textarea>
                        )}

                        <button onClick={handleGenerate} className="w-full bg-amber-400 text-slate-900 dark:bg-amber-500 dark:text-amber-950 font-black text-xl p-4 rounded-xl shadow-lg shadow-amber-400/30 hover:bg-amber-500 dark:hover:bg-amber-400 transition-colors">
                            ⚡ {genMode === 'random' ? 'توليد' : 'إضافة'} الأكواد الآن
                        </button>
                    </div>
                </div>

                {/* Generated Codes Ready Display */}
                <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-2xl shadow-xl flex flex-col relative overflow-hidden transition-colors">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-amber-400 opacity-20 rounded-full blur-3xl -ml-10 -mt-10"></div>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h4 className="font-black text-white text-xl">الأكواد الجاهزة</h4>
                        <div className="flex gap-2">
                            <button onClick={handleCopyCodes} className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-emerald-400 transition">📋 نسخ</button>
                            <button onClick={() => window.print()} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-gray-100 dark:hover:bg-slate-700 transition">🖨️ طباعة</button>
                        </div>
                    </div>
                    <div className="bg-slate-800/80 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 p-6 rounded-xl grid grid-cols-2 gap-3 flex-1 overflow-y-auto relative z-10 max-h-[400px]">
                        {generatedCodes.length === 0 ? <p className="text-slate-400 col-span-2 text-center text-sm font-bold">لا توجد أكواد حديثة، قم بالتوليد لظهورها.</p> : generatedCodes.map(c => (
                            <div key={c.code} className="bg-slate-900 border border-slate-700 dark:border-slate-800 p-3 rounded-lg text-amber-300 dark:text-amber-400 font-mono font-bold text-center tracking-widest text-lg shadow-inner">
                                {c.code}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodesTab;
