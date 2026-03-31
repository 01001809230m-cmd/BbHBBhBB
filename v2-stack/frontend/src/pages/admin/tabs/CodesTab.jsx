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
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm h-fit">
                    <h3 className="font-black text-xl mb-6 text-slate-800">🎟️ باقة الكورسات</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl max-h-48 overflow-y-auto space-y-2">
                            <p className="text-xs font-bold text-gray-500 mb-2">حدد الكورسات التي سيشملها الكود:</p>
                            {courses.map(c => (
                                <label key={c.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-cyan-400 transition">
                                    <input type="checkbox" checked={selectedCourses.has(c.id)} onChange={() => toggleCourse(c.id)} className="w-4 h-4 accent-cyan-400" />
                                    <span className="font-bold text-sm text-gray-700">{c.title}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-4 border-b border-gray-200 pb-2 pt-2">
                            <button onClick={() => setGenMode('random')} className={`font-bold pb-2 px-2 transition-all ${genMode === 'random' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400 hover:text-gray-600'}`}>توليد عشوائي</button>
                            <button onClick={() => setGenMode('manual')} className={`font-bold pb-2 px-2 transition-all ${genMode === 'manual' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400 hover:text-gray-600'}`}>إدخال يدوي</button>
                        </div>

                        {genMode === 'random' ? (
                            <input type="number" value={codeCount} onChange={e => setCodeCount(e.target.value)} placeholder="عدد الأكواد المطلوبة" className="text-slate-800 w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-cyan-400 font-bold text-center text-lg" />
                        ) : (
                            <textarea value={manualCodes} onChange={e => setManualCodes(e.target.value)} placeholder="أدخل أكوادك هنا... (كود في كل سطر)" className="text-slate-800 w-full p-4 h-32 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-cyan-400 font-mono text-left" dir="ltr"></textarea>
                        )}

                        <button onClick={handleGenerate} className="w-full bg-yellow-300 text-slate-800 font-black text-xl p-4 rounded-xl shadow-lg shadow-yellow-200 hover:bg-yellow-400 transition">⚡ {genMode === 'random' ? 'توليد' : 'إضافة'} الأكواد الآن</button>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-2xl shadow-xl flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-300 opacity-10 rounded-full blur-3xl -ml-10 -mt-10"></div>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h4 className="font-black text-white text-xl">الأكواد الجاهزة</h4>
                        <div className="flex gap-2">
                            <button onClick={handleCopyCodes} className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-emerald-400 transition">📋 نسخ</button>
                            <button onClick={() => window.print()} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-gray-100 transition">🖨️ طباعة</button>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-xl grid grid-cols-2 gap-3 border border-slate-700 flex-1 overflow-y-auto relative z-10 max-h-[400px]">
                        {generatedCodes.length === 0 ? <p className="text-gray-500 col-span-2 text-center text-sm">لا توجد أكواد حديثة</p> : generatedCodes.map(c => (
                            <div key={c.code} className="bg-slate-800 border border-slate-600 p-3 rounded-lg text-yellow-300 font-mono font-bold text-center tracking-widest text-lg">
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
