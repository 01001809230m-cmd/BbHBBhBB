import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Swal from 'sweetalert2';
import TopBar from '../components/TopBar';

const MessagesTab = () => {
    const [messages, setMessages] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');

    const fetchMessages = async () => {
        const { data } = await supabase.from('student_messages').select('*, profiles(full_name, phone)').order('created_at', { ascending: false });
        if (data) setMessages(data);
    };

    useEffect(() => { fetchMessages(); }, []);

    const handleSendReply = async (msgId, studentId, videoTitle) => {
        if (!replyText.trim()) return Swal.fire({ icon: 'warning', text: 'اكتب الرد أولاً' });
        Swal.fire({ title: 'جاري إرسال الرد...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const { error: updateError } = await supabase.from('student_messages').update({ reply: replyText, status: 'replied' }).eq('id', msgId);
        if (updateError) return Swal.fire('خطأ', updateError.message, 'error');

        await supabase.from('notifications').insert([{ title: 'رسالة من أ. محمد زايد', message: `رداً علي رسالتك الخاصه:\n${replyText}`, type: 'private', user_id: studentId, is_read: false }]);

        Swal.fire('نجاح', 'تم إرسال الرد وإشعار الطالب بنجاح!', 'success');
        setReplyingTo(null); setReplyText(''); fetchMessages();
    };

    return (
        <div className="animate-fade-in mb-8">
            <TopBar title="صندوق الفضفضة والأسئلة السرية 💡" />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                    {messages.length === 0 ? <p className="text-center text-gray-400 py-8 font-bold">لا توجد رسائل سرية جديدة.</p> : messages.map(msg => (
                        <div key={msg.id} className={`p-5 rounded-2xl border ${msg.status === 'replied' ? 'bg-gray-50 border-gray-200' : 'bg-yellow-50/50 border-yellow-200 shadow-sm'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-black text-gray-900">{msg.profiles?.full_name || 'طالب مجهول'} <span className="text-xs text-gray-500 font-mono font-normal">({msg.profiles?.phone || '-'})</span></h4>
                                    <p className="text-xs font-bold text-cyan-600 mt-1">🎬 {msg.video_title}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${msg.status === 'replied' ? 'bg-green-100 text-green-700' : 'bg-yellow-200 text-yellow-800'}`}>
                                    {msg.status === 'replied' ? '✅ تم الرد' : '⏳ بانتظار ردك'}
                                </span>
                            </div>
                            
                            <p className="text-gray-700 text-sm font-bold bg-white p-4 rounded-xl border border-gray-100 mb-4 whitespace-pre-wrap leading-relaxed">{msg.message}</p>

                            {msg.status === 'pending' ? (
                                replyingTo === msg.id ? (
                                    <div className="mt-4 animate-fade-in">
                                        <textarea autoFocus value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="اكتب ردك السري هنا... (سيصل للطالب كإشعار في الكورسات)..." className="text-slate-800 w-full p-3 border border-cyan-200 rounded-xl text-sm font-bold focus:outline-none focus:border-cyan-500 bg-white resize-none h-28 mb-2 leading-relaxed"></textarea>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleSendReply(msg.id, msg.student_id, msg.video_title)} className="bg-cyan-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-cyan-700 text-sm transition">إرسال الرد السري 🚀</button>
                                            <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="bg-gray-200 text-gray-700 font-bold px-6 py-2 rounded-lg hover:bg-gray-300 text-sm transition">إلغاء</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setReplyingTo(msg.id)} className="bg-yellow-400 text-black font-black px-6 py-2 rounded-xl text-sm shadow-md hover:bg-yellow-500 transition">💬 الرد بسرية تامة</button>
                                )
                            ) : (
                                <div className="mt-2 bg-green-50 p-4 rounded-xl border border-green-100">
                                    <span className="text-xs font-black text-green-700 block mb-1">ردك السري:</span>
                                    <p className="text-sm font-bold text-gray-800 whitespace-pre-wrap leading-relaxed">{msg.reply}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MessagesTab;
