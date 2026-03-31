import { Request, Response, NextFunction } from 'express';
import { JWTManager } from '../utils/jwt.util';
import { supabaseAdmin } from '../config/supabase';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      clientIp?: string;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = JWTManager.verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
  }

  const { data: user, error } = await supabaseAdmin
    .from('profiles')
    .select('is_banned, role')
    .eq('id', decoded.userId)
    .single();
  
  if (error || !user) return res.status(401).json({ error: 'User not found' });
  if (user.is_banned) return res.status(403).json({ error: 'Account has been banned' });

  req.user = { userId: decoded.userId, role: user.role };
  req.clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
  next();
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
