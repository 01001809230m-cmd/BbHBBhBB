import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, ADMIN_EMAIL } from '../lib/supabaseClient';
import Swal from 'sweetalert2';
import gsap from 'gsap';

const GOVERNORATES = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "الشرقية", "السويس", "أسوان", "أسيوط", "بنى سويف", "بورسعيد", "دمياط", "جنوب سيناء", "كفر الشيخ", "مطروح", "قنا", "شمال سيناء", "سوهاج", "الأقصر"
];

const Login = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('login');
    const [showPassword, setShowPassword] = useState(false);
    
    // States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [governorate, setGovernorate] = useState('');
    const [loading, setLoading] = useState(false);

    // Yeti Refs
    const armL = useRef(null);
    const armR = useRef(null);
    const eyeL = useRef(null);
    const eyeR = useRef(null);
    const nose = useRef(null);
    const mouth = useRef(null);
    const mouthBG = useRef(null);
    const tooth = useRef(null);
    const tongue = useRef(null);
    const chin = useRef(null);
    const face = useRef(null);
    const eyebrow = useRef(null);
    const hair = useRef(null);
    const twoFingers = useRef(null);

    const activeElement = useRef(null);
    const screenCenter = useRef(0);
    const eyeLCoords = useRef({ x: 0, y: 0 });
    const eyeRCoords = useRef({ x: 0, y: 0 });
    const noseCoords = useRef({ x: 0, y: 0 });
    const mouthCoords = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const updateCoords = () => {
            const getPos = (el) => {
                if (!el) return { x: 0, y: 0 };
                const rect = el.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            };
            if (eyeL.current) {
                eyeLCoords.current = getPos(eyeL.current);
                eyeRCoords.current = getPos(eyeR.current);
                noseCoords.current = getPos(nose.current);
                mouthCoords.current = getPos(mouth.current);
                screenCenter.current = window.innerWidth / 2;
            }
        };

        updateCoords();
        window.addEventListener('resize', updateCoords);
        return () => window.removeEventListener('resize', updateCoords);
    }, []);

    const getAngle = (x1, y1, x2, y2) => Math.atan2(y1 - y2, x1 - x2);

    const calculateFaceMove = (inputElement) => {
        if (!inputElement) return;
        
        const carPos = inputElement.selectionEnd || inputElement.value.length;
        const rect = inputElement.getBoundingClientRect();
        const inputX = rect.left;
        const inputY = rect.top;

        const charWidth = 8;
        const caretX = inputX + (inputElement.value.length - carPos) * charWidth;
        const targetX = caretX;
        const targetY = inputY + 25;

        const eyeLAngle = getAngle(eyeLCoords.current.x, eyeLCoords.current.y, targetX, targetY);
        const eyeRAngle = getAngle(eyeRCoords.current.x, eyeRCoords.current.y, targetX, targetY);
        const noseAngle = getAngle(noseCoords.current.x, noseCoords.current.y, targetX, targetY);
        const mouthAngle = getAngle(mouthCoords.current.x, mouthCoords.current.y, targetX, targetY);

        const dist = Math.min(Math.abs(screenCenter.current - targetX) / 10, 20);
        const dir = targetX < screenCenter.current ? 1 : -1;

        gsap.to(eyeL.current, { duration: 0.6, x: -Math.cos(eyeLAngle) * 15, y: -Math.sin(eyeLAngle) * 8, ease: "power2.out" });
        gsap.to(eyeR.current, { duration: 0.6, x: -Math.cos(eyeRAngle) * 15, y: -Math.sin(eyeRAngle) * 8, ease: "power2.out" });
        gsap.to(nose.current, { duration: 0.6, x: -Math.cos(noseAngle) * 18, y: -Math.sin(noseAngle) * 8, ease: "power2.out" });
        gsap.to(mouth.current, { duration: 0.6, x: -Math.cos(mouthAngle) * 18, y: -Math.sin(mouthAngle) * 8, ease: "power2.out" });
        gsap.to(face.current, { duration: 0.6, x: dir * dist * 0.3, skewX: dir * dist * 0.5, ease: "power2.out" });
        gsap.to(eyebrow.current, { duration: 0.6, x: dir * dist * 0.3, skewX: dir * dist * 0.8, ease: "power2.out" });
    };

    const resetFace = () => {
        if (activeElement.current) return;
        gsap.to([eyeL.current, eyeR.current, nose.current, mouth.current, face.current, eyebrow.current, chin.current, hair.current], {
            duration: 0.8, x: 0, y: 0, scale: 1, rotation: 0, skewX: 0, ease: "power2.inOut"
        });
    };

    const coverEyes = () => {
        gsap.killTweensOf([armL.current, armR.current]);
        gsap.set([armL.current, armR.current], { visibility: "visible" });
        gsap.to(armL.current, { duration: 0.45, x: -93, y: 10, rotation: 0, ease: "quad.out" });
        gsap.to(armR.current, { duration: 0.45, x: -93, y: 10, rotation: 0, ease: "quad.out", delay: 0.1 });
    };

    const uncoverEyes = () => {
        gsap.to(armL.current, { duration: 0.45, x: 0, y: 100, rotation: 0, ease: "quad.in" });
        gsap.to(armR.current, { duration: 0.45, x: 0, y: 100, rotation: 0, ease: "quad.in", onComplete: () => {
            gsap.set([armL.current, armR.current], { visibility: "hidden" });
        } });
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (activeTab === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                Swal.fire({ icon: 'success', title: 'تم تسجيل الدخول', timer: 1500, showConfirmButton: false });
                navigate(email === ADMIN_EMAIL ? '/dashboard' : '/all-courses');
            } else {
                const { data, error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: { data: { full_name: name, phone, parent_phone: parentPhone, governorate } }
                });
                if (error) throw error;
                Swal.fire({ icon: 'success', title: 'تم إنشاء الحساب', text: 'يرجى مراجعة بريدك الإلكتروني لتنشيط الحساب', confirmButtonText: 'حسناً' });
                setActiveTab('login');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (setter, e) => {
        setter(e.target.value);
        if (activeElement.current === 'email' || activeElement.current === 'name') {
            calculateFaceMove(e.target);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors" dir="rtl">
            <div className="login-box-yeti animate-fade-in-up">
                <div className="inner-content-yeti">
                    <h2 className="text-2xl font-black text-on-background mb-6 font-headline">منصة أ. محمد زايد</h2>
                    
                    <div className="flex gap-8 mb-8 border-b border-outline-variant/10 w-full justify-center">
                        <button onClick={() => setActiveTab('login')} className={`pb-3 font-bold transition-all ${activeTab === 'login' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}>دخول</button>
                        <button onClick={() => setActiveTab('register')} className={`pb-3 font-bold transition-all ${activeTab === 'register' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}>حساب جديد</button>
                    </div>

                    <div className="svgContainer">
                        <div>
                            <svg className="mySVG" viewBox="0 0 200 200">
                                <defs><circle id="armMaskPath" cx="100" cy="100" r="100"/></defs>
                                <clipPath id="armMask"><use href="#armMaskPath" overflow="visible"/></clipPath>
                                
                                <g ref={face}>
                                    {/* Fur BG */}
                                    <path fill="var(--surface-container-lowest)" stroke="var(--primary)" strokeWidth="2.5" d="M200,158.5c0-20.2-14.8-36.5-35-36.5h-14.9V72.8c0-27.4-21.7-50.4-49.1-50.8c-28-0.5-50.9,22.1-50.9,50v50 H35.8C16,122,0,138,0,157.8L0,213h200L200,158.5z"/>
                                    {/* Chest */}
                                    <path ref={chin} fill="var(--surface-container-low)" d="M100,156.4c-22.9,0-43,11.1-54.1,27.7c15.6,10,34.2,15.9,54.1,15.9s38.5-5.8,54.1-15.9 C143,167.5,122.9,156.4,100,156.4z"/>
                                    {/* Face Skin */}
                                    <path fill="var(--surface-container-high)" d="M134.5,46v35.5c0,21.8-15.4,39.5-34.5,39.5s-34.5-17.7-34.5-39.5V46"/>
                                    {/* Hair */}
                                    <path ref={hair} fill="var(--surface-container-lowest)" stroke="var(--primary)" strokeWidth="2.5" d="M81.5,27.9c1.8-4.1,5.5-8.3,11.3-11.8c1,2.6,1.9,5.1,2.7,7.7c3.2-4.3,8.6-8.3,16.3-11.2c-0.7,3.3-1.6,6.6-2.6,9.8c4.9-2.1,11-3.6,18.4-4.2c-2.4,3.2-5,6.4-7.9,9.5"/>
                                    {/* Eyebrow */}
                                    <g ref={eyebrow}>
                                        <path fill="var(--surface-container-lowest)" stroke="var(--primary)" strokeWidth="2.5" d="M63.6,55.1c6.2,5.6,13.4,10.6,21.3,14.7c2.1-2.8,4-5.6,5.8-8.5c4.5,3.8,9.6,7.3,15.1,10.3c1.2-3,2.3-6.1,3.3-9.2c4.1,2,8.4,3.8,13,5.2c0.5-3.3,1-6.7,1.3-10c4.9-0.5,9.9-1.3,14.8-2.6"/>
                                    </g>
                                    {/* Eyes */}
                                    <g ref={eyeL}><circle cx="85.5" cy="78.5" r="3.5" fill="var(--primary)"/><circle cx="84" cy="76" r="1" fill="#fff"/></g>
                                    <g ref={eyeR}><circle cx="114.5" cy="78.5" r="3.5" fill="var(--primary)"/><circle cx="113" cy="76" r="1" fill="#fff"/></g>
                                    {/* Mouth */}
                                    <g ref={mouth}>
                                        <path ref={mouthBG} fill="var(--on-surface-variant)" d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8 c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2 c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z"/>
                                    </g>
                                </g>
                                {/* Nose */}
                                <path ref={nose} d="M97.7 79.9h4.7c1.9 0 3 2.2 1.9 3.7l-2.3 3.3c-.9 1.3-2.9 1.3-3.8 0l-2.3-3.3c-1.3-1.6-.2-3.7 1.8-3.7z" fill="var(--primary)"/>
                                
                                <g className="arms" clipPath="url(#armMask)">
                                    <g ref={armL} style={{ visibility: 'hidden' }}>
                                        <polygon fill="var(--surface-container-lowest)" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points="121.3,98.4 111,59.7 149.8,49.3 169.8,85.4"/>
                                        <path fill="var(--surface-container-lowest)" stroke="var(--primary)" strokeWidth="2.5" d="M134.4,53.5l19.3-5.2c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-10.3,2.8"/>
                                        <path fill="var(--surface-container-lowest)" stroke="var(--primary)" strokeWidth="2.5" d="M150.9,59.4l26-7c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-21.3,5.7"/>
                                        <g ref={twoFingers}>
                                            <path fill="var(--surface-container-lowest)" stroke="var(--primary)" strokeWidth="2.5" d="M158.3,67.8l23.1-6.2c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-23.1,6.2"/>
                                            <path fill="var(--primary)" d="M180.1,65l2.2-0.6c1.1-0.3,2.2,0.3,2.4,1.4v0c0.3,1.1-0.3,2.2-1.4,2.4l-2.2,0.6L180.1,65z"/>
                                            <path fill="var(--surface-container-lowest)" stroke="var(--primary)" strokeWidth="2.5" d="M160.8,77.5l19.4-5.2c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-18.3,4.9"/>
                                            <path fill="var(--primary)" d="M178.8,75.7l2.2-0.6c1.1-0.3,2.2,0.3,2.4,1.4v0c0.3,1.1-0.3,2.2-1.4,2.4l-2.2,0.6L178.8,75.7z"/>
                                        </g>
                                        <path fill="#FFFFFF" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M123.5,97.8 c-41.4,14.9-84.1,30.7-108.2,35.5L1.2,81c33.5-9.9,71.9-16.5,111.9-21.8"/>
                                    </g>
                                    <g ref={armR} style={{ visibility: 'hidden' }}>
                                        <path fill="var(--surface-container-lowest)" stroke="var(--primary)" strokeWidth="2.5" d="M265.4 97.3l10.4-38.6-38.9-10.5-20 36.1z"/>
                                        <path fill="var(--surface-container-lowest)" stroke="var(--primary)" strokeWidth="2.5" d="M252.4 52.4L233 47.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l10.3 2.8M226 76.4l-19.4-5.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l18.3 4.9M228.4 66.7l-23.1-6.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l23.1 6.2M235.8 58.3l-26-7c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l21.3 5.7"/>
                                        <path fill="#fff" stroke="var(--primary)" strokeWidth="2.5" d="M263.3 96.7c41.4 14.9 84.1 30.7 108.2 35.5l14-52.3C352 70 313.6 63.5 273.6 58.1"/>
                                    </g>
                                </g>
                            </svg>
                        </div>
                    </div>

                    <form onSubmit={handleAuth} className="w-full">
                        {activeTab === 'register' && (
                           <div className="animate-fade-in">
                             <div className="inputGroupYeti">
                                <label>الاسم الكامل (ثلاثي)</label>
                                <input type="text" value={name} onChange={e => handleInput(setName, e)} onFocus={e => { activeElement.current="name"; calculateFaceMove(e.target); }} onBlur={() => { activeElement.current=null; resetFace(); }} required placeholder="الاسم هنا..." />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="inputGroupYeti">
                                   <label>المحافظة</label>
                                   <select value={governorate} onChange={e => handleInput(setGovernorate, e)} onFocus={() => { activeElement.current="gov"; }} onBlur={() => { activeElement.current=null; resetFace(); }} required>
                                      <option value="">المحافظة...</option>
                                      {GOVERNORATES.map(gov => <option key={gov} value={gov}>{gov}</option>)}
                                   </select>
                                </div>
                                <div className="inputGroupYeti">
                                   <label>رقم الهاتف</label>
                                   <input type="tel" value={phone} onChange={e => handleInput(setPhone, e)} onFocus={e => { activeElement.current="phone"; calculateFaceMove(e.target); }} onBlur={() => { activeElement.current=null; resetFace(); }} required placeholder="01xxxxxxxxx" />
                                </div>
                             </div>
                             <div className="inputGroupYeti">
                                <label>رقم هاتف ولي الأمر (اختياري)</label>
                                <input type="tel" value={parentPhone} onChange={e => handleInput(setParentPhone, e)} onFocus={e => { activeElement.current="parent"; calculateFaceMove(e.target); }} onBlur={() => { activeElement.current=null; resetFace(); }} placeholder="01xxxxxxxxx" />
                             </div>
                           </div>
                        )}

                        <div className="inputGroupYeti">
                            <label>البريد الإلكتروني</label>
                            <input type="email" value={email} onChange={e => handleInput(setEmail, e)} onFocus={e => { activeElement.current="email"; calculateFaceMove(e.target); }} onBlur={() => { activeElement.current=null; resetFace(); }} required placeholder="your@email.com" />
                        </div>

                        <div className="inputGroupYeti">
                            <label>كلمة المرور</label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onFocus={coverEyes} onBlur={uncoverEyes} required placeholder="********" />
                                <div className="absolute left-[12px] top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <span className="text-[11px] text-on-surface-variant font-bold">{showPassword ? 'إخفاء' : 'إظهار'}</span>
                                    <label className="relative block h-5 w-5 cursor-pointer">
                                        <input type="checkbox" className="sr-only" onChange={e => setShowPassword(e.target.checked)} />
                                        <div className="indicator-yeti" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full h-[56px] text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center">
                            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (activeTab === 'login' ? 'دخول' : 'إنشاء حساب')}
                        </button>
                    </form>
                    <div className="mt-8 text-[11px] text-on-surface-variant text-center opacity-70 font-bold">بواسطة مصطفى محمود - جميع الحقوق محفوظة</div>
                </div>
            </div>
        </div>
    );
};

export default Login;
