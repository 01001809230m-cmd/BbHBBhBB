import rateLimit from 'express-rate-limit';

export const videoApiLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 20, 
  message: { error: 'Too many video access requests, please try again later.' }
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many API requests from this IP.' }
});
