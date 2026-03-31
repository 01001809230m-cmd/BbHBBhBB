import { JWTManager, VideoTokenPayload } from '../utils/jwt.util';
import { supabaseAdmin } from '../config/supabase';

export class VideoProtectionService {
  async requestVideoAccess(userId: string, videoId: string, userIP: string): Promise<{ success: boolean; token?: string; embedUrl?: string; error?: string }> {
    try {
      const { data: video, error: videoError } = await supabaseAdmin.from('videos').select('*').eq('id', videoId).single();
      if (videoError || !video) return { success: false, error: 'Video not found' };

      const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single();
      const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

      if (!isAdmin) {
        const { data: enrollment, error: enrollError } = await supabaseAdmin.from('enrollments').select('*').eq('user_id', userId).eq('course_id', video.course_id).eq('active', true).single();
        if (enrollError || !enrollment) return { success: false, error: 'Not enrolled in this course' };

        const { data: progress } = await supabaseAdmin.from('video_progress').select('view_count, id').eq('user_id', userId).eq('video_id', videoId).single();
        const currentViews = progress?.view_count || 0;
        
        if (currentViews >= (video.view_limit || 3)) {
            return { success: false, error: 'You have exceeded the maximum views for this video' };
        }

        if (!progress) {
          await supabaseAdmin.from('video_progress').insert({ user_id: userId, video_id: videoId, view_count: 1 });
        } else {
          await supabaseAdmin.from('video_progress').update({ view_count: currentViews + 1, watched_at: new Date().toISOString() }).eq('id', progress.id);
        }
      }

      const videoToken = JWTManager.generateVideoToken({
        userId, videoId: video.youtube_video_id, courseId: video.course_id, expiresAt: Date.now() + 3600000 * 2, allowedIPs: [userIP]
      });

      const params = new URLSearchParams({
        v: video.youtube_video_id, controls: '0', showinfo: '0', rel: '0', modestbranding: '1', disablekb: '1', fs: '0', 
        origin: process.env.FRONTEND_URL || 'http://localhost:5173'
      });
      
      return { success: true, token: videoToken, embedUrl: `https://www.youtube.com/embed/${video.youtube_video_id}?${params.toString()}` };
    } catch {
      return { success: false, error: 'Access generation failed' };
    }
  }
}
