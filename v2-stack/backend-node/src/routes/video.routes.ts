import express from 'express';
import { JWTManager } from '../utils/jwt.util';
import { VideoProtectionService } from '../services/video-protection.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { videoApiLimiter } from '../middleware/rate-limit.middleware';
import { supabase } from '../config/supabase.config';

const router = express.Router();
const videoService = new VideoProtectionService();

/**
 * 🛰️ HEARTBEAT ENDPOINT:
 * Called by the frontend every 10 seconds to verify the student is still watching
 * from the same device and IP.
 */
router.post('/heartbeat', authMiddleware, async (req, res) => {
  const { token, videoId, currentTime } = req.body;
  const userIP = req.ip || '0.0.0.0';
  const authenticatedUser = (req as any).user;

  // 1. Strict Verification of Video Token
  const verification = JWTManager.verifyVideoToken(token, videoId, authenticatedUser.userId, userIP);

  if (!verification.valid) {
    // Audit suspicious activity if verification fails (potential token sharing)
    await supabase.from('audit_logs').insert([{
      action: 'SUSPICIOUS_VIDEO_ACTIVITY',
      performed_by: authenticatedUser.userId,
      target_user: authenticatedUser.userId,
      details: { error: verification.error, videoId, userIP },
      ip_address: userIP
    }]);

    // Action: Instruct Frontend to terminate playback or BAN if clear misuse
    return res.status(403).json({ 
      success: false, 
      action: 'STOP_PLAYBACK', 
      error: verification.error 
    });
  }

  // 2. Continuous Progress Syncing
  // Heartbeats happen every 10s, but we only sync to DB every heartbeat now for maximum safety
  await supabase.from('video_progress').upsert({
    user_id: authenticatedUser.userId,
    video_id: videoId,
    last_position: Math.floor(currentTime),
    watched_at: new Date().toISOString()
  }, { onConflict: 'user_id, video_id' });

  res.json({ success: true });
});

/**
 * 🔑 REQUEST VIDEO ACCESS:
 * The gateway to viewing any video. It hides the YouTube ID behind a JWT.
 */
router.post('/request-access', authMiddleware, videoApiLimiter, async (req, res) => {
  try {
    const { videoId, courseId } = req.body;
    const authenticatedUser = (req as any).user;
    const userIP = req.ip || '0.0.0.0';
    const deviceId = req.headers['x-device-id'] as string || 'unknown_device';

    // 1. Verify Enrollment & Profile Status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', authenticatedUser.userId)
      .single();

    if (!profile || profile.is_banned) {
      return res.status(403).json({ error: 'Access denied: Profile banned or missing' });
    }

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('active')
      .eq('user_id', authenticatedUser.userId)
      .eq('course_id', courseId)
      .single();

    if (!enrollment || !enrollment.active) {
      return res.status(403).json({ error: 'Access denied: Not enrolled or inactive' });
    }

    // 2. Get Real Video Details (Hidden from Frontend until now)
    const { data: video } = await supabase
      .from('videos')
      .select('youtube_video_id, view_limit')
      .eq('id', videoId)
      .single();

    if (!video) return res.status(404).json({ error: 'Video not found' });

    // 3. Optional: Check view limits logic here...

    // 4. Generate Security Package
    const access = await videoService.requestVideoAccess({
      userId: authenticatedUser.userId,
      videoId: video.youtube_video_id,
      courseId,
      userIP,
      deviceId,
      isEnrolled: true
    });

    res.json(access);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
