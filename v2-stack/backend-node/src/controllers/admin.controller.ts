import { Request, Response } from 'express';
import { supabase } from '../config/supabase.config';

export class AdminController {
  /**
   * Promote a student to an admin role with specific permissions
   */
  async promoteToAdmin(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { permissions } = req.body; // e.g., ['manage_courses', 'reply_comments']

      // 1. Check if the requester is already Super Admin (Done via middleware)

      // 2. Update role and permissions in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin', permissions: permissions })
        .eq('id', userId);

      if (error) throw error;

      // 3. CRITICAL: Invalidate all existing sessions of this user so they must re-login with new roles
      await supabase
        .from('user_devices')
        .update({ status: 'revoked' })
        .eq('user_id', userId);

      res.json({ success: true, message: 'User promoted successfully and sessions revoked.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Suspend (Kick) a user immediately
   */
  async suspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      // 1. Update Profile to Banned
      const { error: banError } = await supabase
        .from('profiles')
        .update({ is_banned: true })
        .eq('id', userId);

      if (banError) throw banError;

      // 2. Revoke all device sessions
      await supabase
        .from('user_devices')
        .update({ status: 'revoked' })
        .eq('user_id', userId);

      // 3. Log the audit
      await supabase.from('audit_logs').insert([{
        action: 'BAN_USER',
        performed_by: (req as any).user.userId,
        target_user: userId,
        details: { reason },
        ip_address: req.ip
      }]);

      res.json({ success: true, message: 'User suspended successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
