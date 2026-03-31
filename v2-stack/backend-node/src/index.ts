import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { apiLimiter } from './middleware/rate-limit.middleware';
import videoRouter from './routes/video.routes';



const app = express();
const port = process.env.PORT || 3001;

// 1. SECURITY MIDDLEWARE (Helmet & CSP)
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://www.youtube.com', 'https://s.ytimg.com', 'https://www.google-analytics.com'],
    frameSrc: ["'self'", 'https://www.youtube.com', 'https://accept.paymob.com'],
    imgSrc: ["'self'", 'data:', 'https://i.ytimg.com', 'https://*.supabase.co'],
    connectSrc: ["'self'", 'https://*.supabase.co', 'https://accept.paymob.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  },
}));

// 2. CORS CONFIGURATION
const allowedOrigins = [
  'http://localhost:5173', // Local development
  'https://your-production-app.vercel.app', // Update with actual URL
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// 3. PARSERS & LIMITERS
app.use(express.json());
app.use(apiLimiter);

// 4. ROUTES
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: 'V2 (11/10 Standard)', 
    timestamp: new Date().toISOString() 
  });
});

// Video Protection & Heartbeat Routes
app.use('/api/videos', videoRouter);

// Admin & Auth routes (Would be implemented in their own files, but keeping structure clean)
// app.use('/api/admin', adminRouter);

// 5. ERROR HANDLING
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// START SERVER
app.listen(port, () => {
  console.log(`🚀 Security-Enhanced Backend running on port ${port}`);
  console.log(`🔒 Helmet & Rate Limiting active.`);
});

export default app;
