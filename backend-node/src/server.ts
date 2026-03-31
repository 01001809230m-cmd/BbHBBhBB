import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import videoRoutes from './routes/video.routes';
import adminRoutes from './routes/admin.routes';
import paymentRoutes from './routes/payment.routes';
import { apiLimiter } from './middleware/rate-limit.middleware';

dotenv.config();
const app = express();

// إعدادات الأمان
// السماح بـ iframe من يوتيوب فقط لمنع هجمات Clickjacking و XSS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://www.youtube.com', 'https://s.ytimg.com'],
      frameSrc: ["'self'", 'https://www.youtube.com'],
      connectSrc: ["'self'", process.env.SUPABASE_URL || 'https://nekwsfuxfpshbuzttrnb.supabase.co']
    }
  }
}));

app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
  credentials: true 
}));

app.use(express.json());
app.use(apiLimiter);

// المسارات API
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Secure LMS 11/10 Server is running on port ${PORT}`);
});
