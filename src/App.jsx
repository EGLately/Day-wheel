import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { supabase } from "./supabase";
import DayWheel from "./pages/DayWheel";
function DayWheelWrapper({ userId, onSignOut }) {
  return <DayWheel userId={userId} onSignOut={onSignOut} />;
}
import Focus from "./pages/Focus";

const C2 = { bg:"#f5f1ea", ink:"#181614", muted:"#8b8378", line:"#d9d2c2", white:"#fbf9f4" };

function ResetPasswordScreen({ onDone }) {
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  if (success) return (
    <div style={{ minHeight:"100vh", background:C2.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ background:C2.white, border:`1px solid ${C2.line}`, borderRadius:16, padding:40, width:360, textAlign:"center" }}>
        <div style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:28, marginBottom:12 }}>Password updated!</div>
        <div style={{ fontSize:14, color:C2.muted, lineHeight:1.6, marginBottom:24 }}>Your password has been changed. You can now log in with your new password.</div>
        <button onClick={onDone} style={{ background:C2.ink, color:C2.white, border:"none", borderRadius:8, padding:"10px 24px", fontSize:13, cursor:"pointer", fontFamily:"Inter" }}>
          Back to login
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C2.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ background:C2.white, border:`1px solid ${C2.line}`, borderRadius:16, padding:40, width:360 }}>
        <div style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:34, marginBottom:4 }}>Day Wheel</div>
        <div style={{ fontSize:12, color:C2.muted, marginBottom:28 }}>Set a new password for your account.</div>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <input type="password" placeholder="New password" value={password} onChange={e=>setPassword(e.target.value)} required
            style={{ fontSize:14, padding:"10px 12px", border:`1px solid ${C2.line}`, borderRadius:8, outline:"none", fontFamily:"Inter", background:C2.bg }} />
          <input type="password" placeholder="Confirm new password" value={confirm} onChange={e=>setConfirm(e.target.value)} required
            style={{ fontSize:14, padding:"10px 12px", border:`1px solid ${C2.line}`, borderRadius:8, outline:"none", fontFamily:"Inter", background:C2.bg }} />
          {error && <div style={{ fontSize:12, color:"#a04040", background:"#fdf4f4", border:"1px solid #f0d0d0", borderRadius:6, padding:"8px 10px" }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ background:C2.ink, color:C2.white, border:"none", borderRadius:8, padding:"11px 0", fontSize:14, cursor:loading?"wait":"pointer", fontFamily:"Inter", fontWeight:500, opacity:loading?0.7:1 }}>
            {loading ? "Updating..." : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState(null);
  const [showForgot, setShowForgot] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.user);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setDone(true);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function sendForgot(e) {
    e.preventDefault();
    setForgotError(null); setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: "https://day-wheel-teal.vercel.app/",
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err) { setForgotError(err.message); }
    finally { setForgotLoading(false); }
  }

  if (done) return (
    <div style={{ minHeight:"100vh", background:C2.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ background:C2.white, border:`1px solid ${C2.line}`, borderRadius:16, padding:40, width:360, textAlign:"center" }}>
        <div style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:28, marginBottom:12 }}>Check your email</div>
        <div style={{ fontSize:14, color:C2.muted, lineHeight:1.6 }}>We sent a confirmation link to <strong style={{ color:C2.ink }}>{email}</strong>. Click it to activate your account, then come back and log in.</div>
        <button onClick={() => { setMode("login"); setDone(false); }} style={{ marginTop:24, background:C2.ink, color:C2.white, border:"none", borderRadius:8, padding:"10px 24px", fontSize:13, cursor:"pointer", fontFamily:"Inter" }}>Back to login</button>
      </div>
    </div>
  );

  if (showForgot) return (
    <div style={{ minHeight:"100vh", background:C2.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ background:C2.white, border:`1px solid ${C2.line}`, borderRadius:16, padding:40, width:360 }}>
        <div style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:34, marginBottom:4 }}>Day Wheel</div>
        {forgotSent ? (
          <>
            <div style={{ fontSize:14, color:C2.muted, lineHeight:1.6, marginBottom:24 }}>
              We sent a reset link to <strong style={{ color:C2.ink }}>{forgotEmail}</strong>. Check your inbox and click the link to set a new password.
            </div>
            <button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}
              style={{ background:C2.ink, color:C2.white, border:"none", borderRadius:8, padding:"10px 24px", fontSize:13, cursor:"pointer", fontFamily:"Inter", width:"100%" }}>
              Back to login
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize:12, color:C2.muted, marginBottom:28 }}>Enter your email and we'll send you a reset link.</div>
            <form onSubmit={sendForgot} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <input type="email" placeholder="Email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} required
                style={{ fontSize:14, padding:"10px 12px", border:`1px solid ${C2.line}`, borderRadius:8, outline:"none", fontFamily:"Inter", background:C2.bg }} />
              {forgotError && <div style={{ fontSize:12, color:"#a04040", background:"#fdf4f4", border:"1px solid #f0d0d0", borderRadius:6, padding:"8px 10px" }}>{forgotError}</div>}
              <button type="submit" disabled={forgotLoading}
                style={{ background:C2.ink, color:C2.white, border:"none", borderRadius:8, padding:"11px 0", fontSize:14, cursor:forgotLoading?"wait":"pointer", fontFamily:"Inter", fontWeight:500, opacity:forgotLoading?0.7:1 }}>
                {forgotLoading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <div style={{ marginTop:18, textAlign:"center", fontSize:12, color:C2.muted }}>
              <button onClick={() => setShowForgot(false)} style={{ background:"none", border:"none", color:C2.ink, cursor:"pointer", fontSize:12, fontFamily:"Inter", textDecoration:"underline" }}>
                Back to login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C2.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ background:C2.white, border:`1px solid ${C2.line}`, borderRadius:16, padding:40, width:360 }}>
        <div style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:34, marginBottom:4 }}>Day Wheel</div>
        <div style={{ fontSize:12, color:C2.muted, marginBottom:28 }}>A 24-hour map of how the day moves.</div>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required
            style={{ fontSize:14, padding:"10px 12px", border:`1px solid ${C2.line}`, borderRadius:8, outline:"none", fontFamily:"Inter", background:C2.bg }} />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required
            style={{ fontSize:14, padding:"10px 12px", border:`1px solid ${C2.line}`, borderRadius:8, outline:"none", fontFamily:"Inter", background:C2.bg }} />
          {error && <div style={{ fontSize:12, color:"#a04040", background:"#fdf4f4", border:"1px solid #f0d0d0", borderRadius:6, padding:"8px 10px" }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ background:C2.ink, color:C2.white, border:"none", borderRadius:8, padding:"11px 0", fontSize:14, cursor:loading?"wait":"pointer", fontFamily:"Inter", fontWeight:500, opacity:loading?0.7:1 }}>
            {loading ? "Please wait..." : mode==="login" ? "Log in" : "Create account"}
          </button>
        </form>
        <div style={{ marginTop:18, textAlign:"center", fontSize:12, color:C2.muted, display:"flex", flexDirection:"column", gap:8 }}>
          {mode === "login" ? (
            <>
              <span>No account? <button onClick={()=>{setMode("signup");setError(null);}} style={{ background:"none", border:"none", color:C2.ink, cursor:"pointer", fontSize:12, fontFamily:"Inter", textDecoration:"underline" }}>Sign up</button></span>
              <button onClick={()=>{ setShowForgot(true); setForgotEmail(email); }} style={{ background:"none", border:"none", color:C2.muted, cursor:"pointer", fontSize:12, fontFamily:"Inter", textDecoration:"underline" }}>
                Forgot password?
              </button>
            </>
          ) : (
            <span>Have an account? <button onClick={()=>{setMode("login");setError(null);}} style={{ background:"none", border:"none", color:C2.ink, cursor:"pointer", fontSize:12, fontFamily:"Inter", textDecoration:"underline" }}>Log in</button></span>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingScreen(){
  return(
    <div style={{minHeight:"100vh",background:C2.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
      <div style={{fontStyle:"italic",fontSize:32,color:C2.ink,marginBottom:12}}>Day Wheel</div>
      <div style={{fontSize:13,color:C2.muted}}>Loading...</div>
    </div>
  );
}

function NavBar({ onSignOut }) {
  const location = useLocation();
  const isWheel = location.pathname === "/";
  const isFocus = location.pathname === "/focus";
  return (
    <div style={{
      position:"fixed", top:0, left:0, right:0, zIndex:100,
      padding:"10px 16px", background:"rgba(251,249,244,0.92)", backdropFilter:"blur(6px)",
      borderBottom:`1px solid ${C2.line}`,
    }}>
      <div style={{ width:"100%", maxWidth:990, margin:"0 auto", display:"flex", justifyContent:"flex-end", alignItems:"center", gap:8 }}>
        <Link to="/" style={{
          textDecoration:"none", fontFamily:"Inter,system-ui,sans-serif", fontSize:12, fontWeight:600,
          padding:"6px 16px", borderRadius:999,
          background: isWheel ? C2.ink : "transparent",
          color: isWheel ? C2.white : C2.muted,
          border:`1px solid ${isWheel ? C2.ink : C2.line}`,
        }}>
          ◐ Day Wheel
        </Link>
        <Link to="/focus" style={{
          textDecoration:"none", fontFamily:"Inter,system-ui,sans-serif", fontSize:12, fontWeight:600,
          padding:"6px 16px", borderRadius:999,
          background: isFocus ? C2.ink : "transparent",
          color: isFocus ? C2.white : C2.muted,
          border:`1px solid ${isFocus ? C2.ink : C2.line}`,
        }}>
          ◈ Focus
        </Link>
        <button onClick={onSignOut} style={{
          background:"transparent", border:`1px solid ${C2.line}`, color:C2.muted,
          padding:"6px 12px", borderRadius:999, fontSize:11, cursor:"pointer", fontFamily:"Inter,system-ui,sans-serif",
        }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const isResetRef = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setIsReset(true);
      isResetRef.current = true;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        isResetRef.current = true;
        setIsReset(true);
        setUser(session?.user ?? null);
      } else if (event === "SIGNED_IN" && isResetRef.current) {
        setUser(session?.user ?? null);
      } else {
        isResetRef.current = false;
        setIsReset(false);
        setUser(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  if (isReset) return (
    <ResetPasswordScreen onDone={() => {
      supabase.auth.signOut();
      isResetRef.current = false;
      setIsReset(false);
      setUser(null);
    }} />
  );

  if (!user) return <AuthScreen onAuth={setUser} />;

  const onSignOut = () => supabase.auth.signOut();

  return (
    <BrowserRouter>
      <NavBar onSignOut={onSignOut} />
      <div style={{ paddingTop:52 }}>
        <Routes>
          <Route path="/" element={<DayWheelWrapper userId={user.id} onSignOut={onSignOut} />} />
          <Route path="/focus" element={<Focus userId={user.id} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}