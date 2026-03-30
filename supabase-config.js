// ==========================================
// ⚙️ إعدادات المنصة المركزية - Version 3.2 (Final)
// ==========================================

// 🔴 1. إعدادات الاتصال بـ Supabase
const SUPABASE_URL = 'https://abddxitpnizqjlaqvrpz.supabase.co'; 

// ✅ مفتاحك الذي يعمل (تم الإبقاء عليه كما طلبت)
const SUPABASE_KEY = 'sb_publishable_UDppB_CLfjfY2Lsb2rJEIQ_Xp2VacNn'; 

// 🔴 2. إعدادات الأدمن والتواصل (Global Variables)
window.ADMIN_EMAIL = '01001809230m@gmail.com';     
window.TEACHER_PHONE = '201000623768';             
window.DEV_PHONE = '201001809230';                 

// ==========================================
// ⚙️ إعدادات Paymob (التصحيح النهائي من الصور)
// ==========================================

// 1. مفتاح الـ API العام (وليس الـ Secret Key)
// هذا هو المفتاح الطويل جداً الذي يبدأ بـ eyJ من الصورة الأولى
window.PAYMOB_API_KEY = "ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TVRFeU9UVTBNQ3dpYm1GdFpTSTZJbWx1YVhScFlXd2lmUS5EQV92Q0JSbzFoMWNneW1jRDJJcmgzQmYzT0tsQUc0dnR1clZYS1VCaTM0eThmbGdIejQ2cnFUZ1pzODhBX01zaXctMDJlbGc4SVUxZlFNRzg2eldLZw==";

// 2. رقم دمج الكروت (Integration ID) - صحيح من الصورة
window.PAYMOB_INTEGRATION_ID = 5503477; 

// 3. رقم الإفريم (Iframe ID) - صحيح من الصورة
window.PAYMOB_IFRAME_ID = 1004618; 

// ==========================================
// 🛠️ تهيئة المكتبة والوظائف الأساسية
// ==========================================

// 1. إنشاء عميل Supabase
if (typeof supabase === 'undefined') {
    console.error('⚠️ مكتبة Supabase لم يتم تحميلها! تأكد من وجود رابط الـ CDN في الـ head.');
} else {
    // التأكد من عدم تكرار الإنشاء
    if (!window.supabaseClient) {
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.supabaseClient = true; // علامة إننا عملنا اتصال
        console.log('✅ Supabase Connected Successfully');
    }
}

// 2. دالة حماية لوحة التحكم (Admin Guard)
async function checkAdminAccess() {
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        
        // لو مفيش يوزر أو الإيميل مش هو إيميل الأدمن
        if (!user || user.email !== window.ADMIN_EMAIL) {
            document.body.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#111; color:red; flex-direction:column; font-family:sans-serif;">
                    <h1>⛔ منطقة محظورة</h1>
                    <p>جاري تحويلك للصفحة الرئيسية...</p>
                </div>
            `;
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return false;
        }
        return true; 
    } catch (error) {
        console.error('Auth Check Error:', error);
        window.location.href = 'index.html';
    }
}

// 3. تحديث روابط الواتساب تلقائياً
function setupContactLinks() {
    const teacherLinks = document.querySelectorAll('a[href*="TEACHER_PHONE"], #waLink');
    const devLinks = document.querySelectorAll('a[href*="DEV_PHONE"], #devLink');

    teacherLinks.forEach(link => { link.href = `https://wa.me/${window.TEACHER_PHONE}`; });
    devLinks.forEach(link => { link.href = `https://wa.me/${window.DEV_PHONE}`; });
}

document.addEventListener('DOMContentLoaded', setupContactLinks);
