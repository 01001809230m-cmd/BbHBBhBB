import React, { useState, useEffect } from 'react';
import axios from 'axios';

const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
apiClient.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${localStorage.getItem('access_token')}`;
  return config;
});

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const res = await apiClient.get('/admin/users');
            setUsers(res.data.users);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }
    fetchUsers();
  }, []);

  const handleAction = async (userId, action) => {
    try {
      const payload = action === 'ban' ? { reason: 'Violated Security Terms' } : { role: 'admin' };
      await apiClient.post(`/admin/users/${userId}/${action}`, payload);
      setUsers(users.map(u => u.id === userId ? { ...u, is_banned: action === 'ban' ? true : u.is_banned, role: action === 'promote' ? 'admin' : u.role } : u));
    } catch (err) {
        console.error('Failed to manage user:', err);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen p-8 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100 rounded-full"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-slate-50 dark:bg-slate-950">
      <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">User Security Management</h1>
      <div className="bg-white dark:bg-slate-900 shadow rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="p-4 text-slate-900 dark:text-slate-100 font-semibold">User Email</th>
              <th className="p-4 text-slate-900 dark:text-slate-100 font-semibold">Role</th>
              <th className="p-4 text-slate-900 dark:text-slate-100 font-semibold">Status</th>
              <th className="p-4 text-slate-900 dark:text-slate-100 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-150">
                <td className="p-4 text-slate-900 dark:text-slate-100 font-medium">{u.email}</td>
                <td className="p-4 text-slate-900 dark:text-slate-100 capitalize">{u.role}</td>
                <td className="p-4 text-slate-900 dark:text-slate-100">
                    {u.is_banned ? <span className="text-red-600 font-bold tracking-wide">BANNED</span> : <span className="text-emerald-500 font-bold">ACTIVE</span>}
                </td>
                <td className="p-4 flex gap-2">
                  {u.role !== 'admin' && u.role !== 'super_admin' && !u.is_banned && (
                    <button onClick={() => handleAction(u.id, 'promote')} className="bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 px-3 py-1 rounded focus:outline-none transition">
                        Promote to Admin
                    </button>
                  )}
                  {!u.is_banned && (
                    <button onClick={() => handleAction(u.id, 'ban')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded focus:outline-none transition font-bold">
                        Ban User
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
