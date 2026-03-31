import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Swal from 'sweetalert2';
import TopBar from '../components/TopBar';
import Icon, { paths } from '../components/Icon';

const ContentTab = () => {
    const [courses, setCourses] = useState([]);
    const [videos, setVideos] = useState([]);
    const [selectedCourseForVideos, setSelectedCourseForVideos] = useState('');
    const [newCourse, setNewCourse] = useState({ title: '', price: '', is_free: false });
    const [newVideo, setNewVideo] = useState({ course_id: '', title: '', source_type: 'youtube', video_url: '', attachment_url: '' });

    const dragItem = useRef();
    const dragOverItem = useRef();
    const dragCourseItem = useRef();
    const dragCourseOverItem = useRef();

    const fetchCourses = async () => {
        const { data } = await supabase.from('courses').select('*').order('order_index', { ascending: true });
        if (data) setCourses(data);
    };

    const fetchVideos = async (courseId) => {
        if (!courseId) { setVideos([]); return; }
        const { data } = await supabase.from('videos').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
        if (data) setVideos(data);
    };

    useEffect(() => { fetchCourses(); }, []);
    useEffect(() => { fetchVideos(selectedCourseForVideos); }, [selectedCourseForVideos]);

    const handleAddCourse = async (e) => {
        e.preventDefault();
        if (!newCourse.title) return Swal.fire({ icon: 'warning', text: 'يرجى كتابة اسم الكورس' });
        const lastOrder = courses.length > 0 ? courses[courses.length - 1].order_index : 0;
        await supabase.from('courses').insert([{ title: newCourse.title, price: newCourse.price || 0, is_free: newCourse.is_free, order_index: lastOrder + 1 }]);
        Swal.fire({ icon: 'success', title: 'نجاح', text: 'تم إضافة الكورس بنجاح!', timer: 1500, showConfirmButton: false });
        setNewCourse({ title: '', price: '', is_free: false });
        fetchCourses();
    };

    const handleDeleteCourse = async (id, title) => {
        Swal.fire({
            title: 'تأكيد الحذف الجذري!',
            text: `سيتم حذف كورس "${title}" وكل الفيديوهات المرتبطة به! هل أنت متأكد؟`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'نعم، دمر الكورس!',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#ef4444'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await supabase.from('courses').delete().eq('id', id);
                fetchCourses();
                Swal.fire('تم الحذف', 'تم حذف الكورس بنجاح', 'success');
            }
        });
    };

    const showCourseStudents = async (courseId, courseTitle) => {
        Swal.fire({ title: 'جاري تحميل البيانات...', didOpen: () => Swal.showLoading() });
        const { data: enrolls } = await supabase.from('enrollments').select('*, profiles(full_name, phone)').eq('course_id', courseId);

        if (!enrolls || enrolls.length === 0) return Swal.fire('معلومة', 'لا يوجد طلاب مشتركين في هذا الكورس حتى الآن.', 'info');

        let tableHtml = `<div class="max-h-64 overflow-y-auto mt-4"><table class="w-full text-right text-sm" dir="rtl"><thead class="bg-slate-100 dark:bg-slate-800 sticky top-0"><tr class="text-slate-800 dark:text-slate-200"><th class="p-2">الاسم</th><th class="p-2">الهاتف</th><th class="p-2">الدفع</th></tr></thead><tbody>`;
        enrolls.forEach(e => {
            let methodStr = e.payment_method === 'كود' ? '<span class="text-blue-600 dark:text-blue-400 font-bold">كود</span>' : e.payment_method === 'أونلاين' ? '<span class="text-emerald-600 dark:text-emerald-400 font-bold">أونلاين</span>' : '<span class="text-amber-600 dark:text-amber-400 font-bold">يدوي</span>';
            tableHtml += `<tr class="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"><td class="p-2 font-bold text-slate-900 dark:text-white">${e.profiles?.full_name || 'بدون اسم'}</td><td class="p-2 font-mono text-xs text-slate-600 dark:text-slate-400">${e.profiles?.phone || '-'}</td><td class="p-2 font-bold text-xs">${methodStr}</td></tr>`;
        });
        tableHtml += `</tbody></table></div>`;

        Swal.fire({ title: `مشتركي: ${courseTitle}`, html: tableHtml, width: '600px', confirmButtonText: 'إغلاق', confirmButtonColor: '#0f172a' }); // Using slate-900 for button
    };

    const dropCourse = async (e) => {
        e.preventDefault(); e.target.classList.remove('is-dragging');
        if (dragCourseItem.current === null || dragCourseOverItem.current === null) return;
        const copyList = [...courses];
        const itemContent = copyList[dragCourseItem.current];
        copyList.splice(dragCourseItem.current, 1);
        copyList.splice(dragCourseOverItem.current, 0, itemContent);
        dragCourseItem.current = null; dragCourseOverItem.current = null;
        setCourses(copyList);
        for (let i = 0; i < copyList.length; i++) {
            await supabase.from('courses').update({ order_index: i + 1 }).eq('id', copyList[i].id);
        }
    };

    const handleAddVideo = async (e) => {
        e.preventDefault();
        if (!newVideo.course_id || !newVideo.title || !newVideo.video_url) return Swal.fire({ icon: 'error', text: 'أكمل البيانات الأساسية للفيديو' });
        const lastOrder = videos.length > 0 ? videos[videos.length - 1].order_index : 0;
        await supabase.from('videos').insert([{ ...newVideo, order_index: lastOrder + 1 }]);
        Swal.fire({ icon: 'success', text: 'تم رفع الفيديو', timer: 1500, showConfirmButton: false });
        setNewVideo({ course_id: newVideo.course_id, title: '', source_type: 'youtube', video_url: '', attachment_url: '' });
        fetchVideos(newVideo.course_id);
    };

    const dropVideo = async (e) => {
        e.preventDefault(); e.target.classList.remove('is-dragging');
        if (dragItem.current === null || dragOverItem.current === null) return;
        const copyList = [...videos];
        const itemContent = copyList[dragItem.current];
        copyList.splice(dragItem.current, 1);
        copyList.splice(dragOverItem.current, 0, itemContent);
        dragItem.current = null; dragOverItem.current = null;
        setVideos(copyList);
        for (let i = 0; i < copyList.length; i++) {
            await supabase.from('videos').update({ order_index: i + 1 }).eq('id', copyList[i].id);
        }
    };

    return (
        <div className="animate-fade-in mb-8">
            <TopBar title="إدارة المحتوى" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><Icon path={paths.bed} /> إضافة كورس جديد</h3>
                    <form onSubmit={handleAddCourse} className="space-y-4">
                        <div className="flex items-center gap-4">
                            <input type="text" value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} placeholder="اسم الكورس" className="text-slate-900 dark:text-white flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400 font-bold transition-colors" />
                            <label className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl cursor-pointer hover:border-cyan-500 transition-colors">
                                <input type="checkbox" checked={newCourse.is_free} onChange={e => setNewCourse({ ...newCourse, is_free: e.target.checked })} className="w-5 h-5 accent-cyan-500" />
                                <span className="font-bold text-xs md:text-sm text-slate-900 dark:text-white">مجاني؟</span>
                            </label>
                        </div>
                        <div className="flex gap-4">
                            <input type="number" disabled={newCourse.is_free} value={newCourse.price} onChange={e => setNewCourse({ ...newCourse, price: e.target.value })} placeholder={newCourse.is_free ? "مجاني" : "السعر"} className="text-slate-900 dark:text-white flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400 font-bold disabled:opacity-50 transition-colors" />
                            <button type="submit" className="bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 font-bold rounded-xl px-4 md:px-8 hover:bg-slate-800 dark:hover:bg-cyan-400 transition">حفظ الكورس</button>
                        </div>
                    </form>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col max-h-[300px] transition-colors">
                    <h3 className="text-lg font-black mb-4 flex justify-between items-center text-cyan-700 dark:text-cyan-400">
                        إدارة وترتيب الكورسات
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-2 py-1 rounded font-bold">اسحب للترتيب</span>
                    </h3>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                        {courses.map((c, idx) => (
                            <div key={c.id} onDragStart={(e) => { dragCourseItem.current = idx; e.target.classList.add('opacity-50', 'bg-amber-100', 'dark:bg-amber-900'); }} onDragEnter={() => { dragCourseOverItem.current = idx; }} onDragEnd={dropCourse} onDragOver={(e) => e.preventDefault()} draggable className="cursor-grab bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl flex items-center justify-between transition-colors hover:border-cyan-500 dark:hover:border-cyan-400">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Icon path={paths.drag} className="text-slate-400 dark:text-slate-500 shrink-0" size={14} />
                                    <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[120px]">{c.title}</span>
                                    {c.is_free && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-1.5 rounded font-black">مجاني</span>}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => showCourseStudents(c.id, c.title)} className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 p-1.5 rounded-lg transition-colors"><Icon path={paths.user} size={14} /></button>
                                    <button onClick={() => handleDeleteCourse(c.id, c.title)} className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30 p-1.5 rounded-lg transition-colors"><Icon path={paths.trash} size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="col-span-1 md:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><Icon path={paths.calendar} /> رفع فيديو وملحقاته</h3>
                    <form onSubmit={handleAddVideo} className="space-y-4">
                        <select value={newVideo.course_id} onChange={e => setNewVideo({ ...newVideo, course_id: e.target.value })} className="text-slate-900 dark:text-white w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400 font-bold transition-colors">
                            <option value="">اختر الكورس...</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <input type="text" value={newVideo.title} onChange={e => setNewVideo({ ...newVideo, title: e.target.value })} placeholder="عنوان الفيديو" className="text-slate-900 dark:text-white w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400 font-bold transition-colors" />
                        <div className="flex flex-col md:flex-row gap-4">
                            <select value={newVideo.source_type} onChange={e => setNewVideo({ ...newVideo, source_type: e.target.value })} className="text-slate-900 dark:text-white w-full md:w-1/3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400 font-bold transition-colors">
                                <option value="youtube">يوتيوب</option>
                                <option value="direct">مباشر</option>
                                <option value="meet">ميت Meet</option>
                            </select>
                            <input type="text" value={newVideo.video_url} onChange={e => setNewVideo({ ...newVideo, video_url: e.target.value })} placeholder="رابط الفيديو" className="text-slate-900 dark:text-white w-full md:w-2/3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400 font-bold transition-colors" />
                        </div>
                        <input type="text" value={newVideo.attachment_url} onChange={e => setNewVideo({ ...newVideo, attachment_url: e.target.value })} placeholder="رابط الـ PDF أو الملحق (اختياري)" className="text-slate-900 dark:text-white w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400 font-bold transition-colors" />
                        <button type="submit" className="w-full bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 py-3 rounded-xl font-black text-lg shadow-lg shadow-cyan-600/20 hover:bg-cyan-700 dark:hover:bg-cyan-400 transition">نشر الفيديو</button>
                    </form>
                </div>

                <div className="col-span-1 md:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <h3 className="text-lg font-black mb-4 flex justify-between items-center text-slate-900 dark:text-white">
                        ترتيب الفيديوهات
                        <select value={selectedCourseForVideos} onChange={e => setSelectedCourseForVideos(e.target.value)} className="text-slate-800 dark:text-white text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded-lg outline-none font-bold max-w-[120px] transition-colors border border-transparent dark:border-slate-700 focus:border-cyan-400">
                            <option value="">اختر الكورس</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {videos.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400 text-center font-bold">لا توجد فيديوهات</p> : videos.map((item, index) => (
                            <div key={item.id} onDragStart={(e) => { dragItem.current = index; e.target.classList.add('opacity-50', 'bg-amber-100', 'dark:bg-amber-900'); }} onDragEnter={() => dragOverItem.current = index} onDragEnd={dropVideo} onDragOver={(e) => e.preventDefault()} draggable className="cursor-grab bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between hover:border-cyan-500 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Icon path={paths.drag} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{item.title}</span>
                                </div>
                                <button onClick={async () => {
                                    if (confirm('حذف الفيديو؟')) {
                                        await supabase.from('videos').delete().eq('id', item.id);
                                        fetchVideos(selectedCourseForVideos);
                                    }
                                }} className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30 p-2 rounded-lg shrink-0 transition-colors"><Icon path={paths.trash} size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContentTab;
