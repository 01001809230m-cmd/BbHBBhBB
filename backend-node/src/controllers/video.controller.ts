import { Request, Response } from 'express';
import { VideoProtectionService } from '../services/video-protection.service';
import { JWTManager } from '../utils/jwt.util';
import { supabaseAdmin } from '../config/supabase';

const videoService = new VideoProtectionService();

export class VideoController {
  static async requestAccess(req: Request, res: Response) {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: 'Video ID is required' });

    const result = await videoService.requestVideoAccess(req.user.userId, videoId, req.clientIp || '0.0.0.0');
    if (!result.success) return res.status(403).json(result);
    res.json(result);
  }

  static async heartbeat(req: Request, res: Response) {
    const { token, youtubeVideoId, currentTime, videoId } = req.body;
    const userId = req.user.userId;
    const userIP = req.clientIp || '0.0.0.0';

    if (!token || !youtubeVideoId) {
        return res.status(400).json({ error: 'Missing token or video parameters.' });
    }

    const verification = JWTManager.verifyVideoToken(token, youtubeVideoId, userId, userIP);
    
    if (!verification.valid) {
      // حظر الطالب وتسجيل عملية اختراق
      await supabaseAdmin.from('audit_logs').insert({ action: 'SECURITY_BREACH_VIDEO', target_user: userId, ip_address: userIP, details: { error: verification.error, token } });
      await supabaseAdmin.from('profiles').update({ is_banned: true }).eq('id', userId);
      return res.status(403).json({ success: false, action: 'BAN_USER' });
    }
    
    // حفظ آخر مكان وقف عنده الطالب
    if (videoId && currentTime) {
        await supabaseAdmin.from('video_progress').update({ last_position: Math.floor(currentTime) }).eq('user_id', userId).eq('video_id', videoId);
    }
    res.json({ success: true, message: 'Pulse accepted' });
  }
}
