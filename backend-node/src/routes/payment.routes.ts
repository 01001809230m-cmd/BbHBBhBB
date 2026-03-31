import express from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router = express.Router();

// لا نستخدم الـ Rate Limit أو الـ Auth لأن هذا الطلب يأتي من سيرفرات بيموب وليس المتصفح
router.post('/webhook/paymob', PaymentController.paymobWebhook);

export default router;
