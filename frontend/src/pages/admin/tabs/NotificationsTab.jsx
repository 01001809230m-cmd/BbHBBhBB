import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Swal from 'sweetalert2';
import TopBar from '../components/TopBar';
import Icon, { paths } from '../components/Icon';

const NotificationsTab = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('global');
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState([]);
    const [sentNotifications, setSentNotifications] = useState([]);
    const [isSending, setIsSending] = useState(false);

    const fetchData = async () => {
        const { data: studentsData } = await supabase.from('profiles').select('id, full_name, phone').order('created_at', { ascending: false });
        if (studentsData) setStudents(studentsData);
        const { data: notifData } = await supabase.from('notifications').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(30);
        if (notifData) setSentNotifications(notifData);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSendNotification = async (e) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return Swal.fire({ icon: 'warning', text: 'يرجى كتابة عنوان ونص الإشعار' });
        if (type === 'private' && selectedStudents.size === 0) return Swal.fire({ icon: 'warning', text: 'يرجى تحديد طالب واحد على الأقل' });

        setIsSending(true);
        let notificationsToInsert = [];
        if (type === 'global') {
            // Security/Scale Fix: Insert only ONE global row
            notificationsToInsert.push({ title: title.trim(), message: message.trim(), type: 'global', user_id: null, is_read: false });
        } else {
            selectedStudents.forEach(s_id => {
                notificationsToInsert.push({ title: title.trim(), message: message.trim(), type: 'private', user_id: s_id, is_read: false });
            });
        }

        const { error } = await supabase.from('notifications').insert(notificationsToInsert);
        setIsSending(false);

        if (error) {
            Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
        } else {
            Swal.fire({ icon: 'success', title: 'تم الإرسال', text: `تم إرسال الإشعار لـ ${notificationsToInsert.length} مستلم بنجاح!`, timer: 2000, showConfirmButton: false });
            setTitle(''); setMessage(''); setSelectedStudents(new Set()); setSearchTerm(''); fetchData();
        }
    };

    const handleDelete = async (id) => {
        if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
            await supabase.from('notifications').delete().eq('id', id);
            fetchData();
        }
    };

    return (
        <div className="animate-fade-in mb-8">
            <TopBar title="نظام الإشعارات الذكي" />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="col-span-1 md:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
                    <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-slate-800"><Icon path={paths.bell} /> إرسال إشعار جديد</h3>
                    <form onSubmit={handleSendNotification} className="space-y-4">
                        <div className="flex gap-4 p-1 bg-gray-50 rounded-xl border border-gray-200">
                            <button type="button" onClick={() => setType('global')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${type === 'global' ? 'bg-white shadow-sm text-cyan-500 border border-gray-200' : 'text-gray-400'}`}>🌍 للكل (Global)</button>
                            <button type="button" onClick={() => setType('private')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${type === 'private' ? 'bg-white shadow-sm text-cyan-500 border border-gray-200' : 'text-gray-400'}`}>👤 لطلاب محددين</button>
                        </div>

                        {type === 'private' && (
                            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 max-h-[250px] flex flex-col">
                                <div className="relative mb-2 shrink-0">
                                    <Icon path={paths.search} size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value.toLowerCase())} placeholder="ابحث باسم الطالب أو رقمه..." className="w-full pl-3 pr-8 py-2 bg-white text-slate-800 border border-gray-200 rounded-lg text-xs outline-none focus:border-cyan-400 font-bold" />
                                </div>
                                <div className="flex justify-between items-center mb-2 px-1 shrink-0">
                                    <span className="text-xs font-bold text-gray-500">تم تحديد: <span className="text-cyan-500">{selectedStudents.size}</span> طالب</span>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setSelectedStudents(new Set(students.map(s => s.id)))} className="text-[10px] bg-cyan-100 text-cyan-800 px-2 py-1 rounded shadow-sm font-bold">تحديد الكل</button>
                                        <button type="button" onClick={() => setSelectedStudents(new Set())} className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded shadow-sm font-bold">إلغاء</button>
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1 space-y-1 pr-1 custom-scrollbar">
                                    {students.filter(s => (s.full_name || '').toLowerCase().includes(searchTerm) || (s.phone || '').includes(searchTerm)).map(s => (
                                        <label key={s.id} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition ${selectedStudents.has(s.id) ? 'bg-cyan-50 border-cyan-400 shadow-sm' : 'bg-white border-gray-100 hover:border-cyan-400'}`}>
                                            <input type="checkbox" checked={selectedStudents.has(s.id)} onChange={() => { const newSet = new Set(selectedStudents); newSet.has(s.id) ? newSet.delete(s.id) : newSet.add(s.id); setSelectedStudents(newSet); }} className="w-4 h-4 accent-cyan-400 rounded cursor-pointer" />
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{s.full_name || 'بدون اسم'}</p>
                                                <p className="text-[10px] text-gray-500 font-mono leading-none mt-1">{s.phone || '-'}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإشعار (مثال: تنبيه هام، عيدية الكورس)" className="text-slate-800 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-cyan-400 font-bold" />
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="نص الإشعار التفصيلي..." className="text-slate-800 w-full p-3 h-28 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-cyan-400 font-bold resize-none"></textarea>
                        <button type="submit" disabled={isSending} className="w-full bg-cyan-500 text-white py-3 rounded-xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.3)] hover:bg-cyan-600 hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                            {isSending ? 'جاري الإرسال للطلاب...' : '🚀 إرسال الإشعار الآن'}
                        </button>
                    </form>
                </div>

                <div className="col-span-1 md:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col max-h-[600px]">
                    <h3 className="text-lg font-black mb-4 text-slate-800">📜 سجل الإشعارات السابقة</h3>
                    <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                        {sentNotifications.length === 0 ? <p className="text-center text-gray-400 py-4 font-bold">لم يتم إرسال إشعارات بعد.</p> : sentNotifications.map(notif => (
                            <div key={notif.id} className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex justify-between items-start gap-4 hover:border-cyan-400 transition-colors group">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-sm ${notif.type === 'global' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-purple-100 text-purple-700 border border-purple-200'}`}>
                                            {notif.type === 'global' ? 'عام للكل' : 'مخصص'}
                                        </span>
                                        <h4 className="font-bold text-gray-900 text-sm">{notif.title}</h4>
                                    </div>
                                    <p className="text-gray-600 text-xs mt-2 line-clamp-2 leading-relaxed">{notif.message}</p>
                                    <div className="text-[10px] text-gray-400 mt-3 font-bold flex gap-4 bg-white px-2 py-1 rounded w-fit border border-gray-100">
                                        <span>📅 {new Date(notif.created_at).toLocaleDateString('ar-EG')}</span>
                                        {notif.type === 'private' && <span>👤 المستلم: <span className="text-cyan-500">{notif.profiles?.full_name || 'طالب مجهول'}</span></span>}
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(notif.id)} className="text-red-400 hover:bg-red-50 hover:text-red-600 p-2 rounded-lg shrink-0 transition-colors opacity-0 group-hover:opacity-100" title="حذف الإشعار">
                                    <Icon path={paths.trash} size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationsTab;
