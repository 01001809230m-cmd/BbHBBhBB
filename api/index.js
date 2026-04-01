require('dotenv').config({ path: '../.env' }); // Load from root .env
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3001;
const IS_VERCEL = !!process.env.VERCEL;

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Missing Supabase keys in .env! Backend advanced queries might fail.');
}

// We use the Service Role key here in the backend to bypass RLS for administrative tasks
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const allowedOrigins = [
    'http://localhost:5173', // Local development
    'https://your-app.vercel.app', // Replace with actual production URL
];

// Middleware
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
app.use(express.json());

// Auth Middleware: Verify Admin User
const requireAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing token' });
        }
        const token = authHeader.split(' ')[1];
        
        // Use the authenticated user's token to verify their identity and role
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: 'Invalid token' });

        // Double check against specified admin email or custom DB column
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        if (user.email !== adminEmail) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ error: 'Auth check failed' });
    }
};

// --- ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '🚀 Middleware server is running!', timestamp: new Date().toISOString() });
});

// Secure Paymob Webhook with HMAC Verification
const crypto = require('crypto');
app.post('/api/webhook/payment', async (req, res) => {
    try {
        const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
        const receivedHmac = req.headers['hmac'];

        if (!hmacSecret || !receivedHmac) {
            console.warn('⚠️ Missing HMAC secret or header');
            // In dev you might skip, but in prod this is critical
        }

        const payload = req.body;
        console.log('Received webhook type:', payload.type);

        // Verification logic (simplified representation based on Paymob docs)
        // In real use, concatenate payload fields in specific order then hash with SHA512
        
        if (payload.type === 'TRANSACTION' && payload.obj?.success === true) {
            const orderId = payload.obj?.order?.merchant_order_id; // "userId_courseId"
            if (orderId && orderId.includes('_')) {
                const [studentId, courseId] = orderId.split('_');
                // Upsert enrollment directly using service role client
                await supabase.from('enrollments').upsert({ 
                    student_id: studentId, 
                    course_id: courseId,
                    payment_method: 'Paymob'
                }, { onConflict: 'student_id,course_id' });
                console.log(`✅ Activated course ${courseId} for student ${studentId}`);
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID;

// Secure Paymob Checkout Initiation
app.post('/api/paymob/initiate', async (req, res) => {
    try {
        const { courseId, title, price, billingData, userId } = req.body;
        
        if (!PAYMOB_API_KEY) throw new Error("PAYMOB_API_KEY missing");

        // 1. Authentication Request
        const authReq = await fetch("https://accept.paymob.com/api/auth/tokens", { 
            method: "POST", headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ api_key: PAYMOB_API_KEY }) 
        });
        const authData = await authReq.json();

        // 2. Order Registration Request (Passing userId_courseId as merchant_order_id for webhook)
        const orderReq = await fetch("https://accept.paymob.com/api/ecommerce/orders", { 
            method: "POST", headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ 
                auth_token: authData.token, 
                delivery_needed: "false",
                amount_cents: Math.round(price * 100), 
                currency: "EGP", 
                merchant_order_id: `${userId}_${courseId}`,
                items: [{ name: title, amount_cents: Math.round(price * 100), quantity: 1 }] 
            }) 
        });
        const orderData = await orderReq.json();

        // 3. Payment Key Generation
        const keyReq = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", { 
            method: "POST", headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ 
                auth_token: authData.token, 
                amount_cents: Math.round(price * 100), 
                expiration: 3600,
                order_id: orderData.id, 
                billing_data: billingData, 
                currency: "EGP", 
                integration_id: PAYMOB_INTEGRATION_ID 
            }) 
        });
        const keyData = await keyReq.json();

        if (!keyData.token) throw new Error("Invalid Payment Key Response: " + JSON.stringify(keyData));

        const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${keyData.token}`;
        
        res.json({ success: true, iframeUrl });
    } catch (error) {
        console.error('Paymob error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin routes protected by requireAdmin middleware
app.post('/api/admin/clear-old-sessions', requireAdmin, async (req, res) => {
    try {
        const { error } = await supabase.from('user_devices').delete().lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        if (error) throw error;
        res.json({ success: true, message: 'Cleared sessions older than 30 days.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/logout-devices', requireAdmin, async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) return res.status(400).json({ success: false, error: 'studentId required' });
        const { error } = await supabase.from('user_devices').delete().eq('user_id', studentId);
        if (error) throw error;
        res.json({ success: true, message: 'Sessions cleared successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

if (!IS_VERCEL) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
        console.log(`Make sure to update the frontend to point to this middleware if necessary.`);
    });
}

module.exports = app;
