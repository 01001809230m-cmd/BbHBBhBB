import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const JWT_CONFIG = {
  ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_SECRET || 'mustafa_access_secret_777',
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET || 'mustafa_refresh_secret_777',
  VIDEO_TOKEN_SECRET: process.env.JWT_VIDEO_SECRET || 'mustafa_video_secret_777',
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  VIDEO_TOKEN_EXPIRY: '1h', // Video token lives for 1 hour only
  ISSUER: 'mustafa-platform',
  AUDIENCE: 'platform-students',
};

export interface VideoTokenPayload {
  userId: string;
  videoId: string;
  courseId: string;
  expiresAt: number;
  maxViews?: number;
  currentViews?: number;
  allowedIPs?: string[];
  deviceId?: string;
}

export class JWTManager {
  // Generate Access Token
  static generateAccessToken(payload: { userId: string, role: string }): string {
    return jwt.sign(payload, JWT_CONFIG.ACCESS_TOKEN_SECRET as string, {
      expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY as any,
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    });
  }

  // Generate Video Token (The core of protection)
  static generateVideoToken(payload: VideoTokenPayload): string {
    const tokenData = {
      ...payload,
      type: 'video',
      iat: Math.floor(Date.now() / 1000),
      fingerprint: crypto.randomBytes(32).toString('hex'), // Encrypted fingerprint to prevent forgery
    };

    return jwt.sign(tokenData, JWT_CONFIG.VIDEO_TOKEN_SECRET as string, {
      expiresIn: JWT_CONFIG.VIDEO_TOKEN_EXPIRY as any,
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
      algorithm: 'HS512', // Strong encryption
    });
  }

  // Strict verification of Video Token
  static verifyVideoToken(
    token: string,
    videoId: string,
    userId: string,
    userIP?: string,
    deviceId?: string
  ): { valid: boolean; payload?: VideoTokenPayload; error?: string } {
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.VIDEO_TOKEN_SECRET, {
        issuer: JWT_CONFIG.ISSUER,
        audience: JWT_CONFIG.AUDIENCE,
      }) as any;

      if (decoded.type !== 'video') return { valid: false, error: 'Invalid token type' };
      if (decoded.videoId !== videoId) return { valid: false, error: 'Video ID mismatch' };
      if (decoded.userId !== userId) return { valid: false, error: 'User ID mismatch' };

      // Verify that IP hasn't changed (prevents sharing the link with others)
      if (decoded.allowedIPs && decoded.allowedIPs.length > 0) {
        if (!userIP || !decoded.allowedIPs.includes(userIP)) {
          return { valid: false, error: 'IP address not allowed. Sharing detected!' };
        }
      }

      // Verify device
      if (decoded.deviceId && deviceId && decoded.deviceId !== deviceId) {
        return { valid: false, error: 'Device ID mismatch' };
      }

      return { valid: true, payload: decoded as VideoTokenPayload };
    } catch (error) {
      return { valid: false, error: 'Token verification failed' };
    }
  }
}
