import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

export const JWT_CONFIG = {
  ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || crypto.randomBytes(64).toString('hex'),
  VIDEO_SECRET: process.env.JWT_VIDEO_SECRET || crypto.randomBytes(64).toString('hex'),
  ACCESS_EXPIRY: '15m',      
  VIDEO_EXPIRY: '2h', 
  ISSUER: 'lms-secure',
  AUDIENCE: 'lms-students',
};

export interface VideoTokenPayload {
  userId: string;
  videoId: string;
  courseId: string;
  expiresAt: number;
  allowedIPs?: string[];
  deviceId?: string;
}

export class JWTManager {
  static generateAccessToken(userId: string, role: string): string {
    return jwt.sign({ userId, role, type: 'access' }, JWT_CONFIG.ACCESS_SECRET, {
      expiresIn: JWT_CONFIG.ACCESS_EXPIRY,
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    });
  }

  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, JWT_CONFIG.ACCESS_SECRET, { issuer: JWT_CONFIG.ISSUER });
    } catch {
      return null;
    }
  }

  static generateVideoToken(payload: VideoTokenPayload): string {
    const tokenData = {
      ...payload,
      type: 'video',
      iat: Math.floor(Date.now() / 1000),
      fingerprint: crypto.randomBytes(32).toString('hex'),
    };

    return jwt.sign(tokenData, JWT_CONFIG.VIDEO_SECRET, {
      expiresIn: JWT_CONFIG.VIDEO_EXPIRY,
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
      algorithm: 'HS512',
    });
  }

  static verifyVideoToken(token: string, videoId: string, userId: string, userIP?: string): { valid: boolean; error?: string } {
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.VIDEO_SECRET, { issuer: JWT_CONFIG.ISSUER }) as any;
      if (decoded.type !== 'video') return { valid: false, error: 'Invalid token type' };
      if (decoded.videoId !== videoId) return { valid: false, error: 'Video ID mismatch' };
      if (decoded.userId !== userId) return { valid: false, error: 'User ID mismatch' };
      if (decoded.allowedIPs && userIP && !decoded.allowedIPs.includes(userIP)) {
        return { valid: false, error: 'IP address mismatch. Sharing detected.' };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: 'Token verification failed' };
    }
  }
}
