import rateLimit from 'express-rate-limit';

/**
 * Protect against Brute Force attacks on sensitive endpoints (Login, Signup)
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: { error: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Protect against Video Scraping and token misuse
 */
export const videoApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { error: 'Too many access requests for videos. Monitoring active.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General rate limit for API endpoints
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP' }
});
