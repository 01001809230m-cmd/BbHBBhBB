import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../../lib/supabaseClient';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * 🛰️ Advanced User Management Interface
 * Features:
 * - Real-time student listing
 * - Immediate Suspension (Kick) with session revocation
 * - Admin Promotion with custom permissions
 * - Session tracking
 */
export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🛑 SUSPEND USER: Immediately bans and kills all sessions!
   */
  const handleSuspendUser = async (userId, userName) => {
    const { value: reason } = await MySwal.fire({
      title: `حظر الطالب: ${userName}`,
      input: 'text',
      inputLabel: 'سبب الحظر (سجل التدقيق)',
      inputPlaceholder: 'مثلاً: مشاركة الحساب أو محاولة سحب الفيديوهات',
      showCancelButton: true,
      confirmButtonText: 'حظر الآن 🚫',
      cancelButtonText: 'إلغاء',
      inputValidator: (value) => {
        if (!value) return 'يجب إدخال سبب للحظر!';
      }
    });

    if (reason) {
      try {
        MySwal.fire({ title: 'جاري الحظر...', didOpen: () => MySwal.showLoading() });
        
        await axios.post(`${API_BASE_URL}/admin/users/suspend/${userId}`, { reason }, {
           headers: { 'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}` }
        });

        MySwal.fire('تم!', 'تم حظر الطالب بنجاح وإلغاء جميع جلساته فوراً.', 'success');
        fetchUsers();
      } catch (error) {
        MySwal.fire('خطأ', 'فشل الحظر، حاول مرة أخرى.', 'error');
      }
    }
  };

  /**
   * 👑 PROMOTE TO ADMIN
   */
  const handlePromoteAdmin = async (userId, userName) => {
    const { isConfirmed } = await MySwal.fire({
      title: `ترقية ${userName} لمشرف؟`,
      text: 'سيتم منح الطالب صلاحيات إدارية محدودة.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ترقية 🚀',
      cancelButtonText: 'إلغاء'
    });

    if (isConfirmed) {
      try {
        await axios.post(`${API_BASE_URL}/admin/users/promote/${userId}`, { 
          permissions: ['manage_courses', 'reply_feedback'] 
        }, {
           headers: { 'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}` }
        });
        MySwal.fire('تمت الترقية!', 'المستخدم أصبح مشرفاً الآن.', 'success');
        fetchUsers();
      } catch (err) {
        MySwal.fire('خطأ', 'صلاحياتك لا تسمح بهذه العملية أو حدث خطأ في الخادم.', 'error');
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  );

  return (
    <div className="p-6 bg-surface min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-on-surface flex items-center gap-3">
             <span className="material-symbols-outlined text-primary text-4xl">manage_accounts</span>
             إدارة الطلاب والمشرفين
          </h1>
          <p className="text-on-surface-variant font-medium mt-1">التحكم في صلاحيات الوصول ومراقبة الأمان.</p>
        </div>

        <div className="relative w-full md:w-80">
           <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
           <input 
             type="text" 
             placeholder="ابحث بالاسم أو الهاتف..." 
             className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl py-3 pr-11 pl-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/20 shadow-xl overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/20">
              <th className="p-5 font-black text-sm">الطالب</th>
              <th className="p-5 font-black text-sm">الهاتف</th>
              <th className="p-5 font-black text-sm">الدور</th>
              <th className="p-5 font-black text-sm text-center">الحالة</th>
              <th className="p-5 font-black text-sm">الإجراءات الأمانية</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="p-20 text-center text-primary font-bold">جاري تحميل البيانات...</td></tr>
            ) : filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors group">
                <td className="p-5">
                   <div className="font-black text-on-surface group-hover:text-primary transition-colors">{user.full_name}</div>
                   <div className="text-xs text-on-surface-variant font-bold">{user.email}</div>
                </td>
                <td className="p-5 font-bold text-sm text-on-surface-variant">{user.phone || 'غير مسجل'}</td>
                <td className="p-5">
                   <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                     user.role === 'admin' ? 'bg-indigo-500/10 text-indigo-500' : 
                     user.role === 'super_admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                   }`}>
                     {user.role === 'student' ? 'طالب' : user.role === 'admin' ? 'مشرف' : 'مدير النظام'}
                   </span>
                </td>
                <td className="p-5 text-center">
                   {user.is_banned ? (
                     <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-lg text-xs font-black">محظور 🛑</span>
                   ) : (
                     <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg text-xs font-black">نشط ✅</span>
                   )}
                </td>
                <td className="p-5 flex gap-2">
                   {user.role === 'student' && !user.is_banned && (
                     <button 
                       onClick={() => handlePromoteAdmin(user.id, user.full_name)}
                       className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                       title="ترقية لمشرف"
                     >
                       <span className="material-symbols-outlined text-[18px]">upgrade</span>
                     </button>
                   )}
                   <button 
                     onClick={() => handleSuspendUser(user.id, user.full_name)}
                     className={`p-2 rounded-xl transition-all shadow-sm ${
                       user.is_banned ? 'bg-slate-500/10 text-slate-500' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                     }`}
                     title={user.is_banned ? 'إيقاف الحظر' : 'حظر وطرد فوري'}
                   >
                     <span className="material-symbols-outlined text-[18px]">
                       {user.is_banned ? 'verified_user' : 'person_off'}
                     </span>
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
