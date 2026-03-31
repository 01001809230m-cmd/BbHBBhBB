import { JWTManager, VideoTokenPayload } from '../utils/jwt.util';
import crypto from 'crypto';

export class VideoProtectionService {
  /**
   * Request Video Access: Called when a student presses 'Play'
   * @param request Access request details including userId, videoId, courseId, userIP, and deviceId
   */
  async requestVideoAccess(request: {
    userId: string;
    videoId: string;
    courseId: string;
    userIP: string;
    deviceId: string;
    isEnrolled: boolean;
  }): Promise<{ success: boolean; token?: string; embedUrl?: string; error?: string }> {
    try {
      // 1. Verify Enrollment (This should be checked against DB before calling this service)
      if (!request.isEnrolled) {
        return { success: false, error: 'Not enrolled in this course' };
      }

      // 2. Generate the Secret Token
      const tokenPayload: VideoTokenPayload = {
        userId: request.userId,
        videoId: request.videoId, // Real YouTube ID is stored here (encrypted)
        courseId: request.courseId,
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour duration
        allowedIPs: [request.userIP],
        deviceId: request.deviceId,
      };

      const videoToken = JWTManager.generateVideoToken(tokenPayload);

      // 3. Generate Protected Embed URL
      const embedUrl = this.generateProtectedEmbedUrl(request.videoId, videoToken);

      return { success: true, token: videoToken, embedUrl: embedUrl };
    } catch (error) {
      return { success: false, error: 'Failed to generate secure access' };
    }
  }

  /**
   * Engineered YouTube Embed URL with strict parameters to prevent downloading/sharing
   */
  private generateProtectedEmbedUrl(videoId: string, token: string): string {
    const baseUrl = 'https://www.youtube.com/embed/';
    const params = new URLSearchParams({
      v: videoId,
      controls: '0',        // Hide controls to prevent easy downloads
      showinfo: '0',        // Hide video title
      rel: '0',             // Prevent recommended videos at end
      modestbranding: '1',   // Hide YouTube logo as much as possible
      disablekb: '1',       // Disable keyboard shortcuts
      fs: '0',              // Disable fullscreen (to prevent easy screen recording)
      // Custom token injected for tracking in heartbeat later
      token: token,
      origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Domain restriction
    });
    return `${baseUrl}${videoId}?${params.toString()}`;
  }
}
