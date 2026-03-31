import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export class AdminController {
  static async promoteUser(req: Request, res: Response) {
    const { userId } = req.params;
    const { role } = req.body; 
    
    // تأكيد الهوية قبل الترقية
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const { error } = await supabaseAdmin.from('profiles').update({ role: role || 'admin' }).eq('id', userId);
    if (error) return res.status(500).json({ error: 'Promotion failed' });
    
    await supabaseAdmin.from('audit_logs').insert({ action: 'PROMOTE_USER', performed_by: req.user.userId, target_user: userId, ip_address: req.clientIp, details: { newRole: role || 'admin' } });
    
    res.json({ success: true, message: 'User role updated successfully' });
  }

  static async banUser(req: Request, res: Response) {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const { error } = await supabaseAdmin.from('profiles').update({ is_banned: true }).eq('id', userId);
    if (error) return res.status(500).json({ error: 'Ban attempt failed' });
    
    await supabaseAdmin.from('audit_logs').insert({ action: 'BAN_STUDENT_MANUAL', performed_by: req.user.userId, target_user: userId, ip_address: req.clientIp, details: { reason } });
    res.json({ success: true, message: 'User banned' });
  }

  static async getUsers(req: Request, res: Response) {
    // جلب الطلاب و المشرفين 
    const { data: users, error } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Failed to fetch users catalog' });
    res.json({ users });
  }
}
