import { Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase';

export class PaymentController {
  static async paymobWebhook(req: Request, res: Response) {
    const hmac = req.query.hmac as string;
    const payload = req.body.obj;
    const secret = process.env.PAYMOB_HMAC_SECRET!;

    if (!hmac || !payload) {
        return res.status(400).send('Bad Request');
    }

    // تكوين سلسلة التشفير الخاصه بـ بيموب لضمان أمان الرد
    const dataString = `${payload.amount_cents}${payload.created_at}${payload.currency}${payload.error_occured}${payload.has_parent_transaction}${payload.id}${payload.integration_id}${payload.is_3d_secure}${payload.is_auth}${payload.is_capture}${payload.is_refunded}${payload.is_standalone_payment}${payload.is_voided}${payload.order.id}${payload.owner}${payload.pending}${payload.source_data.pan}${payload.source_data.sub_type}${payload.source_data.type}${payload.success}`;
    const calculatedHmac = crypto.createHmac('sha512', secret).update(dataString).digest('hex');

    // التحقق الصارم 
    if (calculatedHmac !== hmac) {
        console.warn('Fake Payment Webhook Blocked!');
        return res.status(401).send('Unauthorized Payment Webhook');
    }

    if (payload.success === true) {
        try {
            // المعرف يتكون من UserId_CourseId
            const merchantOrderId = payload.order.merchant_order_id;
            if (merchantOrderId && merchantOrderId.includes('_')) {
                const [userId, courseId] = merchantOrderId.split('_');
                await supabaseAdmin.from('enrollments').upsert({ 
                    user_id: userId, 
                    course_id: courseId, 
                    active: true, 
                    payment_method: 'paymob', 
                    transaction_id: payload.id.toString() 
                }, { onConflict: 'user_id, course_id' });
            }
        } catch(e) { 
            console.error('Enrollment Database Error:', e);
        }
    }
    
    // بيموب يتطلب استجابة 200 OK
    res.status(200).send('OK');
  }
}
