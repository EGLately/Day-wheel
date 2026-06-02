import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";

function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

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

  const C2 = { bg:"#f5f1ea", ink:"#181614", muted:"#8b8378", line:"#d9d2c2", white:"#fbf9f4" };

  if (done) return (
    <div style={{ minHeight:"100vh", background:C2.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ background:C2.white, border:`1px solid ${C2.line}`, borderRadius:16, padding:40, width:360, textAlign:"center" }}>
        <div style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:28, marginBottom:12 }}>Check your email</div>
        <div style={{ fontSize:14, color:C2.muted, lineHeight:1.6 }}>We sent a confirmation link to <strong style={{ color:C2.ink }}>{email}</strong>. Click it to activate your account, then come back and log in.</div>
        <button onClick={() => { setMode("login"); setDone(false); }} style={{ marginTop:24, background:C2.ink, color:C2.white, border:"none", borderRadius:8, padding:"10px 24px", fontSize:13, cursor:"pointer", fontFamily:"Inter" }}>Back to login</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C2.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ background:C2.white, border:`1px solid ${C2.line}`, borderRadius:16, padding:40, width:360 }}>
        <div style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:34, marginBottom:4 }}>Day Wheel</div>
        <div style={{ fontSize:12, color:C2.muted, marginBottom:28 }}>A 24-hour map of how the day moves.</div>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required style={{ fontSize:14, padding:"10px 12px", border:`1px solid ${C2.line}`, borderRadius:8, outline:"none", fontFamily:"Inter", background:C2.bg }} />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required style={{ fontSize:14, padding:"10px 12px", border:`1px solid ${C2.line}`, borderRadius:8, outline:"none", fontFamily:"Inter", background:C2.bg }} />
          {error && <div style={{ fontSize:12, color:"#a04040", background:"#fdf4f4", border:"1px solid #f0d0d0", borderRadius:6, padding:"8px 10px" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ background:C2.ink, color:C2.white, border:"none", borderRadius:8, padding:"11px 0", fontSize:14, cursor:loading?"wait":"pointer", fontFamily:"Inter", fontWeight:500, opacity:loading?0.7:1 }}>
            {loading ? "Please wait..." : mode==="login" ? "Log in" : "Create account"}
          </button>
        </form>
        <div style={{ marginTop:18, textAlign:"center", fontSize:12, color:C2.muted }}>
          {mode==="login"
            ? <span>No account? <button onClick={()=>{setMode("signup");setError(null);}} style={{ background:"none", border:"none", color:C2.ink, cursor:"pointer", fontSize:12, fontFamily:"Inter", textDecoration:"underline" }}>Sign up</button></span>
            : <span>Have an account? <button onClick={()=>{setMode("login");setError(null);}} style={{ background:"none", border:"none", color:C2.ink, cursor:"pointer", fontSize:12, fontFamily:"Inter", textDecoration:"underline" }}>Log in</button></span>}
        </div>
      </div>
    </div>
  );
}

async function loadUserData(userId) {
  const { data, error } = await supabase.from("user_data").select("*").eq("user_id", userId).single();
  if (error && error.code !== "PGRST116") console.error("Load error:", error);
  return data;
}
async function saveUserData(userId, payload) {
  const { error } = await supabase.from("user_data").upsert({ user_id:userId, ...payload, updated_at:new Date().toISOString() }, { onConflict:"user_id" });
  if (error) console.error("Save error:", error);
}

const DEFAULT_CATS = {
  sleep:    { label:"Sleep",      color:"#7c6fa0" },
  morning:  { label:"Morning",    color:"#d4845a" },
  focus:    { label:"Focus work", color:"#4a6fa5" },
  misc:     { label:"Misc work",  color:"#7a8fa8" },
  personal: { label:"Personal",   color:"#5a9e7a" },
  meal:     { label:"Meal",       color:"#c9a84c" },
  family:   { label:"Family",     color:"#c97a6a" },
  margin:   { label:"Margin",     color:"#b8b070" },
  winddown: { label:"Wind down",  color:"#9a7aaa" },
};
const PALETTE = ["#7c6fa0","#d4845a","#4a6fa5","#7a8fa8","#5a9e7a","#c9a84c","#c97a6a","#b8b070","#9a7aaa","#6a9ea0","#a06a7c","#7a9a5a","#c0784a","#5a7ab8","#b85a6a","#8a7a5a","#4a8a7a","#a08a4a"];
const WD = [];
const WE = [
  { id:"b2", label:"Morning",          cat:"morning",  duration:90,  startMin:540  },
  { id:"b4", label:"Personal project", cat:"personal", duration:120, startMin:690  },
  { id:"b5", label:"Errands",          cat:"misc",     duration:60,  startMin:810  },
  { id:"b6", label:"Margin",           cat:"margin",   duration:60,  startMin:870  },
  { id:"b7", label:"Family time",      cat:"family",   duration:120, startMin:930  },
  { id:"b8", label:"Cook & eat",       cat:"meal",     duration:60,  startMin:1050 },
  { id:"b9", label:"Wind down",        cat:"winddown", duration:90,  startMin:1110 },
];
const DEFAULT_TEMPLATES = {
  weekday:     { id:"weekday",     name:"Weekday",     builtIn:true,  schedule:WD, goals:{sleep:480}, wakeTime:360, wakeRoutine:30, bedRoutine:30, meals:{breakfast:true,lunch:true,dinner:true} },
  weekend:     { id:"weekend",     name:"Weekend",     builtIn:true,  schedule:WE, goals:{sleep:480}, wakeTime:540, wakeRoutine:30, bedRoutine:30, meals:{breakfast:true,lunch:true,dinner:true} },
  alternative: { id:"alternative", name:"Alternative", builtIn:false, schedule:WD.map(s=>({...s})), goals:{sleep:480}, wakeTime:360, wakeRoutine:30, bedRoutine:30, meals:{breakfast:true,lunch:true,dinner:true} },
};
const MIN_DUR=15, MAX_DUR=480, TOTAL=1440;
const nid = () => `s${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
let _cid=100; const ncid = () => `c${++_cid}`;
function autoId(dow) { return (dow===0||dow===6)?"weekend":"weekday"; }
function todayS() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

const HDEG=15;
function h2a(h) { return (h-6)*HDEG; }
function min2deg(m) { return h2a(m/60); }
function deg2clockMin(deg) { return (((deg/15)+6)*60+1440)%1440; }
function svgEventToClockMin(e,svgEl) {
  const pt=svgEl.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY;
  const svgP=pt.matrixTransform(svgEl.getScreenCTM().inverse());
  const dx=svgP.x-CX, dy=svgP.y-CY;
  let deg=Math.atan2(dy,dx)*180/Math.PI+90; if(deg<0) deg+=360;
  return Math.round(deg2clockMin(deg)/15)*15;
}
function pol(cx,cy,r,deg) { const a=(deg-90)*Math.PI/180; return {x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}; }
function wdgSweep(cx,cy,rO,rI,a0,sweep,gap=0) {
  const s=sweep-gap*2,start=a0+gap,end=a0+gap+s;
  const p1=pol(cx,cy,rO,start),p2=pol(cx,cy,rO,end),p3=pol(cx,cy,rI,end),p4=pol(cx,cy,rI,start);
  const lg=s>180?1:0;
  return `M${p1.x} ${p1.y}A${rO} ${rO} 0 ${lg} 1 ${p2.x} ${p2.y}L${p3.x} ${p3.y}A${rI} ${rI} 0 ${lg} 0 ${p4.x} ${p4.y}Z`;
}
function wdg(cx,cy,rO,rI,a0,a1) {
  const p1=pol(cx,cy,rO,a0),p2=pol(cx,cy,rO,a1),p3=pol(cx,cy,rI,a1),p4=pol(cx,cy,rI,a0);
  const lg=(a1-a0)>180?1:0;
  return `M${p1.x} ${p1.y}A${rO} ${rO} 0 ${lg} 1 ${p2.x} ${p2.y}L${p3.x} ${p3.y}A${rI} ${rI} 0 ${lg} 0 ${p4.x} ${p4.y}Z`;
}
function fmtH(h,compact=false) {
  const w=((h%24)+24)%24,hi=Math.floor(w),m=Math.round((w-hi)*60);
  let d=hi%12; if(!d) d=12; const p=hi<12?"am":"pm";
  if(m===0) return `${d}${p}`; return `${d}:${String(m).padStart(2,"0")}${p}`;
}
function fmtM(m) { return fmtH(m/60); }
function fmtD(min) { const h=Math.floor(min/60),m=min%60; if(!h) return `${m}m`; if(!m) return `${h}h`; return `${h}h ${m}m`; }
function timeStrToMin(s) { const [h,m]=(s||"00:00").split(":").map(Number); return ((h||0)*60+(m||0)); }
function minToTimeStr(m) { const h=Math.floor(((m%1440)+1440)%1440/60),mn=Math.round(((m%1440)+1440)%1440%60); return `${String(h).padStart(2,"0")}:${String(mn).padStart(2,"0")}`; }

const C={bg:"#f5f1ea",bg2:"#ebe5d9",ink:"#181614",ink2:"#4a443c",muted:"#8b8378",line:"#d9d2c2",line2:"#c4bba8",white:"#fbf9f4"};
const mono={fontFamily:"'JetBrains Mono',ui-monospace,monospace"};
const serif={fontFamily:"'Georgia','Times New Roman',serif"};
const serifI={fontFamily:"'Georgia','Times New Roman',serif",fontStyle:"italic"};
const VB=800,CX=400,CY=400,RO=330,RI=92,RH=362;

function withRanges(schedule,wakeTime,sleepGoalMins,wakeRoutineMins=30,bedRoutineMins=30,routineOverrides={}) {
  const sleepDur=(sleepGoalMins&&sleepGoalMins>0)?sleepGoalMins:480;
  const sleepStart=((wakeTime-sleepDur)+1440)%1440;
  const sleepSlice={id:"__sleep__",label:"Sleep",cat:"sleep",isSleep:true,duration:sleepDur,startMin:sleepStart,endMin:wakeTime,_sweep:(sleepDur/1440)*360,_a0:min2deg(sleepStart)};
  const waking=schedule.filter(x=>!x.isSleep).map(x=>{const startMin=x.startMin!=null?x.startMin:wakeTime;const endMin=(startMin+x.duration)%1440;return{...x,startMin,endMin,_sweep:(x.duration/1440)*360,_a0:min2deg(startMin)};});
  const wakeR=wakeRoutineMins>0?{id:"__wake_routine__",label:routineOverrides.__wake_routine__?.label??"Wake-up routine",cat:routineOverrides.__wake_routine__?.cat??"transition",isRoutine:true,duration:wakeRoutineMins,startMin:wakeTime,endMin:(wakeTime+wakeRoutineMins)%1440,_sweep:(wakeRoutineMins/1440)*360,_a0:min2deg(wakeTime)}:null;
  const bedR=bedRoutineMins>0?{id:"__bed_routine__",label:routineOverrides.__bed_routine__?.label??"Bedtime routine",cat:routineOverrides.__bed_routine__?.cat??"transition",isRoutine:true,duration:bedRoutineMins,startMin:((sleepStart-bedRoutineMins)+1440)%1440,endMin:sleepStart,_sweep:(bedRoutineMins/1440)*360,_a0:min2deg(((sleepStart-bedRoutineMins)+1440)%1440)}:null;
  return[sleepSlice,...[wakeR,bedR].filter(Boolean),...waking];
}

function wouldOverlap(schedule,wakeTime,sleepGoalMins,id,newStart,dur,wakeRoutineMins=30,bedRoutineMins=30,meals={}) {
  const sleepDur=(sleepGoalMins&&sleepGoalMins>0)?sleepGoalMins:480;
  const sleepStart=((wakeTime-sleepDur)+1440)%1440;
  function norm(m){const mm=((m%1440)+1440)%1440;return mm>=wakeTime?mm:mm+1440;}
  function overlaps(aS,aD,bS,bD){return aS<bS+bD&&aS+aD>bS;}
  const nNew=norm(newStart);
  if(overlaps(nNew,dur,norm(sleepStart),sleepDur))return true;
  if(wakeRoutineMins>0&&overlaps(nNew,dur,norm(wakeTime),wakeRoutineMins))return true;
  if(bedRoutineMins>0){const bs=((sleepStart-bedRoutineMins)+1440)%1440;if(overlaps(nNew,dur,norm(bs),bedRoutineMins))return true;}
  for(const x of schedule){if(x.isSleep||x.isRoutine||x.id===id)continue;if(x.mealKey&&!meals[x.mealKey])continue;const xStart=x.startMin!=null?x.startMin:wakeTime;if(overlaps(nNew,dur,norm(xStart),x.duration))return true;}
  return false;
}

function useNow(){const[now,setNow]=useState(()=>new Date());useEffect(()=>{const id=setInterval(()=>setNow(new Date()),15000);return()=>clearInterval(id);},[]);return now;}

function migrateTemplates(raw) {
  const patched={};
  for(const[k,v]of Object.entries(raw)){
    const wt=v.wakeTime??360;let acc=wt;
    const ms=(v.schedule||[]).filter(x=>!x.isSleep).map(x=>{if(x.startMin!=null){acc=x.startMin+x.duration;return x;}const s={...x,startMin:acc%1440};acc+=x.duration;return s;});
    patched[k]={goals:{sleep:480},wakeTime:360,wakeRoutine:30,bedRoutine:30,meals:{breakfast:true,lunch:true,dinner:true},...v,goals:{sleep:480,...(v.goals||{})},meals:{breakfast:true,lunch:true,dinner:true,...(v.meals||{})},schedule:ms};
  }
  for(const[k,v]of Object.entries(DEFAULT_TEMPLATES)){if(!patched[k])patched[k]={...v};}
  return patched;
}

function LoadingScreen(){
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
      <div style={{fontStyle:"italic",fontSize:32,color:C.ink,marginBottom:12}}>Day Wheel</div>
      <div style={{fontSize:13,color:C.muted}}>Loading your day...</div>
    </div>
  );
}

export default function AppShell() {
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setUser(session?.user??null);setLoading(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{setUser(session?.user??null);});
    return()=>subscription.unsubscribe();
  },[]);
  if(loading)return<LoadingScreen/>;
  if(!user)return<AuthScreen onAuth={setUser}/>;
  return<App userId={user.id} onSignOut={()=>supabase.auth.signOut()}/>;
}

function App({userId,onSignOut}){
  const now=useNow();
  const[dataLoading,setDataLoading]=useState(true);
  const[cats,setCats]=useState(DEFAULT_CATS);
  const[templates,setTemplates]=useState(DEFAULT_TEMPLATES);
  const[overrideId,setOverrideId]=useState(null);
  const[overrideDate,setOverrideDate]=useState(null);
  const[focusTasks,setFocusTasks]=useState([]);
  const[bigRockId,setBigRockId]=useState(null);
  const[checklist,setChecklist]=useState({});
  const[tomorrowIds,setTomorrowIds]=useState({});
  const[selectedId,setSelectedId]=useState(null);
  const[hoveredId,setHoveredId]=useState(null);
  const[renamingId,setRenamingId]=useState(null);
  const[renameVal,setRenameVal]=useState("");
  const[catModal,setCatModal]=useState(false);
  const[showList,setShowList]=useState(false);
  const[focusMode,setFocusMode]=useState(false);
  const[rightPanelWidth,setRightPanelWidth]=useState(310);
  const[showFocusTasks,setShowFocusTasks]=useState(false);
  const[saveMsg,setSaveMsg]=useState(null);
  const[workingCopy,setWorkingCopy]=useState(null);

  useEffect(()=>{
    async function load(){
      const row=await loadUserData(userId);
      if(row){
        if(row.templates){
          const m=migrateTemplates(row.templates);
          setTemplates(m);
          const oid=(row.override_id&&row.override_date===todayS())?row.override_id:null;
          const aid=oid??autoId(new Date().getDay());
          const tpl=m[aid]??m[autoId(new Date().getDay())]??Object.values(m)[0];
          setWorkingCopy({...tpl});
          if(oid){setOverrideId(oid);setOverrideDate(row.override_date);}
        }
        if(row.categories)setCats(row.categories);
        if(row.focus_tasks){setFocusTasks(row.focus_tasks.tasks??[]);setBigRockId(row.focus_tasks.bigRockId??null);}
        if(row.checklist&&row.checklist.date===todayS())setChecklist(row.checklist.checked??{});
        if(row.tomorrow_ids&&row.tomorrow_ids.date===todayS())setTomorrowIds(row.tomorrow_ids.ids??{});
      }
      setDataLoading(false);
    }
    load();
  },[userId]);

  // All derived values needed by hooks
  const auto=autoId(now.getDay());
  const activeId=(overrideId&&overrideDate===todayS())?overrideId:auto;
  const _wc=workingCopy??{};
  const baseTpl=templates[activeId]??templates[auto]??Object.values(templates)[0];
  const schedule=_wc.schedule??[];
  const goals=_wc.goals??{};
  const wakeTime=_wc.wakeTime??360;
  const sleepGoal=(goals.sleep&&goals.sleep>0)?goals.sleep:480;
  const wakeRoutine=_wc.wakeRoutine??30;
  const bedRoutine=_wc.bedRoutine??30;
  const meals=_wc.meals??{breakfast:true,lunch:true,dinner:true};
  const wakeRoutineSubs=_wc.wakeRoutineSubs??[];
  const bedRoutineSubs=_wc.bedRoutineSubs??[];
  const isOverride=activeId!==auto;
  const liveHour=now.getHours()+now.getMinutes()/60+now.getSeconds()/3600;
  const routineOverrides=_wc.routineOverrides??{};

  // All useMemo hooks before early return
  const isDirty=useMemo(()=>JSON.stringify(workingCopy)!==JSON.stringify(baseTpl),[workingCopy,baseTpl]);
  const visibleSchedule=useMemo(()=>schedule.filter(x=>!x.mealKey||meals[x.mealKey]),[schedule,meals]);
  const ranged=useMemo(()=>withRanges(visibleSchedule,wakeTime,sleepGoal,wakeRoutine,bedRoutine,routineOverrides),[visibleSchedule,wakeTime,sleepGoal,wakeRoutine,bedRoutine,routineOverrides]);
  const current=useMemo(()=>{
    const lm=now.getHours()*60+now.getMinutes();
    const exact=ranged.find(sl=>{
      if(sl.isSleep){if(sl.startMin>sl.endMin)return lm>=sl.startMin||lm<sl.endMin;return lm>=sl.startMin&&lm<sl.endMin;}
      return lm>=sl.startMin&&lm<sl.endMin;
    });
    if(exact)return exact;
    const sleep=ranged.find(s=>s.isSleep);
    if(sleep){const ins=sleep.startMin>sleep.endMin?lm>=sleep.startMin||lm<sleep.endMin:lm>=sleep.startMin&&lm<sleep.endMin;if(ins)return sleep;}
    return null;
  },[ranged,now]);
  const totals=useMemo(()=>{const t={};for(const k of Object.keys(cats))t[k]=0;ranged.forEach(s=>{t[s.cat]=(t[s.cat]||0)+s.duration;});return t;},[ranged,cats]);
  const selected=ranged.find(s=>s.id===selectedId&&!s.isSleep)??null;
  const selIdx=selected?ranged.findIndex(s=>s.id===selectedId):-1;
  const tplList=Object.values(templates);
  const activeTpl=_wc;

  // All useEffect and useRef hooks before early return
  const prevActiveId=useRef(activeId);
  useEffect(()=>{
    if(!dataLoading&&!workingCopy){
      const tpl=templates[activeId]??templates[auto]??Object.values(templates)[0];
      setWorkingCopy({...tpl});
    }
  },[dataLoading]);
  useEffect(()=>{
    if(workingCopy&&activeId!==prevActiveId.current){
      prevActiveId.current=activeId;
      setWorkingCopy({...(templates[activeId]??templates[auto]??Object.values(templates)[0])});
      setSelectedId(null);
    }
  },[activeId,templates]);

  const saveTimer=useRef(null);
  function scheduleSave(payload){if(saveTimer.current)clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>saveUserData(userId,payload),1200);}
  useEffect(()=>{if(!dataLoading)scheduleSave({templates,override_id:overrideId,override_date:overrideDate});},[templates,overrideId,overrideDate]);
  useEffect(()=>{if(!dataLoading)scheduleSave({categories:cats});},[cats]);
  useEffect(()=>{if(!dataLoading)scheduleSave({focus_tasks:{tasks:focusTasks,bigRockId}});},[focusTasks,bigRockId]);
  useEffect(()=>{if(!dataLoading)scheduleSave({checklist:{date:todayS(),checked:checklist}});},[checklist]);
  useEffect(()=>{if(!dataLoading)scheduleSave({tomorrow_ids:{date:todayS(),ids:tomorrowIds}});},[tomorrowIds]);

  // Early return AFTER all hooks
  if(dataLoading||!workingCopy)return<LoadingScreen/>;

  function selectByOffset(o){if(selIdx<0)return;setSelectedId(ranged[((selIdx+o)%ranged.length+ranged.length)%ranged.length].id);}
  function updWC(fn){setWorkingCopy(wc=>fn(wc));}
  function upd(fn){updWC(wc=>({...wc,schedule:fn(wc.schedule)}));}
  function addCat(){const id=ncid();setCats(c=>({...c,[id]:{label:"New category",color:PALETTE[Math.floor(Math.random()*PALETTE.length)]}}));}
  function updateCat(id,patch){setCats(c=>({...c,[id]:{...c[id],...patch}}));}
  function deleteCat(id){const inUse=Object.values(templates).some(t=>t.schedule.some(s=>s.cat===id));if(inUse){alert("Can't delete - category is in use.");return;}setCats(c=>{const n={...c};delete n[id];return n;});}
  function setGoal(catId,mins){updWC(wc=>({...wc,goals:{...(wc.goals||{}),[catId]:mins}}));}
  function setWakeTime(mins){updWC(wc=>({...wc,wakeTime:mins}));}
  function setWakeRoutine(mins){updWC(wc=>({...wc,wakeRoutine:mins}));}
  function setBedRoutine(mins){updWC(wc=>({...wc,bedRoutine:mins}));}
  function updateRoutineSubs(routineId,subs){const key=routineId==="__wake_routine__"?"wakeRoutineSubs":"bedRoutineSubs";const durKey=routineId==="__wake_routine__"?"wakeRoutine":"bedRoutine";const total=subs.reduce((s,x)=>s+x.duration,0);updWC(wc=>({...wc,[key]:subs,[durKey]:Math.max(MIN_DUR,total)}));}
  function updateSliceSubs(sliceId,subs){const total=subs.reduce((s,x)=>s+x.duration,0);upd(s=>s.map(x=>x.id===sliceId?{...x,subs,duration:Math.max(MIN_DUR,total)}:x));}
  function promoteToRoutine(sliceId){upd(s=>s.map(x=>x.id!==sliceId?x:{...x,isUserRoutine:true,subs:[{id:`sub_${Date.now()}_init`,label:x.label,duration:x.duration}]}));}
  function demoteToSingle(sliceId){upd(s=>s.map(x=>{if(x.id!==sliceId)return x;const{isUserRoutine,subs,...rest}=x;return rest;}));}
  function setMeal(key,enabled){updWC(wc=>({...wc,meals:{...(wc.meals||{}),[key]:enabled},schedule:enabled?ensureMealSlice(wc.schedule,key,wc.wakeTime??360,wc.wakeRoutine??30):wc.schedule}));}
  function ensureMealSlice(sch,key,wt,wr){if(sch.find(x=>x.mealKey===key))return sch;const defs={breakfast:{label:"Breakfast",duration:30,startMin:(wt+wr)%1440},lunch:{label:"Lunch",duration:60,startMin:720},dinner:{label:"Dinner",duration:60,startMin:1080}};const d=defs[key];return[...sch,{id:nid(),label:d.label,cat:"meal",duration:d.duration,startMin:d.startMin,mealKey:key}];}
  function setActive(id){if(!templates[id])return;if(id===autoId(now.getDay())){setOverrideId(null);setOverrideDate(null);}else{setOverrideId(id);setOverrideDate(todayS());}setWorkingCopy({...templates[id]});setSelectedId(null);}
  function createTpl(){const id=`custom_${Date.now()}`;const newTpl={...workingCopy,id,name:"New Template",builtIn:false,schedule:workingCopy.schedule.map(s=>({...s,id:nid()}))};setTemplates(t=>({...t,[id]:newTpl}));setWorkingCopy(newTpl);setOverrideId(id);setOverrideDate(todayS());setSelectedId(null);setRenamingId(id);setRenameVal("New Template");}
  function renameTpl(id,name){if(!name.trim())return;setTemplates(t=>({...t,[id]:{...t[id],name:name.trim()}}));if(id===activeId)setWorkingCopy(wc=>({...wc,name:name.trim()}));}
  function deleteTpl(id){if(templates[id]?.builtIn)return;setTemplates(t=>{const n={...t};delete n[id];return n;});setOverrideId(null);setOverrideDate(null);setSelectedId(null);}
  function updateField(id,patch){if(id==="__wake_routine__"||id==="__bed_routine__"){updWC(wc=>({...wc,routineOverrides:{...(wc.routineOverrides||{}),[id]:{...(wc.routineOverrides?.[id]||{}),...patch}}}));return;}upd(s=>s.map(x=>x.id===id?{...x,...patch}:x));}
  function changeDur(id,newDur){upd(s=>{const i=s.findIndex(x=>x.id===id);if(i<0)return s;const cur=s[i];if(newDur<MIN_DUR)return s;if(wouldOverlap(s,wakeTime,sleepGoal,id,cur.startMin??wakeTime,newDur,wakeRoutine,bedRoutine,meals))return s;return s.map((x,j)=>j===i?{...x,duration:newDur}:x);});}
  function changeStart(id,newStartMin){upd(s=>{const i=s.findIndex(x=>x.id===id);if(i<0)return s;const cur=s[i];const snapped=Math.round(newStartMin/15)*15;if(wouldOverlap(s,wakeTime,sleepGoal,id,snapped,cur.duration,wakeRoutine,bedRoutine,meals))return s;return s.map((x,j)=>j===i?{...x,startMin:snapped}:x);});}
  function deleteAct(id){upd(s=>{if(s[s.findIndex(x=>x.id===id)]?.isSleep)return s;const arr=s.filter(x=>x.id!==id);setSelectedId(arr[0]?.id??null);return arr;});}
  function insertAfter(id){upd(s=>{const i=s.findIndex(x=>x.id===id);if(i<0)return s;const cur=s[i];if(cur.isSleep)return s;const curStart=cur.startMin??wakeTime;const newStart=(curStart+cur.duration)%1440;const newDur=60;const newId=nid();if(!wouldOverlap(s,wakeTime,sleepGoal,null,newStart,newDur,wakeRoutine,bedRoutine,meals)){setSelectedId(newId);return[...s,{id:newId,label:"New activity",cat:cur.cat,duration:newDur,startMin:newStart}];}const sd2=(sleepGoal&&sleepGoal>0)?sleepGoal:480;for(let t=wakeTime;t<wakeTime+(1440-sd2)-newDur;t+=15){const ts=t%1440;if(!wouldOverlap(s,wakeTime,sleepGoal,null,ts,newDur,wakeRoutine,bedRoutine,meals)){setSelectedId(newId);return[...s,{id:newId,label:"New activity",cat:cur.cat,duration:newDur,startMin:ts}];}}return s;});}
  function addAt(clockMin){upd(s=>{const dd=60;const snapped=Math.round(clockMin/15)*15;if(wouldOverlap(s,wakeTime,sleepGoal,null,snapped,dd,wakeRoutine,bedRoutine,meals)){for(let dur=dd;dur>=MIN_DUR;dur-=15){if(!wouldOverlap(s,wakeTime,sleepGoal,null,snapped,dur,wakeRoutine,bedRoutine,meals)){const newId=nid();const lc=s.filter(x=>!x.isSleep).slice(-1)[0]?.cat??"misc";setSelectedId(newId);return[...s,{id:newId,label:"New activity",cat:lc,duration:dur,startMin:snapped}];}}return s;}const newId=nid();const lc=s.filter(x=>!x.isSleep).slice(-1)[0]?.cat??"misc";setSelectedId(newId);return[...s,{id:newId,label:"New activity",cat:lc,duration:dd,startMin:snapped}];});}
  function resetTpl(){const defs={weekday:WD,weekend:WE};if(!defs[baseTpl.id])return;const reset={...baseTpl,schedule:defs[baseTpl.id],goals:{weekday:{sleep:480},weekend:{sleep:480}}[baseTpl.id]??{},wakeTime:{weekday:360,weekend:540}[baseTpl.id]??360};setWorkingCopy(reset);setTemplates(t=>({...t,[baseTpl.id]:reset}));setSelectedId(null);}
  function clearAllActivities(){updWC(wc=>({...wc,schedule:[]}));setSelectedId(null);}
  async function commitToTemplate(){const next={...templates,[baseTpl.id]:{...workingCopy,id:baseTpl.id}};setTemplates(next);await saveUserData(userId,{templates:next,override_id:overrideId,override_date:overrideDate});setSaveMsg("Saved");setTimeout(()=>setSaveMsg(null),2500);}
  function discardChanges(){setWorkingCopy({...baseTpl});setSelectedId(null);}
  async function saveAsNew(name){const id=`custom_${Date.now()}`;const newTpl={...workingCopy,id,name:name||"New Template",builtIn:false,schedule:workingCopy.schedule.map(s=>({...s,id:nid()}))};const next={...templates,[id]:newTpl};setTemplates(next);setWorkingCopy(newTpl);setOverrideId(id);setOverrideDate(todayS());await saveUserData(userId,{templates:next,override_id:id,override_date:todayS()});setSaveMsg("Saved as new template");setTimeout(()=>setSaveMsg(null),2500);}
  function saveForToday(){const id=`today_${todayS()}`;setTemplates(t=>({...t,[id]:{...workingCopy,id,name:`${baseTpl.name} (today)`,builtIn:false}}));setOverrideId(id);setOverrideDate(todayS());}
  function advanceToTomorrow(sliceId){setChecklist(prev=>{const next={...prev};Object.keys(next).forEach(k=>{if(k.startsWith(`${sliceId}_`))delete next[k];});return next;});setTomorrowIds(prev=>({...prev,[sliceId]:true}));}
  function undoAdvance(sliceId){setTomorrowIds(prev=>{const next={...prev};delete next[sliceId];return next;});}
  function advanceAllPast(){const lm=now.getHours()*60+now.getMinutes();const wt=ranged.find(s=>s.isSleep)?.endMin??360;const toAbs=m=>{const mm=((m%1440)+1440)%1440;return mm>=wt?mm:mm+1440;};const la=toAbs(lm);const ps=ranged.filter(sl=>!sl.isSleep&&!(tomorrowIds??{})[sl.id]&&!(current&&sl.id===current.id)&&toAbs(sl.endMin)<=la);if(!ps.length)return;setChecklist(prev=>{const next={...prev};ps.forEach(sl=>{Object.keys(next).forEach(k=>{if(k.startsWith(`${sl.id}_`))delete next[k];});});return next;});setTomorrowIds(prev=>{const next={...prev};ps.forEach(sl=>{next[sl.id]=true;});return next;});}
  function copySliceTo(slice,targetId){if(!templates[targetId])return;const ns={...slice,id:nid()};delete ns._sweep;delete ns._a0;setTemplates(t=>({...t,[targetId]:{...t[targetId],schedule:[...(t[targetId].schedule??[]),ns]}}));}

  return (
    <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Sacramento&family=Montserrat:wght@900&display=swap" rel="stylesheet" />
    <div style={{ minHeight:"100vh", background:`radial-gradient(ellipse at 20% -10%,#faf7f0 0%,transparent 55%),radial-gradient(ellipse at 90% 110%,#f0ebe0 0%,transparent 50%),${C.bg}`, color:C.ink, fontFamily:"Inter,system-ui,sans-serif", WebkitFontSmoothing:"antialiased" }}>
      <div style={{background:"red",color:"white",fontSize:24,padding:10,textAlign:"center"}}>V4 - {new Date().toLocaleTimeString()}</div>
      <style>{`
  html,body{margin:0;padding:0;background:#f5f1ea;}
  #root{min-height:100vh;background:#f5f1ea;}
  @media(max-width:1100px){ .dw-main-grid{grid-template-columns:minmax(210px,250px) minmax(0,1fr) !important;} .dw-right-panel{grid-column:1/-1;} }
  @media(max-width:750px){ .dw-main-grid{grid-template-columns:1fr !important;padding:16px 16px 80px !important;} .dw-right-panel{grid-column:1;} }
`}</style>
      <div style={{ padding:"24px 28px 64px", display:"grid", gridTemplateColumns:`minmax(210px,250px) minmax(0,2fr) minmax(300px,1fr)`, gap:20, alignItems:"start", }} className="dw-main-grid">

        {!focusMode && <aside style={{display:"flex",flexDirection:"column",gap:14}}>
          <header>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <div style={{...serifI,fontSize:34,lineHeight:1,color:C.ink}}>Day Wheel</div>
              <button onClick={onSignOut} style={{background:"transparent",border:`1px solid ${C.line2}`,color:C.muted,padding:"3px 9px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"Inter"}}>Sign out</button>
            </div>
            <div style={{marginTop:4,fontSize:11.5,color:C.muted,letterSpacing:.3}}>A 24-hour map of how the day moves.</div>
          </header>
          <NowCard now={now} liveHour={liveHour} current={current} ranged={ranged} setSelectedId={setSelectedId} cats={cats}/>
          {(()=>{
            const lm=now.getHours()*60+now.getMinutes();
            const wt=ranged.find(s=>s.isSleep)?.endMin??360;
            const norm=m=>{const mm=((m%1440)+1440)%1440;return mm>=wt?mm:mm+1440;};
            const la=norm(lm);
            const hasPast=ranged.some(sl=>!sl.isSleep&&sl.id!==current?.id&&!(tomorrowIds??{})[sl.id]&&norm(sl.endMin)<=la);
            const hasAdv=Object.keys(tomorrowIds??{}).length>0;
            if(!hasPast&&!hasAdv)return null;
            return(<div style={{display:"flex",gap:6}}>
              {hasPast&&<button onClick={advanceAllPast} style={{flex:1,padding:"8px 0",background:"transparent",border:`1px dashed ${C.line2}`,borderRadius:8,fontSize:12,color:C.muted,cursor:"pointer",fontFamily:"Inter"}}>Advance All Past to Tomorrow</button>}
              {hasAdv&&<button onClick={()=>setTomorrowIds({})} style={{flex:1,padding:"8px 0",background:"transparent",border:`1px solid ${C.line2}`,borderRadius:8,fontSize:12,color:C.muted,cursor:"pointer",fontFamily:"Inter"}}>Return All To Today</button>}
            </div>);
          })()}
          <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{...mono,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>Template</div>
              {isOverride&&<button onClick={()=>setActive(auto)} style={{background:"transparent",border:"none",fontSize:10.5,color:C.muted,cursor:"pointer",padding:0,fontFamily:"Inter"}}>auto</button>}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
              {tplList.map(t=>{const isA=t.id===activeId,isR=renamingId===t.id;return(<div key={t.id} style={{display:"flex",alignItems:"center"}}>{isR?<RenameInput value={renameVal} onChange={setRenameVal} onCommit={()=>{renameTpl(t.id,renameVal);setRenamingId(null);}} onCancel={()=>setRenamingId(null)}/>:<button onClick={()=>setActive(t.id)} onDoubleClick={()=>{if(!t.builtIn){setRenamingId(t.id);setRenameVal(t.name);}}} style={{fontSize:12,background:isA?C.ink:"transparent",color:isA?C.white:C.ink2,border:`1px solid ${isA?C.ink:C.line2}`,borderRadius:(!t.builtIn&&isA)?"6px 0 0 6px":"6px",padding:"4px 10px",cursor:"pointer",fontFamily:"Inter"}}>{t.name}</button>}{!t.builtIn&&isA&&!isR&&<button onClick={()=>deleteTpl(t.id)} style={{fontSize:11,background:C.ink,color:C.white,border:`1px solid ${C.ink}`,borderLeft:"none",borderRadius:"0 6px 6px 0",padding:"4px 7px",cursor:"pointer",lineHeight:1,fontFamily:"Inter"}}>x</button>}</div>);})}
              <button onClick={createTpl} style={{fontSize:12,background:"transparent",color:C.muted,border:`1px dashed ${C.line2}`,borderRadius:6,padding:"4px 8px",cursor:"pointer",fontFamily:"Inter"}}>+ New</button>
            </div>
            <div style={{fontSize:11,color:C.muted}}>{isOverride?"Manually selected":"Auto - matches today"}</div>
            <div style={{borderTop:`1px solid ${C.line}`,paddingTop:10,display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{...mono,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>Wake time</div><input type="time" value={minToTimeStr(wakeTime)} onChange={e=>setWakeTime(timeStrToMin(e.target.value))} style={{...mono,fontSize:13,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:7,padding:"4px 8px",outline:"none"}}/></div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{...mono,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>Sleep goal</div><div style={{display:"flex",alignItems:"center",gap:5}}><input type="number" min={1} max={12} step={0.25} value={sleepGoal/60||""} onChange={e=>{const v=parseFloat(e.target.value)||0;setGoal("sleep",Math.round(v*60));}} style={{...mono,fontSize:13,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:7,padding:"4px 8px",outline:"none",width:58,textAlign:"right"}}/><span style={{fontSize:11,color:C.muted}}>h</span></div></div>
              <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>Sleep {fmtM(((wakeTime-sleepGoal)+1440)%1440)} to {fmtM(wakeTime)}</div>
              <div style={{borderTop:`1px solid ${C.line}`,paddingTop:8,display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{...mono,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>Wake-up routine</div><div style={{display:"flex",alignItems:"center",gap:5}}><input type="number" min={0} max={120} step={5} value={wakeRoutine||""} placeholder="0" onChange={e=>setWakeRoutine(parseInt(e.target.value)||0)} style={{...mono,fontSize:13,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:7,padding:"4px 8px",outline:"none",width:58,textAlign:"right"}}/><span style={{fontSize:11,color:C.muted}}>m</span></div></div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{...mono,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>Bedtime routine</div><div style={{display:"flex",alignItems:"center",gap:5}}><input type="number" min={0} max={120} step={5} value={bedRoutine||""} placeholder="0" onChange={e=>setBedRoutine(parseInt(e.target.value)||0)} style={{...mono,fontSize:13,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:7,padding:"4px 8px",outline:"none",width:58,textAlign:"right"}}/><span style={{fontSize:11,color:C.muted}}>m</span></div></div>
              </div>
              <div style={{borderTop:`1px solid ${C.line}`,paddingTop:8,display:"flex",flexDirection:"column",gap:6}}>
                <div style={{...mono,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:2}}>Meals</div>
                {[{key:"breakfast",label:"Breakfast"},{key:"lunch",label:"Lunch"},{key:"dinner",label:"Dinner"}].map(m=>(<div key={m.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{fontSize:12,color:C.ink2}}>{m.label}</div><button onClick={()=>setMeal(m.key,!meals[m.key])} style={{width:36,height:20,borderRadius:999,border:"none",cursor:"pointer",padding:0,flexShrink:0,background:meals[m.key]?C.ink:C.line2,position:"relative",transition:"background 200ms"}}><span style={{position:"absolute",top:2,width:16,height:16,borderRadius:999,background:C.white,transition:"left 200ms",left:meals[m.key]?18:2}}/></button></div>))}
              </div>
            </div>
          </div>
        </aside>}

        <main style={{display:"grid",placeItems:"center",minHeight:focusMode?"100vh":"min(800px,88vh)",position:"relative"}}>
          <button onClick={()=>setFocusMode(v=>!v)} style={{position:"absolute",top:12,right:12,background:"rgba(255,255,255,0.8)",border:`1px solid ${C.line}`,borderRadius:999,padding:"5px 12px",fontSize:11,fontFamily:"Inter",cursor:"pointer",color:C.ink2,zIndex:10}}>{focusMode?"Exit focus":"Focus mode"}</button>
          <Wheel ranged={ranged} selectedId={selectedId} setSelectedId={setSelectedId} hoveredId={hoveredId} setHoveredId={setHoveredId} liveHour={liveHour} current={current} cats={cats} onAddAt={addAt} onChangeStart={changeStart} wakeRoutineSubs={wakeRoutineSubs} bedRoutineSubs={bedRoutineSubs} checklist={checklist} tomorrowIds={tomorrowIds} onShowFocusTasks={()=>setShowFocusTasks(true)} focusMode={focusMode}/>
        </main>

        {!focusMode && <aside className="dw-right-panel" style={{display:"flex",flexDirection:"column",gap:14,position:"relative"}}>
          <div style={{position:"absolute",left:-6,top:0,bottom:0,width:12,cursor:"col-resize",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}} onMouseDown={e=>{e.preventDefault();const sx=e.clientX,sw=rightPanelWidth;function onMove(me){const d=sx-me.clientX;setRightPanelWidth(Math.max(260,Math.min(700,sw+d)));}function onUp(){window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);}window.addEventListener("mousemove",onMove);window.addEventListener("mouseup",onUp);}}><div style={{width:3,height:32,borderRadius:999,background:C.line2,opacity:.6}}/></div>
          {(()=>{const br=bigRockId?focusTasks.find(t=>t.id===bigRockId):null;if(!br)return null;return(<div style={{background:"linear-gradient(135deg,#fdf8ee 0%,#faf3e0 100%)",border:"2px solid #c9a84c",borderRadius:12,padding:"12px 14px"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}><span style={{fontSize:15}}>Rock</span><div style={{...mono,fontSize:9,color:"#8a6a1a",textTransform:"uppercase",letterSpacing:1.4,fontWeight:700}}>The Big Rock</div><button onClick={()=>setShowFocusTasks(true)} style={{marginLeft:"auto",background:"transparent",border:"none",fontSize:10,color:"#8a6a1a",cursor:"pointer",fontFamily:"Inter"}}>open</button></div><div style={{display:"flex",alignItems:"flex-start",gap:8}}><button onClick={()=>setFocusTasks(prev=>prev.map(t=>t.id===br.id?{...t,done:!t.done}:t))} style={{width:18,height:18,borderRadius:4,border:`2px solid ${br.done?"#5a8a4a":"#c9a84c"}`,background:br.done?"#5a8a4a":"transparent",flexShrink:0,cursor:"pointer",padding:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:2}}>{br.done&&<span style={{color:"#fff",fontSize:10}}>v</span>}</button><div style={{...serif,fontSize:15,color:br.done?"#a09070":"#2a1f00",textDecoration:br.done?"line-through":"none",lineHeight:1.35,flex:1}}>{br.label}</div></div></div>);})()}
          <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
            <button onClick={()=>{setShowList(v=>!v);setShowFocusTasks(false);}} style={{background:showList?C.ink:"transparent",color:showList?C.white:C.ink2,border:`1px solid ${showList?C.ink:C.line2}`,padding:"5px 12px",borderRadius:999,fontSize:11,cursor:"pointer",fontFamily:"Inter"}}>{showList?"Back":"All Activities"}</button>
            <button onClick={()=>{setShowFocusTasks(v=>!v);setShowList(false);}} style={{background:showFocusTasks?C.ink:"transparent",color:showFocusTasks?C.white:C.ink2,border:`1px solid ${showFocusTasks?C.ink:C.line2}`,padding:"5px 12px",borderRadius:999,fontSize:11,cursor:"pointer",fontFamily:"Inter"}}>{showFocusTasks?"Back":"Focus Tasks"}</button>
          </div>
          {showList?<ActivityList ranged={ranged} cats={cats} setSelectedId={id=>{setSelectedId(id);setShowList(false);}}/>
          :showFocusTasks?<FocusTaskPanel tasks={focusTasks} setTasks={setFocusTasks} bigRockId={bigRockId} setBigRockId={setBigRockId} onClose={()=>setShowFocusTasks(false)}/>
          :selected?<SliceEditor slice={selected} ranged={ranged} updateField={updateField} changeDur={changeDur} changeStart={changeStart} deleteAct={deleteAct} insertAfter={insertAfter} selectByOffset={selectByOffset} setSelectedId={setSelectedId} canDelete={ranged.filter(x=>!x.isSleep).length>1} cats={cats} wakeRoutineSubs={wakeRoutineSubs} bedRoutineSubs={bedRoutineSubs} onUpdateRoutineSubs={updateRoutineSubs} onUpdateSliceSubs={updateSliceSubs} onPromote={promoteToRoutine} onDemote={demoteToSingle} checklist={checklist} setChecklist={setChecklist} tomorrowIds={tomorrowIds} onAdvance={advanceToTomorrow} onUndoAdvance={undoAdvance} wakeRoutineCopyOptions={Object.values(templates).filter(t=>t.id!==activeTpl.id).map(t=>({id:t.id,name:t.name}))} onCopyWakeRoutine={sourceId=>{const src=templates[sourceId];const subs=src?.wakeRoutineSubs??[];if(!subs.length){alert(`${src?.name??sourceId} has no wake-up steps saved yet.`);return;}updateRoutineSubs("__wake_routine__",subs.map(s=>({...s,id:`sub_${Date.now()}_${Math.random().toString(36).slice(2,5)}`})));}} otherTemplates={Object.values(templates).filter(t=>t.id!==activeTpl.id).map(t=>({id:t.id,name:t.name}))} onCopySliceTo={targetId=>copySliceTo(selected,targetId)}/>
          :<EmptyHint/>}
          {!showFocusTasks&&<><CategoryStats totals={totals} goals={goals} cats={cats} onEdit={()=>setCatModal(true)}/><div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={clearAllActivities} style={{background:"transparent",border:`1px solid ${C.line2}`,color:C.muted,padding:"6px 12px",borderRadius:999,fontSize:11,cursor:"pointer",fontFamily:"Inter"}}>Clear all</button>{activeTpl.builtIn&&<button onClick={resetTpl} style={{background:"transparent",border:`1px solid ${C.line2}`,color:C.ink2,padding:"6px 12px",borderRadius:999,fontSize:11,cursor:"pointer",fontFamily:"Inter"}}>Reset to default</button>}</div></>}
        </aside>}
      </div>

      {catModal&&<CatModal cats={cats} templates={templates} goals={goals} onAdd={addCat} onUpdate={updateCat} onDelete={deleteCat} onSetGoal={setGoal} onClose={()=>setCatModal(false)} tplName={activeTpl.name}/>}
      {showFocusTasks&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:`radial-gradient(ellipse at 20% -10%,#faf7f0 0%,transparent 55%),radial-gradient(ellipse at 90% 110%,#f0ebe0 0%,transparent 50%),${C.bg}`,display:"flex",flexDirection:"column",fontFamily:"Inter,system-ui,sans-serif"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 32px 16px",borderBottom:`1px solid ${C.line}`}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:30,fontWeight:900,letterSpacing:"0.06em",textTransform:"uppercase",color:C.ink}}>Focus Tasks</div>
            <button onClick={()=>setShowFocusTasks(false)} style={{background:"transparent",border:`1px solid ${C.line2}`,color:C.ink2,padding:"7px 18px",borderRadius:999,fontSize:13,cursor:"pointer",fontFamily:"Inter"}}>Close</button>
          </div>
          <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:"16px 24px",width:"100%",boxSizing:"border-box"}}>
            <FocusTaskPanel tasks={focusTasks} setTasks={setFocusTasks} bigRockId={bigRockId} setBigRockId={setBigRockId} onClose={()=>setShowFocusTasks(false)} fullScreen/>
          </div>
        </div>
      )}
      {saveMsg&&<div style={{position:"fixed",bottom:60,left:"50%",transform:"translateX(-50%)",background:"#3a6b3a",color:"#fff",padding:"8px 20px",borderRadius:999,fontSize:13,fontFamily:"Inter",zIndex:600}}>{saveMsg}</div>}
      {isDirty&&<UnsavedBar tplName={baseTpl.name} onDiscard={discardChanges} onSaveToday={saveForToday} onSaveTemplate={commitToTemplate} onSaveNew={saveAsNew}/>}
    </div>
    </>
  );
}

function RenameInput({value,onChange,onCommit,onCancel}){
  const ref=useRef(null);
  useEffect(()=>{ref.current?.focus();ref.current?.select();},[]);
  return(<input ref={ref} value={value} onChange={e=>onChange(e.target.value)} onBlur={onCommit} onKeyDown={e=>{if(e.key==="Enter")onCommit();if(e.key==="Escape")onCancel();}} style={{fontFamily:"Inter",fontSize:12,color:C.ink,background:C.bg,border:`1px solid ${C.ink}`,borderRadius:6,padding:"4px 8px",outline:"none",width:110}}/>);
}

function NowCard({now,liveHour,current,ranged,setSelectedId,cats}){
  const dateStr=now.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  const timeStr=fmtH(liveHour);
  const liveMin=now.getHours()*60+now.getMinutes();
  if(!current){
    const wt=ranged.find(s=>s.isSleep)?.endMin??360;
    const norm=m=>{const mm=((m%1440)+1440)%1440;return mm>=wt?mm:mm+1440;};
    const la=norm(liveMin);
    const upcoming=[...ranged].filter(s=>!s.isSleep&&norm(s.startMin)>la).sort((a,b)=>norm(a.startMin)-norm(b.startMin))[0];
    const minsToNext=upcoming?Math.round((norm(upcoming.startMin)-la)):0;
    return(
      <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><div style={{...mono,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>Right now</div><div style={{...mono,fontSize:11,color:C.muted}}>{now.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</div></div>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:6}}><div style={{...serif,fontSize:48,lineHeight:1,color:C.ink}}>{timeStr.replace(/\s?(am|pm)/,"")}</div><div style={{...serifI,fontSize:22,color:C.ink2}}>{timeStr.match(/(am|pm)/)?.[0]??""}</div></div>
        <div style={{...serifI,fontSize:18,color:C.muted,marginTop:10}}>Free time</div>
        {upcoming&&<div style={{fontSize:12,color:C.muted,marginTop:4}}>{minsToNext} min until <span style={{color:C.ink2}}>{upcoming.label}</span></div>}
      </div>
    );
  }
  const chronoRanged=[...ranged].sort((a,b)=>{const wt=current.startMin;const norm=m=>{const mm=((m%1440)+1440)%1440;return mm>=wt?mm:mm+1440;};return norm(a.startMin)-norm(b.startMin);});
  const chronoIdx=chronoRanged.findIndex(s=>s.id===current.id);
  const next=chronoRanged[(chronoIdx+1)%chronoRanged.length];
  const elapsed=((liveMin-current.startMin)+1440)%1440;
  const minsLeft=Math.max(0,Math.round(current.duration-elapsed));
  const pct=Math.max(0,Math.min(1,elapsed/current.duration));
  const cat=cats[current.cat]??{color:C.muted};
  return(
    <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:18,boxShadow:"0 1px 0 rgba(255,255,255,.6) inset,0 8px 24px -18px rgba(40,30,15,.25)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><div style={{...mono,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>Right now</div><div style={{...mono,fontSize:11,color:C.muted}}>{dateStr}</div></div>
      <div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:6}}><div style={{...serif,fontSize:48,lineHeight:1,color:C.ink}}>{timeStr.replace(/\s?(am|pm)/,"")}</div><div style={{...serifI,fontSize:22,color:C.ink2}}>{timeStr.match(/(am|pm)/)?.[0]??""}</div></div>
      <button onClick={()=>current&&!current.isSleep&&setSelectedId(current.id)} style={{marginTop:12,display:"flex",alignItems:"center",gap:8,background:"transparent",border:"none",padding:0,cursor:"pointer",color:"inherit"}}>
        <span style={{width:10,height:10,borderRadius:999,background:cat.color,flexShrink:0,boxShadow:`0 0 0 3px ${cat.color}30`}}/>
        <div style={{...serifI,fontSize:21,color:C.ink,lineHeight:1.15}}>{current.label}</div>
      </button>
      <div style={{marginTop:5,fontSize:12,color:C.muted}}>{minsLeft} min until <span style={{color:C.ink2}}>{next.label}</span></div>
      <div style={{marginTop:12,height:3,background:C.bg2,borderRadius:999,overflow:"hidden"}}><div style={{height:"100%",width:`${pct*100}%`,background:cat.color,borderRadius:999,transition:"width 600ms ease-out"}}/></div>
      <div style={{...mono,marginTop:6,fontSize:10,color:C.muted,display:"flex",justifyContent:"space-between"}}><span>{fmtM(current.startMin)}</span><span>{fmtD(current.duration)}</span><span>{fmtM(current.endMin)}</span></div>
    </div>
  );
}

function Wheel({ranged,selectedId,setSelectedId,hoveredId,setHoveredId,liveHour,current,cats,onAddAt,onChangeStart,wakeRoutineSubs,bedRoutineSubs,checklist,tomorrowIds,onShowFocusTasks,focusMode}){
  const liveAng=h2a(liveHour);
  const wakeTimeRef=ranged.find(s=>s.isSleep)?.endMin??360;
  function isSliceComplete(sl){let subs=null;if(sl.isRoutine){subs=sl.id==="__wake_routine__"?wakeRoutineSubs:bedRoutineSubs;}else if(sl.isUserRoutine){subs=sl.subs;}if(!subs||subs.length===0)return false;return subs.every(s=>!!checklist[`${sl.id}_${s.id}`]);}
  const tip=pol(CX,CY,RO+18,liveAng),bL=pol(CX,CY,RI+4,liveAng-1.2),bR=pol(CX,CY,RI+4,liveAng+1.2);
  const w=((liveHour%24)+24)%24,hi=Math.floor(w),mn=Math.floor((w-hi)*60);
  let d=hi%12; if(!d)d=12; const per=hi<12?"am":"pm";
  const svgRef=useRef(null);
  const dragRef=useRef(null);
  function getClockMin(e){const svg=svgRef.current;if(!svg)return 0;return svgEventToClockMin(e,svg);}
  function onSliceMouseDown(e,sl){
    if(sl.isSleep)return;
    const isLocked=sl.isRoutine;
    e.stopPropagation();e.preventDefault();
    const clockMin=getClockMin(e);
    const offsetMin=((clockMin-sl.startMin)+1440)%1440;
    const startPos={x:e.clientX,y:e.clientY};
    dragRef.current={id:sl.id,offsetMin,moved:false,lastStart:null};
    setSelectedId(sl.id);
    function onMove(me){if(!dragRef.current||isLocked)return;const dx=me.clientX-startPos.x,dy=me.clientY-startPos.y;if(Math.sqrt(dx*dx+dy*dy)<4&&!dragRef.current.moved)return;dragRef.current.moved=true;const cur=getClockMin(me);const ns=Math.round(((cur-dragRef.current.offsetMin)+1440)%1440/15)*15;if(ns!==dragRef.current.lastStart){dragRef.current.lastStart=ns;onChangeStart(dragRef.current.id,ns);}}
    function onUp(){window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);dragRef.current=null;}
    window.addEventListener("mousemove",onMove);window.addEventListener("mouseup",onUp);
  }
  return(
    <div style={{position:"relative",width:"min(760px,84vh,95vw)",aspectRatio:"1"}}>
      <svg ref={svgRef} viewBox={`0 0 ${VB} ${VB}`} style={{width:"100%",height:"100%",overflow:"visible"}}
        onDoubleClick={e=>{if(e.target.closest&&e.target.closest('[data-slice]'))return;onAddAt(getClockMin(e));}}
        onClick={e=>{if(!e.target.closest('[data-slice]'))setSelectedId(null);}}>
        <defs><radialGradient id="cg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fbf9f4"/><stop offset="80%" stopColor="#f5f1ea"/><stop offset="100%" stopColor="#ebe5d9"/></radialGradient></defs>
        <circle cx={CX} cy={CY} r={RO+28} fill="none" stroke={C.line} strokeWidth="1" strokeDasharray="2 4" opacity=".6"/>
        <path d={wdg(CX,CY,RO+22,RO+4,0,180)} fill="#f5ede0" opacity=".5"/>
        <path d={wdg(CX,CY,RO+22,RO+4,180,360)} fill="#dddaee" opacity=".35"/>
        {(()=>{
          const waking=ranged.filter(x=>!x.isSleep).sort((a,b)=>a.startMin-b.startMin);
          const sleepSlice=ranged.find(x=>x.isSleep);
          const sleepEnd=sleepSlice?sleepSlice.endMin:0;
          const occupied=waking.map(x=>({s:x.startMin,e:(x.startMin+x.duration)%1440}));
          const sleepDurMins=sleepSlice?sleepSlice.duration:480;
          const gaps=[];let cursor=sleepEnd;
          const sorted=[...occupied].sort((a,b)=>{const as_=a.s>=sleepEnd?a.s:a.s+1440;const bs_=b.s>=sleepEnd?b.s:b.s+1440;return as_-bs_;});
          for(const seg of sorted){const segAbs=seg.s>=sleepEnd?seg.s:seg.s+1440;if(segAbs>cursor)gaps.push({startMin:cursor%1440,dur:segAbs-cursor});cursor=Math.max(cursor,segAbs+seg.e-seg.s>0?segAbs+(seg.e>=seg.s?seg.e-seg.s:seg.e+1440-seg.s):segAbs);}
          const sleepStartAbs=sleepEnd+(1440-sleepDurMins);
          if(cursor<sleepStartAbs)gaps.push({startMin:cursor%1440,dur:sleepStartAbs-cursor});
          return gaps.map((g,gi)=>{const a0=min2deg(g.startMin);const sweep=(g.dur/1440)*360;const gap=Math.min(0.3,sweep*0.05);return(<path key={`gap${gi}`} d={wdgSweep(CX,CY,RO,RI,a0,sweep,gap)} fill="none" stroke={C.line} strokeWidth={0.5} opacity={0.4}/>);});
        })()}
        {ranged.map(sl=>{
          const a0=sl._a0,sweep=sl._sweep;
          const cat=cats[sl.cat]??{color:C.muted};
          const isSel=selectedId===sl.id,isHov=hoveredId===sl.id,isCur=current?.id===sl.id;
          const pulled=(!sl.isSleep&&isSel)?8:(!sl.isSleep&&isHov)?4:0;
          const mid=a0+sweep/2;const off=pol(0,0,pulled,mid);const gap=Math.min(.4,sweep*.08);
          return(
            <g key={sl.id} transform={`translate(${off.x},${off.y})`} style={{transition:"transform 240ms cubic-bezier(.2,.8,.2,1)"}}>
              <path d={wdgSweep(CX,CY,RO,RI,a0,sweep,gap)} fill={cat.color} fillOpacity={isSel?1:isHov?.96:isCur?.9:.78} stroke={C.bg} strokeWidth={1} data-slice="1" onMouseDown={e=>onSliceMouseDown(e,sl)} onClick={e=>e.stopPropagation()} onDoubleClick={e=>{e.stopPropagation();if(sl.cat==="focus")onShowFocusTasks();}} onMouseEnter={()=>!sl.isSleep&&setHoveredId(sl.id)} onMouseLeave={()=>setHoveredId(null)} style={{cursor:sl.isSleep?"default":sl.isRoutine?"pointer":"grab",transition:"fill-opacity 200ms",userSelect:"none"}}/>
              {isSel&&!sl.isSleep&&<path d={wdgSweep(CX,CY,RO+4,RO+1,a0,sweep,gap)} fill={C.ink}/>}
              {(tomorrowIds??{})[sl.id]&&(<path d={wdgSweep(CX,CY,RO+2,RO-2,a0,sweep,gap)} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} strokeDasharray="3 2"/>)}
              {(sl.isRoutine||sl.isUserRoutine)&&(()=>{
                const subs=sl.id==="__wake_routine__"?wakeRoutineSubs:sl.id==="__bed_routine__"?bedRoutineSubs:(sl.subs??[]);
                if(subs.length<2)return null;
                const total=subs.reduce((s,x)=>s+x.duration,0);if(total===0)return null;
                const result=[];let cumul=0;
                subs.forEach((sub,i)=>{cumul+=sub.duration;if(i===subs.length-1)return;const divAngle=a0+(cumul/total)*sweep;const p1=pol(CX,CY,RI+4,divAngle);const p2=pol(CX,CY,RO-4,divAngle);result.push(<line key={`div${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.5)" strokeWidth={1} strokeDasharray="2 3"/>);});
                cumul=0;subs.forEach((sub,i)=>{const sa=a0+((cumul+sub.duration/2)/total)*sweep;const np=pol(CX,CY,RO-10,sa);result.push(<text key={`num${i}`} x={np.x} y={np.y} textAnchor="middle" dominantBaseline="middle" fontFamily="'JetBrains Mono',monospace" fontSize={8} fontWeight={600} fill="rgba(255,255,255,0.7)">{i+1}</text>);cumul+=sub.duration;});
                return result;
              })()}
            </g>
          );
        })}
        <g style={{pointerEvents:"none"}}>
          {ranged.map(sl=>{
            const a0=sl._a0,sweep=sl._sweep,mid=a0+sweep/2;
            const lr=(RI+RO)/2+18,p=pol(CX,CY,lr,mid);
            const midN=((mid%360)+360)%360;
            const rot=(midN>=180&&midN<360)?mid-180:mid;
            const isSel=selectedId===sl.id,isHov=hoveredId===sl.id;
            const off=pol(0,0,(isSel&&!sl.isSleep)?8:(isHov&&!sl.isSleep)?4:0,mid);
            const tang=(sweep*Math.PI/180)*lr,rad=RO-RI-12;
            const fs=Math.max(8.5,Math.min(13,tang*.85));
            const ffs=Math.max(7.5,fs*(sl.label.length*fs*.55>rad?rad/(sl.label.length*fs*.55):1));
            const isRoutineType=sl.isRoutine||sl.isUserRoutine;
            const complete=isRoutineType&&isSliceComplete(sl);
            const lm=liveHour*60;
            const slEndAbs=((sl.endMin-wakeTimeRef+1440)%1440);
            const liveAbs=((lm-wakeTimeRef+1440)%1440);
            const elapsed=!sl.isSleep&&slEndAbs<liveAbs&&sl.id!==current?.id&&!(tomorrowIds??{})[sl.id]&&!(isRoutineType&&!isSliceComplete(sl));
            const dim=complete||elapsed;
            const gap=Math.min(.4,sweep*.08);
            return(
              <g key={sl.id} transform={`translate(${off.x},${off.y})`} style={{transition:"transform 240ms cubic-bezier(.2,.8,.2,1)"}}>
                {dim&&(<path d={wdgSweep(CX,CY,RO,RI,a0,sweep,gap)} fill="rgba(0,0,0,0.28)"/>)}
                <text x={p.x} y={p.y} transform={`rotate(${rot-90},${p.x},${p.y})`} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter,system-ui,sans-serif" fontSize={ffs} fontWeight={500} fill={(sl.isSleep||sl.isRoutine)?"rgba(251,249,244,0.7)":"#fbf9f4"} letterSpacing=".15" textDecoration={dim?"line-through":"none"}>{sl.label}</text>
              </g>
            );
          })}
        </g>
        {Array.from({length:24},(_,h)=>{const a=h2a(h),p1=pol(CX,CY,RO+2,a),p2=pol(CX,CY,RO+12,a),lp=pol(CX,CY,RH,a);const maj=h%6===0;return(<g key={h}><line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={maj?C.ink:C.line2} strokeWidth={maj?1.5:1}/><text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontFamily="'JetBrains Mono',monospace" fontSize={maj?15:12} fontWeight={maj?600:400} fill={maj?C.ink:C.ink2}>{fmtH(h,true)}</text></g>);})}
        {[{a:0,g:"☼",c:"#b8862a"},{a:90,g:"✶",c:"#b07040"},{a:180,g:"☾",c:"#6060a0"},{a:270,g:"✦",c:"#505090"}].map(it=>{const p=pol(CX,CY,RO+56,it.a);return<text key={it.a} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia,serif" fontSize={20} fill={it.c}>{it.g}</text>;})}
        <circle cx={CX} cy={CY} r={RI-2} fill="url(#cg)" stroke={C.line} strokeWidth="1"/>
        <text x={CX} y={CY-20} textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia,serif" fontStyle="italic" fontSize={17} fill={C.muted} letterSpacing="1.5">now</text>
        <text x={CX} y={CY+8} textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia,serif" fontSize={32} fill={C.ink}>{d}:{String(mn).padStart(2,"0")}<tspan fontStyle="italic" fontSize={17} fill={C.ink2} dx="3"> {per}</tspan></text>
        {current?(
          <>{<text x={CX} y={CY+36} textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia,serif" fontStyle="italic" fontSize={13} fill={C.ink2}>{current.label.length>18?current.label.slice(0,17)+"...":current.label}</text>}
          {(()=>{const lm=liveHour*60;const el=((lm-current.startMin)+1440)%1440;const ml=Math.max(0,Math.round(current.duration-el));return(<text x={CX} y={CY+54} textAnchor="middle" dominantBaseline="middle" fontFamily="'JetBrains Mono',monospace" fontSize={10} fill={C.muted}>{ml} min{ml!==1?"s":""} left</text>);})()}</>
        ):(<text x={CX} y={CY+36} textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia,serif" fontStyle="italic" fontSize={13} fill={C.muted}>free time</text>)}
        <g style={{pointerEvents:"none"}}>
          <path d={`M${bL.x} ${bL.y}L${tip.x} ${tip.y}L${bR.x} ${bR.y}Z`} fill={C.ink} style={{transition:"all 600ms ease-out"}}/>
          <circle cx={tip.x} cy={tip.y} r={5} fill={C.ink}/>
          <circle cx={tip.x} cy={tip.y} r={2} fill={C.bg}/>
        </g>
      </svg>
    </div>
  );
}

function EmptyHint(){return(<div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:16,minHeight:180,display:"flex",flexDirection:"column",gap:8}}><div style={{...mono,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>No slice selected</div><div style={{...serifI,fontSize:22,color:C.ink,lineHeight:1.2}}>Pick an hour on the wheel.</div><div style={{fontSize:12,color:C.muted,lineHeight:1.55}}>Click any wedge to rename it, adjust its start time or duration, change its category, or add a new one after it.</div></div>);}

const aBtn={background:"transparent",border:`1px solid ${C.line}`,color:C.ink2,padding:"7px 8px",borderRadius:8,fontSize:12,fontFamily:"Inter,system-ui,sans-serif",cursor:"pointer",textAlign:"center"};

function SliceEditor({slice,ranged,updateField,changeDur,changeStart,deleteAct,insertAfter,selectByOffset,setSelectedId,canDelete,cats,wakeRoutineSubs,bedRoutineSubs,onUpdateRoutineSubs,onUpdateSliceSubs,onPromote,onDemote,checklist,setChecklist,tomorrowIds,onAdvance,onUndoAdvance,wakeRoutineCopyOptions,onCopyWakeRoutine,otherTemplates,onCopySliceTo}){
  const maxDur=useMemo(()=>slice.isSleep?slice.duration:MAX_DUR,[slice.isSleep]);
  const[startVal,setStartVal]=useState(()=>minToTimeStr(slice.startMin));
  useEffect(()=>{setStartVal(minToTimeStr(slice.startMin));},[slice.startMin]);
  function commitStart(){changeStart(slice.id,timeStrToMin(startVal));}
  if(slice.isRoutine){const subs=slice.id==="__wake_routine__"?wakeRoutineSubs:bedRoutineSubs;const total=subs.reduce((s,x)=>s+x.duration,0);return(<RoutineEditor slice={slice} subs={subs} total={total} updateField={updateField} cats={cats} setSelectedId={setSelectedId} onUpdateSubs={ns=>onUpdateRoutineSubs(slice.id,ns)} checklist={checklist} setChecklist={setChecklist} tomorrowIds={tomorrowIds} onAdvance={onAdvance} onUndoAdvance={onUndoAdvance} copyFromOptions={wakeRoutineCopyOptions} onCopyFrom={onCopyWakeRoutine} otherTemplates={otherTemplates} onCopySliceTo={onCopySliceTo}/>);}
  if(slice.isUserRoutine){const subs=slice.subs??[];const total=subs.reduce((s,x)=>s+x.duration,0);return(<RoutineEditor slice={slice} subs={subs} total={total} updateField={updateField} cats={cats} setSelectedId={setSelectedId} onUpdateSubs={ns=>onUpdateSliceSubs(slice.id,ns)} canDemote onDemote={()=>onDemote(slice.id)} checklist={checklist} setChecklist={setChecklist} tomorrowIds={tomorrowIds} onAdvance={onAdvance} onUndoAdvance={onUndoAdvance} otherTemplates={otherTemplates} onCopySliceTo={onCopySliceTo}/>);}
  return(
    <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <div style={{...mono,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>{fmtM(slice.startMin)} - {fmtM(slice.endMin)}</div>
          {!slice.isSleep&&(()=>{const isAdv=!!(tomorrowIds??{})[slice.id];return(<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{...mono,fontSize:11,color:isAdv?"#5a8a4a":C.muted,background:isAdv?"#f0f5f0":"transparent",border:`1px solid ${isAdv?"#b0d0b0":C.line2}`,padding:"2px 9px",borderRadius:999,letterSpacing:.2}}>{isAdv?"Tomorrow":"Today"}</span>{isAdv?<button onClick={()=>onUndoAdvance(slice.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0,lineHeight:1,fontFamily:"Inter"}}>back</button>:<button onClick={()=>onAdvance(slice.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:0,lineHeight:1,fontFamily:"Inter"}}>tomorrow</button>}</div>);})()}
        </div>
        <button onClick={()=>setSelectedId(null)} style={{background:"transparent",border:"none",color:C.muted,fontSize:13,cursor:"pointer",padding:0,fontFamily:"Inter"}}>close x</button>
      </div>
      <input type="text" value={slice.label} onChange={e=>updateField(slice.id,{label:e.target.value})} placeholder="Activity name" style={{...serif,fontSize:22,color:C.ink,background:"transparent",border:"none",borderBottom:`1px solid ${C.line}`,padding:"4px 0",outline:"none",width:"100%"}}/>
      <div><div style={{...mono,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}}>Start time</div><input type="time" value={startVal} onChange={e=>setStartVal(e.target.value)} onBlur={commitStart} onKeyDown={e=>{if(e.key==="Enter")commitStart();}} style={{...mono,fontSize:15,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:8,padding:"6px 10px",outline:"none",width:"100%"}}/></div>
      <div><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}><div style={{...mono,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>Duration</div><div style={{...serif,fontSize:17,color:C.ink}}>{fmtD(slice.duration)}</div></div><input type="range" min={MIN_DUR} max={maxDur} step={15} value={slice.duration} onChange={e=>changeDur(slice.id,parseInt(e.target.value))} style={{width:"100%",accentColor:C.ink,cursor:"pointer"}}/><div style={{...mono,fontSize:10,color:C.muted,marginTop:3,display:"flex",justifyContent:"space-between"}}><span>15m</span><span>{fmtD(maxDur)} max</span></div></div>
      <div><div style={{...mono,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}}>Category</div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:12,height:12,borderRadius:999,background:(cats[slice.cat]??{color:C.muted}).color,flexShrink:0}}/><select value={slice.cat} onChange={e=>updateField(slice.id,{cat:e.target.value})} style={{...serif,flex:1,fontSize:14,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:8,padding:"7px 10px",outline:"none",cursor:"pointer"}}>{Object.entries(cats).map(([k,cat])=>(<option key={k} value={k}>{cat.label}</option>))}</select></div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        <button onClick={()=>insertAfter(slice.id)} style={aBtn}>+ Insert after</button>
        <button onClick={()=>canDelete&&deleteAct(slice.id)} disabled={!canDelete} style={{...aBtn,color:canDelete?"#a44":C.line2}}>x Delete</button>
        <button onClick={()=>selectByOffset(-1)} style={aBtn}>Prev</button>
        <button onClick={()=>selectByOffset(1)} style={aBtn}>Next</button>
      </div>
      <button onClick={()=>onPromote(slice.id)} style={{width:"100%",padding:"8px 0",background:"transparent",border:`1px dashed ${C.line2}`,borderRadius:8,fontSize:12,color:C.muted,cursor:"pointer",fontFamily:"Inter",letterSpacing:.2}}>+ Make this a routine</button>
      {otherTemplates&&otherTemplates.length>0&&(<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Copy to:</span>{otherTemplates.map(t=>(<button key={t.id} onClick={()=>onCopySliceTo(t.id)} style={{...mono,fontSize:10,color:C.ink2,background:"transparent",border:`1px solid ${C.line2}`,borderRadius:6,padding:"3px 8px",cursor:"pointer"}}>{t.name}</button>))}</div>)}
    </div>
  );
}

function RoutineEditor({slice,subs,total,updateField,cats,setSelectedId,onUpdateSubs,canDemote,onDemote,checklist,setChecklist,tomorrowIds,onAdvance,onUndoAdvance,copyFromOptions,onCopyFrom,otherTemplates,onCopySliceTo}){
  const[tab,setTab]=useState("today");
  const subIdCounter=useRef(1000);
  const newSubId=()=>`sub_${++subIdCounter.current}_${Math.random().toString(36).slice(2,5)}`;
  const checklistKey=`${slice.id}`;
  function toggleCheck(subId){
    setChecklist(prev=>{
      const key=`${checklistKey}_${subId}`;
      const next={...prev,[key]:!prev[key]};
      return next;
    });
  }
  const isChecked=(subId)=>!!(checklist??{})[`${checklistKey}_${subId}`];
  const doneCount=subs.filter(s=>isChecked(s.id)).length;
  const allDone=subs.length>0&&doneCount===subs.length;
  function addSub(){onUpdateSubs([...subs,{id:newSubId(),label:"New step",duration:15}]);}
  function updateSub(id,patch){onUpdateSubs(subs.map(s=>s.id===id?{...s,...patch}:s));}
  function deleteSub(id){onUpdateSubs(subs.filter(s=>s.id!==id));}
  function moveSub(id,dir){const i=subs.findIndex(s=>s.id===id);if(i<0)return;const ni=i+dir;if(ni<0||ni>=subs.length)return;const arr=[...subs];[arr[i],arr[ni]]=[arr[ni],arr[i]];onUpdateSubs(arr);}
  const tabBtn=(t)=>({flex:1,padding:"7px 0",fontSize:12,fontFamily:"Inter",cursor:"pointer",background:tab===t?C.ink:"transparent",color:tab===t?C.white:C.muted,border:`1px solid ${tab===t?C.ink:C.line2}`,borderRadius:t==="today"?"6px 0 0 6px":"0 6px 6px 0",fontWeight:tab===t?500:400,transition:"all 150ms"});
  const isAdv=!!(tomorrowIds??{})[slice.id];
  return(
    <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <div style={{...mono,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>{fmtM(slice.startMin)} - {fmtM(slice.endMin)}</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{...mono,fontSize:11,color:isAdv?"#5a8a4a":C.muted,background:isAdv?"#f0f5f0":"transparent",border:`1px solid ${isAdv?"#b0d0b0":C.line2}`,padding:"2px 9px",borderRadius:999,letterSpacing:.2}}>{isAdv?"Tomorrow":"Today"}</span>{isAdv?<button onClick={()=>onUndoAdvance(slice.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0,lineHeight:1,fontFamily:"Inter"}}>back</button>:<button onClick={()=>onAdvance(slice.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:0,lineHeight:1,fontFamily:"Inter"}}>tomorrow</button>}</div>
        </div>
        <button onClick={()=>setSelectedId(null)} style={{background:"transparent",border:"none",color:C.muted,fontSize:13,cursor:"pointer",padding:0,fontFamily:"Inter"}}>close x</button>
      </div>
      <input type="text" value={slice.label} onChange={e=>updateField(slice.id,{label:e.target.value})} placeholder="Routine name" style={{...serif,fontSize:22,color:C.ink,background:"transparent",border:"none",borderBottom:`1px solid ${C.line}`,padding:"4px 0",outline:"none",width:"100%"}}/>
      {canDemote&&<button onClick={()=>onDemote()} style={{alignSelf:"flex-start",background:"transparent",border:`1px solid ${C.line2}`,color:C.muted,padding:"4px 10px",borderRadius:999,fontSize:11,cursor:"pointer",fontFamily:"Inter"}}>Convert to single activity</button>}
      <div style={{display:"flex"}}><button style={tabBtn("today")} onClick={()=>setTab("today")}>Today</button><button style={tabBtn("edit")} onClick={()=>setTab("edit")}>Edit steps</button></div>
      {tab==="today"?(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {subs.length===0?(<div style={{fontSize:12,color:C.muted,fontStyle:"italic",textAlign:"center",padding:"12px 0"}}>No steps yet - go to Edit steps to add some.</div>):(
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}><div style={{...mono,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>{doneCount} / {subs.length} done</div>{allDone&&<div style={{fontSize:12,color:"#5a8a4a",fontWeight:500}}>Complete!</div>}</div>
              <div style={{height:3,background:C.bg2,borderRadius:999,overflow:"hidden",marginBottom:6}}><div style={{height:"100%",width:`${subs.length?(doneCount/subs.length)*100:0}%`,background:"#5a8a4a",borderRadius:999,transition:"width 300ms ease-out"}}/></div>
              {subs.map(sub=>{const done=isChecked(sub.id);return(<button key={sub.id} onClick={()=>toggleCheck(sub.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:done?"#f0f5f0":C.bg,border:`1px solid ${done?"#b0d0b0":C.line}`,borderRadius:8,cursor:"pointer",textAlign:"left",transition:"all 150ms"}}><div style={{width:18,height:18,borderRadius:4,border:`2px solid ${done?"#5a8a4a":C.line2}`,background:done?"#5a8a4a":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 150ms"}}>{done&&<span style={{color:"#fff",fontSize:11,lineHeight:1}}>v</span>}</div><div style={{flex:1}}><div style={{...serif,fontSize:15,color:done?C.muted:C.ink,textDecoration:done?"line-through":"none"}}>{sub.label}</div><div style={{...mono,fontSize:10,color:C.muted,marginTop:1}}>{fmtD(sub.duration)}</div></div></button>);})}
            </>
          )}
        </div>
      ):(
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{...mono,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>Total duration</div><div style={{...serif,fontSize:17,color:total>0?C.ink:C.muted}}>{total>0?fmtD(total):"none"}</div></div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {subs.length===0&&<div style={{fontSize:12,color:C.muted,fontStyle:"italic",textAlign:"center",padding:"8px 0"}}>No steps yet - add one below</div>}
            {subs.map((sub,i)=>(<div key={sub.id} style={{padding:"8px 10px",background:C.bg,borderRadius:8,border:`1px solid ${C.line}`,display:"flex",flexDirection:"column",gap:5}}><input value={sub.label} onChange={e=>updateSub(sub.id,{label:e.target.value})} style={{...serif,fontSize:14,color:C.ink,background:"transparent",border:"none",outline:"none",width:"100%"}}/><div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:4}}><input type="number" min={5} max={240} step={5} value={sub.duration} onChange={e=>updateSub(sub.id,{duration:parseInt(e.target.value)||5})} style={{...mono,fontSize:12,color:C.ink,background:"transparent",border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 6px",outline:"none",width:52,textAlign:"right"}}/><span style={{fontSize:10,color:C.muted}}>min</span></div><div style={{display:"flex",gap:10}}><button onClick={()=>moveSub(sub.id,i===0?1:-1)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:0,lineHeight:1}}>{i===0?"down":"up"}</button><button onClick={()=>deleteSub(sub.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:0,lineHeight:1}}>x</button></div></div></div>))}
          </div>
          <button onClick={addSub} style={{width:"100%",padding:"8px 0",background:"transparent",border:`1px dashed ${C.line2}`,borderRadius:8,fontSize:12,color:C.muted,cursor:"pointer",fontFamily:"Inter"}}>+ Add step</button>
          {copyFromOptions&&copyFromOptions.length>0&&(<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:4}}><span style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Copy from:</span>{copyFromOptions.map(t=>(<button key={t.id} onClick={()=>onCopyFrom(t.id)} style={{...mono,fontSize:10,color:C.ink2,background:"transparent",border:`1px solid ${C.line2}`,borderRadius:6,padding:"3px 8px",cursor:"pointer"}}>{t.name}</button>))}</div>)}
          <div><div style={{...mono,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}}>Category</div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:12,height:12,borderRadius:999,background:(cats[slice.cat]??{color:C.muted}).color,flexShrink:0}}/><select value={slice.cat} onChange={e=>updateField(slice.id,{cat:e.target.value})} style={{...serif,flex:1,fontSize:14,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:8,padding:"7px 10px",outline:"none",cursor:"pointer"}}>{Object.entries(cats).map(([k,cat])=>(<option key={k} value={k}>{cat.label}</option>))}</select></div></div>
          {otherTemplates&&otherTemplates.length>0&&(<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Copy to:</span>{otherTemplates.map(t=>(<button key={t.id} onClick={()=>onCopySliceTo(t.id)} style={{...mono,fontSize:10,color:C.ink2,background:"transparent",border:`1px solid ${C.line2}`,borderRadius:6,padding:"3px 8px",cursor:"pointer"}}>{t.name}</button>))}</div>)}
        </>
      )}
    </div>
  );
}

function UnsavedBar({tplName,onDiscard,onSaveToday,onSaveTemplate,onSaveNew}){
  const[showSaveNew,setShowSaveNew]=useState(false);
  const[newName,setNewName]=useState("");
  const inputRef=useRef(null);
  useEffect(()=>{if(showSaveNew&&inputRef.current)inputRef.current.focus();},[showSaveNew]);
  function commitNew(){if(!newName.trim())return;onSaveNew(newName.trim());setShowSaveNew(false);setNewName("");}
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:500,background:C.ink,color:C.white,padding:"12px 24px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 -4px 24px rgba(0,0,0,0.2)",fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{flex:1,fontSize:13,color:"rgba(255,255,255,0.7)"}}>Unsaved changes to <span style={{color:C.white,fontWeight:500}}>{tplName}</span></div>
      {showSaveNew?(
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <input ref={inputRef} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Template name..." onKeyDown={e=>{if(e.key==="Enter")commitNew();if(e.key==="Escape")setShowSaveNew(false);}} style={{fontFamily:"Inter",fontSize:13,color:C.ink,background:C.white,border:"none",borderRadius:6,padding:"6px 10px",outline:"none",width:180}}/>
          <button onClick={commitNew} style={barBtn("#fbf9f4",C.ink)}>Save</button>
          <button onClick={()=>setShowSaveNew(false)} style={barBtn("transparent","rgba(255,255,255,0.6)","1px solid rgba(255,255,255,0.25)")}>Cancel</button>
        </div>
      ):(
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onDiscard} style={barBtn("transparent","rgba(255,255,255,0.7)","1px solid rgba(255,255,255,0.25)")}>Discard</button>
          <button onClick={onSaveToday} style={barBtn("transparent",C.white,"1px solid rgba(255,255,255,0.4)")}>Just for today</button>
          <button onClick={onSaveTemplate} style={barBtn("transparent",C.white,"1px solid rgba(255,255,255,0.4)")}>Save to template</button>
          <button onClick={()=>{setShowSaveNew(true);setNewName(`${tplName} (copy)`);}} style={barBtn("#fbf9f4",C.ink)}>Save as new</button>
        </div>
      )}
    </div>
  );
}
function barBtn(bg,color,border="none"){return{background:bg,color,border,borderRadius:6,padding:"6px 14px",fontSize:12,fontFamily:"Inter",cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"};}

const PRIORITIES=[{key:"high",label:"!!!",color:"#a04040"},{key:"medium",label:"!!",color:"#b07030"},{key:"low",label:"!",color:"#8b8378"}];
const CONTEXTS=[{key:"actionable",label:"Actionable",color:"#4a6fa5"},{key:"wf_date",label:"W/F Date",color:"#7a6fa0"},{key:"wf_response",label:"W/F Response",color:"#6a9ea0"},{key:"wf_project",label:"W/F Project Task",color:"#a07040"},{key:"incubating",label:"Incubating",color:"#b8b070"}];
const SIZES=[{key:"small",label:"S"},{key:"medium",label:"M"},{key:"large",label:"L"}];
const PRI_ORDER={high:0,medium:1,low:2};
const SIZE_ORDER={small:0,medium:1,large:2};
function sortTasks(tasks){return[...tasks].sort((a,b)=>{const pd=(PRI_ORDER[a.priority??"medium"]??1)-(PRI_ORDER[b.priority??"medium"]??1);if(pd!==0)return pd;return(SIZE_ORDER[a.size??"medium"]??1)-(SIZE_ORDER[b.size??"medium"]??1);});}
function normalizeDue(d){if(!d)return null;const[y,m,day]=d.split("-");return`${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;}
function sortTasksByDue(tasks){return[...tasks].sort((a,b)=>{const ad=normalizeDue(a.due)??"9999-99-99";const bd=normalizeDue(b.due)??"9999-99-99";if(ad!==bd)return ad<bd?-1:1;const pd=(PRI_ORDER[a.priority??"medium"]??1)-(PRI_ORDER[b.priority??"medium"]??1);if(pd!==0)return pd;return(SIZE_ORDER[a.size??"medium"]??1)-(SIZE_ORDER[b.size??"medium"]??1);});}

function TaskEditPopup({task,tasks,onSave,onClose}){
  const[label,setLabel]=useState(task.label);
  const[priority,setPriority]=useState(task.priority??"high");
  const[size,setSize]=useState(task.size??"small");
  const[context,setContext]=useState(task.context??"actionable");
  const[project,setProject]=useState(task.project??"");
  const[due,setDue]=useState(task.due??"");
  const curYear=new Date().getFullYear();
  const[dy,dm,dd]=due?due.split("-").map(Number):[curYear,"",""];
  const segBtn=(val,set,items)=>(<div style={{display:"flex",flexWrap:"wrap",gap:4,flex:1}}>{items.map(it=>(<button key={it.key} onClick={()=>set(it.key)} style={{padding:"5px 10px",fontSize:11,fontFamily:"Inter",cursor:"pointer",border:`1px solid ${val===it.key?C.ink:C.line}`,borderRadius:6,background:val===it.key?C.ink:"transparent",color:val===it.key?C.white:C.muted,transition:"all 150ms",whiteSpace:"nowrap"}}>{it.label}</button>))}</div>);
  function save(){if(!label.trim())return;onSave({label:label.trim(),priority,size,context,project:project.trim()||null,due:due||null});}
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:20,width:340,maxWidth:"92vw",boxShadow:"0 8px 32px rgba(0,0,0,.18)",display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}><div style={{...serifI,fontSize:20,color:C.ink}}>Edit task</div><button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer",padding:0}}>x</button></div>
        <input value={label} onChange={e=>setLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} style={{...serif,fontSize:15,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:8,padding:"8px 10px",outline:"none",width:"100%"}}/>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:48}}>Priority</div>{segBtn(priority,setPriority,PRIORITIES)}</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:48}}>Size</div>{segBtn(size,setSize,SIZES)}</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:48}}>Context</div>{segBtn(context,setContext,CONTEXTS)}</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:48}}>Project</div><input value={project} onChange={e=>setProject(e.target.value)} placeholder="optional..." list="pse" style={{...serif,flex:1,fontSize:13,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:6,padding:"5px 8px",outline:"none"}}/><datalist id="pse">{[...new Set(tasks.filter(t=>t.project).map(t=>t.project))].map(p=><option key={p} value={p}/>)}</datalist></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:48}}>Due</div><div style={{display:"flex",alignItems:"center",gap:3}}><input type="number" min={1} max={12} placeholder="M" value={dm||""} onChange={e=>{const m=parseInt(e.target.value)||0;const y=dy||curYear;const d2=dd||1;if(m)setDue(`${y}-${String(m).padStart(2,"0")}-${String(d2).padStart(2,"0")}`);}} style={{...mono,fontSize:12,width:40,textAlign:"center",background:C.bg,border:`1px solid ${C.line}`,borderRadius:5,padding:"4px 2px",outline:"none",color:C.ink}}/><span style={{color:C.muted}}>/</span><input type="number" min={1} max={31} placeholder="D" value={dd||""} onChange={e=>{const d2=parseInt(e.target.value)||0;const y=dy||curYear;const m=dm||1;if(d2)setDue(`${y}-${String(m).padStart(2,"0")}-${String(d2).padStart(2,"0")}`);}} style={{...mono,fontSize:12,width:40,textAlign:"center",background:C.bg,border:`1px solid ${C.line}`,borderRadius:5,padding:"4px 2px",outline:"none",color:C.ink}}/><span style={{color:C.muted}}>/</span><input type="number" min={0} max={99} placeholder="YY" value={dy?dy%100:""} onChange={e=>{const y=2000+(parseInt(e.target.value)||0);const m=dm||1;const d2=dd||1;setDue(`${y}-${String(m).padStart(2,"0")}-${String(d2).padStart(2,"0")}`);}} style={{...mono,fontSize:12,width:40,textAlign:"center",background:C.bg,border:`1px solid ${C.line}`,borderRadius:5,padding:"4px 2px",outline:"none",color:C.ink}}/>{due&&<button onClick={()=>setDue("")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12,padding:0}}>x</button>}</div></div>
        <div style={{display:"flex",gap:8,marginTop:4}}><button onClick={onClose} style={{flex:1,background:"transparent",border:`1px solid ${C.line}`,borderRadius:8,padding:"8px 0",fontSize:12,cursor:"pointer",fontFamily:"Inter",color:C.muted}}>Cancel</button><button onClick={save} style={{flex:2,background:C.ink,color:C.white,border:"none",borderRadius:8,padding:"8px 0",fontSize:13,cursor:"pointer",fontFamily:"Inter",fontWeight:600}}>Save</button></div>
      </div>
    </div>
  );
}

function BigRockCard({task,onToggle,onDemote,onEdit}){
  if(!task)return null;
  const pri=PRIORITIES.find(p=>p.key===(task.priority??"medium"))??PRIORITIES[1];
  const size=SIZES.find(s=>s.key===(task.size??"medium"))??SIZES[1];
  const ctx=CONTEXTS.find(c=>c.key===(task.context??"actionable"))??CONTEXTS[0];
  const today=todayS();const due=task.due??null;
  const isOverdue=due&&!task.done&&due<today;const isToday=due&&due===today;
  function fmtDue(d){if(!d)return null;const[y,m,day]=d.split("-");return`${parseInt(m)}/${parseInt(day)}/${y.slice(2)}`;}
  return(
    <div style={{background:task.done?"#f5f2ea":"linear-gradient(135deg,#fdf8ee 0%,#faf3e0 100%)",border:"2px solid #c9a84c",borderRadius:12,padding:"14px 16px",marginBottom:4,boxShadow:"0 2px 12px rgba(201,168,76,0.18)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:18,lineHeight:1}}>Rock</span><div style={{...mono,fontSize:9,color:"#8a6a1a",textTransform:"uppercase",letterSpacing:1.4,fontWeight:700}}>The Big Rock</div><button onClick={onDemote} style={{marginLeft:"auto",background:"transparent",border:"1px solid #c9a84c50",borderRadius:5,padding:"1px 7px",fontSize:10,color:"#8a6a1a",cursor:"pointer",fontFamily:"Inter"}}>x clear</button></div>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}><button onClick={()=>onToggle(task.id)} style={{width:20,height:20,borderRadius:5,border:`2px solid ${task.done?"#5a8a4a":"#c9a84c"}`,background:task.done?"#5a8a4a":"transparent",flexShrink:0,cursor:"pointer",padding:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:2}}>{task.done&&<span style={{color:"#fff",fontSize:11,lineHeight:1}}>v</span>}</button><div onDoubleClick={()=>onEdit(task)} style={{...serif,fontSize:17,fontWeight:400,color:task.done?"#a09070":"#2a1f00",textDecoration:task.done?"line-through":"none",flex:1,cursor:"pointer",userSelect:"none",lineHeight:1.35}}>{task.label}</div></div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:10,paddingLeft:30}}>
        <span style={{...mono,fontSize:10,fontWeight:700,color:pri.color,border:`1px solid ${pri.color}40`,borderRadius:5,padding:"1px 6px"}}>{pri.label}</span>
        <span style={{...mono,fontSize:10,color:"#8a6a1a",border:"1px solid #c9a84c50",borderRadius:5,padding:"1px 6px"}}>{size.label}</span>
        <span style={{...mono,fontSize:9,color:ctx.color,border:`1px solid ${ctx.color}40`,borderRadius:5,padding:"1px 6px"}}>{ctx.label}</span>
        {due&&<span style={{...mono,fontSize:10,color:isOverdue?"#a04040":isToday?"#b07030":"#8a6a1a",border:`1px solid ${isOverdue?"#f0d0d0":isToday?"#e8d8b0":"#c9a84c50"}`,borderRadius:5,padding:"1px 6px"}}>{fmtDue(due)}</span>}
        {task.project&&<span style={{...mono,fontSize:9,color:"#5a7a6a",background:"#eef4f0",border:"1px solid #c8ddd0",borderRadius:5,padding:"1px 6px"}}>project {task.project}</span>}
      </div>
    </div>
  );
}

function FocusTaskPanel({tasks,setTasks,bigRockId,setBigRockId,onClose,fullScreen}){
  const[newLabel,setNewLabel]=useState("");
  const[newPriority,setNewPriority]=useState("high");
  const[newSize,setNewSize]=useState("small");
  const[newContext,setNewContext]=useState("actionable");
  const[newDue,setNewDue]=useState(()=>todayS());
  const[newProject,setNewProject]=useState("");
  const[view,setView]=useState("due");
  const[showAddPopup,setShowAddPopup]=useState(false);
  const[editingTask,setEditingTask]=useState(null);
  const[editingDue,setEditingDue]=useState(null);
  const[newProjectModal,setNewProjectModal]=useState(false);
  const[newProjectName,setNewProjectName]=useState("");
  const inputRef=useRef(null);
  const popupRef=useRef(null);
  useEffect(()=>{if(showAddPopup)inputRef.current?.focus();},[showAddPopup]);
  useEffect(()=>{if(!showAddPopup)return;function handle(e){if(popupRef.current&&!popupRef.current.contains(e.target))setShowAddPopup(false);}document.addEventListener("mousedown",handle);return()=>document.removeEventListener("mousedown",handle);},[showAddPopup]);
  function addTask(){if(!newLabel.trim())return;const id=`task_${Date.now()}_${Math.random().toString(36).slice(2,5)}`;setTasks(prev=>[...prev,{id,label:newLabel.trim(),done:false,priority:newPriority,size:newSize,context:newContext,due:newDue||null,project:newProject.trim()||null}]);setNewLabel("");setNewDue(todayS());setNewProject("");setShowAddPopup(false);}
  function toggleTask(id){setTasks(prev=>prev.map(t=>t.id===id?{...t,done:!t.done}:t));}
  function deleteTask(id){setTasks(prev=>prev.filter(t=>t.id!==id));}
  function updateTask(id,patch){setTasks(prev=>prev.map(t=>t.id===id?{...t,...patch}:t));}
  function clearDone(){setTasks(prev=>prev.filter(t=>!t.done));}
  function promoteBigRock(id){setBigRockId(prev=>prev===id?null:id);}
  const pending=view==="due"?sortTasksByDue(tasks.filter(t=>!t.done)):sortTasks(tasks.filter(t=>!t.done));
  const done=tasks.filter(t=>t.done);
  const segBtn=(val,set,current,items)=>(<div style={{display:"flex",flexWrap:"wrap",gap:4,flex:1}}>{items.map(it=>(<button key={it.key} onClick={()=>set(it.key)} style={{padding:"5px 10px",fontSize:12,fontFamily:"Inter",cursor:"pointer",border:`1px solid ${current===it.key?C.ink:C.line}`,borderRadius:6,background:current===it.key?C.ink:"transparent",color:current===it.key?C.white:C.muted,transition:"all 150ms",whiteSpace:"nowrap"}}>{it.label}</button>))}</div>);
  const VIEWS=[{key:"due",label:"Due Date"},{key:"priority",label:"Priority"},{key:"context",label:"Context"},{key:"project",label:"Project"}];
  return(
    <div style={{background:fullScreen?"transparent":C.white,border:fullScreen?"none":`1px solid ${C.line}`,borderRadius:12,padding:fullScreen?0:16,display:"flex",flexDirection:"column",gap:14}}>
      {!fullScreen&&(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{...mono,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>Focus Tasks</div><button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,fontSize:13,cursor:"pointer",padding:0,fontFamily:"Inter"}}>close x</button></div>)}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:fullScreen?8:8,alignItems:"center",flexWrap:"wrap"}}>{VIEWS.map(v=>(<button key={v.key} onClick={()=>setView(v.key)} style={{cursor:"pointer",border:"none",padding:fullScreen?"6px 16px":"5px 14px",borderRadius:999,fontFamily:"'Sacramento',cursive,'Georgia',serif",fontSize:fullScreen?22:20,fontWeight:400,color:view===v.key?C.white:C.ink2,background:view===v.key?C.ink:C.bg2,transition:"all 200ms",letterSpacing:"0.01em",boxShadow:view===v.key?"0 2px 8px rgba(0,0,0,0.15)":"none"}}>{v.label}</button>))}</div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          {view==="project"&&(<button onClick={()=>{setNewProjectName("");setNewProjectModal(true);}} style={{background:"transparent",color:C.ink2,border:`1px solid ${C.line2}`,borderRadius:8,padding:fullScreen?"10px 18px":"7px 12px",fontSize:fullScreen?14:12,cursor:"pointer",fontFamily:"Inter",fontWeight:500,letterSpacing:.3}}>+ New Project</button>)}
          <div style={{position:"relative"}} ref={popupRef}>
            <button onClick={()=>setShowAddPopup(v=>!v)} style={{background:C.ink,color:C.white,border:"none",borderRadius:8,padding:fullScreen?"10px 22px":"7px 14px",fontSize:fullScreen?14:12,cursor:"pointer",fontFamily:"Inter",fontWeight:600,letterSpacing:.3}}>+ Add Task</button>
            {showAddPopup&&(
              <div style={{position:"absolute",right:0,top:fullScreen?50:40,zIndex:100,background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:18,width:320,boxShadow:"0 8px 32px rgba(0,0,0,.14)",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{...serifI,fontSize:18,color:C.ink,marginBottom:2}}>New task</div>
                <input ref={inputRef} value={newLabel} onChange={e=>setNewLabel(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addTask();if(e.key==="Escape")setShowAddPopup(false);}} placeholder="Task name..." style={{...serif,fontSize:15,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:8,padding:"8px 10px",outline:"none",width:"100%"}}/>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:48}}>Priority</div>{segBtn(newPriority,setNewPriority,newPriority,PRIORITIES)}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:48}}>Size</div>{segBtn(newSize,setNewSize,newSize,SIZES)}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:48}}>Context</div>{segBtn(newContext,setNewContext,newContext,CONTEXTS)}</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:48}}>Project</div><input value={newProject} onChange={e=>setNewProject(e.target.value)} placeholder="optional..." list="ps" style={{...serif,flex:1,fontSize:13,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:6,padding:"5px 8px",outline:"none"}}/><datalist id="ps">{[...new Set(tasks.filter(t=>t.project).map(t=>t.project))].map(p=>(<option key={p} value={p}/>))}</datalist></div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:48}}>Due</div><div style={{display:"flex",alignItems:"center",gap:3,flex:1}}>{(()=>{const cy=new Date().getFullYear();const[dy,dm,dd]=newDue?newDue.split("-").map(Number):[cy,"",""];return(<><input type="number" min={1} max={12} placeholder="M" value={dm||""} onChange={e=>{const m=parseInt(e.target.value)||0;if(m)setNewDue(`${dy}-${String(m).padStart(2,"0")}-${String(dd||1).padStart(2,"0")}`);}} style={{...mono,fontSize:12,width:36,textAlign:"center",background:C.bg,border:`1px solid ${C.line}`,borderRadius:5,padding:"4px 2px",outline:"none",color:C.ink}}/><span style={{color:C.muted}}>/</span><input type="number" min={1} max={31} placeholder="D" value={dd||""} onChange={e=>{const d2=parseInt(e.target.value)||0;if(d2)setNewDue(`${dy}-${String(dm||1).padStart(2,"0")}-${String(d2).padStart(2,"0")}`);}} style={{...mono,fontSize:12,width:36,textAlign:"center",background:C.bg,border:`1px solid ${C.line}`,borderRadius:5,padding:"4px 2px",outline:"none",color:C.ink}}/><span style={{color:C.muted}}>/</span><input type="number" min={0} max={99} placeholder="YY" value={dy%100||""} onChange={e=>{const y2=2000+(parseInt(e.target.value)||0);setNewDue(`${y2}-${String(dm||1).padStart(2,"0")}-${String(dd||1).padStart(2,"0")}`);}} style={{...mono,fontSize:12,width:36,textAlign:"center",background:C.bg,border:`1px solid ${C.line}`,borderRadius:5,padding:"4px 2px",outline:"none",color:C.ink}}/>{newDue&&<button onClick={()=>setNewDue("")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12,padding:0}}>x</button>}</>);})()}</div></div>
                <button onClick={addTask} style={{background:C.ink,color:C.white,border:"none",borderRadius:8,padding:"9px 0",fontSize:13,cursor:"pointer",fontFamily:"Inter",fontWeight:600,marginTop:2}}>Add Task</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {newProjectModal&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&setNewProjectModal(false)}>
          <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:22,width:320,maxWidth:"92vw",boxShadow:"0 8px 32px rgba(0,0,0,.18)",display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{...serifI,fontSize:20,color:C.ink}}>New project</div><button onClick={()=>setNewProjectModal(false)} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer",padding:0}}>x</button></div>
            <input autoFocus value={newProjectName} onChange={e=>setNewProjectName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newProjectName.trim()){setNewProject(newProjectName.trim());setNewProjectModal(false);setShowAddPopup(true);}if(e.key==="Escape")setNewProjectModal(false);}} placeholder="Project name..." style={{...serif,fontSize:15,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:8,padding:"8px 10px",outline:"none",width:"100%"}}/>
            <div style={{display:"flex",gap:8}}><button onClick={()=>setNewProjectModal(false)} style={{flex:1,background:"transparent",border:`1px solid ${C.line}`,borderRadius:8,padding:"8px 0",fontSize:12,cursor:"pointer",fontFamily:"Inter",color:C.muted}}>Cancel</button><button disabled={!newProjectName.trim()} onClick={()=>{if(!newProjectName.trim())return;setNewProject(newProjectName.trim());setNewProjectModal(false);setShowAddPopup(true);}} style={{flex:2,background:newProjectName.trim()?C.ink:C.line2,color:C.white,border:"none",borderRadius:8,padding:"8px 0",fontSize:13,cursor:newProjectName.trim()?"pointer":"default",fontFamily:"Inter",fontWeight:600,transition:"background 150ms"}}>Add First Task</button></div>
          </div>
        </div>
      )}
      {editingTask&&(<TaskEditPopup task={editingTask} tasks={tasks} onSave={(patch)=>{updateTask(editingTask.id,patch);setEditingTask(null);}} onClose={()=>setEditingTask(null)}/>)}
      {editingDue&&(<div style={{position:"fixed",inset:0,zIndex:500}} onClick={()=>setEditingDue(null)}><div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:501}} onClick={e=>e.stopPropagation()}><DateEditPopup due={editingDue.due} onSave={(nd)=>{updateTask(editingDue.taskId,{due:nd});setEditingDue(null);}} onClear={()=>{updateTask(editingDue.taskId,{due:null});setEditingDue(null);}} onClose={()=>setEditingDue(null)}/></div></div>)}
      {(()=>{const br=bigRockId?tasks.find(t=>t.id===bigRockId):null;if(!br)return null;return<BigRockCard task={br} onToggle={toggleTask} onDemote={()=>setBigRockId(null)} onEdit={setEditingTask}/>;})()}
      {(()=>{
        const groups=[];
        if(view==="priority"){PRIORITIES.forEach(pri=>{const t=pending.filter(x=>(x.priority??"medium")===pri.key);if(t.length)groups.push({key:pri.key,label:pri.key.charAt(0).toUpperCase()+pri.key.slice(1),color:pri.color,tasks:sortTasks(t),defaultOpen:true});});}
        else if(view==="due"){
          const now=new Date();const today=todayS();
          const tom=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);const tomorrowS=tom.toISOString().slice(0,10);
          const dUS=(6-now.getDay()+7)%7||7;const eow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+dUS);const eowS=eow.toISOString().slice(0,10);
          const eom=new Date(now.getFullYear(),now.getMonth()+1,0);const eomS=eom.toISOString().slice(0,10);
          const nd=t=>normalizeDue(t.due)??null;
          const overdue=pending.filter(t=>nd(t)&&nd(t)<today);const todayT=pending.filter(t=>nd(t)===today);const tomorrowT=pending.filter(t=>nd(t)===tomorrowS);const thisWeek=pending.filter(t=>nd(t)&&nd(t)>tomorrowS&&nd(t)<=eowS);const thisMonth=pending.filter(t=>nd(t)&&nd(t)>eowS&&nd(t)<=eomS);const future=pending.filter(t=>nd(t)&&nd(t)>eomS);const undated=pending.filter(t=>!t.due);
          if(overdue.length)groups.push({key:"overdue",label:"Overdue",color:"#a04040",tasks:sortTasksByDue(overdue),defaultOpen:true});
          if(todayT.length)groups.push({key:"today",label:"Today",color:"#b07030",tasks:sortTasksByDue(todayT),defaultOpen:true});
          if(tomorrowT.length)groups.push({key:"tomorrow",label:"Tomorrow",color:"#7a6fa0",tasks:sortTasksByDue(tomorrowT),defaultOpen:true});
          if(thisWeek.length)groups.push({key:"this_week",label:"This Week",color:"#4a6fa5",tasks:sortTasksByDue(thisWeek),defaultOpen:true});
          if(thisMonth.length)groups.push({key:"this_month",label:"This Month",color:"#5a8a6a",tasks:sortTasksByDue(thisMonth),defaultOpen:true});
          if(future.length)groups.push({key:"future",label:"Future",color:"#8b8378",tasks:sortTasksByDue(future),defaultOpen:true});
          if(undated.length)groups.push({key:"undated",label:"No Date",color:C.muted,tasks:sortTasks(undated),defaultOpen:true});
        }
        else if(view==="context"){CONTEXTS.forEach(ctx=>{const t=pending.filter(x=>(x.context??"actionable")===ctx.key);if(t.length)groups.push({key:ctx.key,label:ctx.label,color:ctx.color,tasks:sortTasksByDue(t),defaultOpen:true});});}
        else if(view==="project"){const projects=[...new Set(pending.map(t=>t.project||"__none__"))];const sorted=projects.sort((a,b)=>a==="__none__"?1:b==="__none__"?-1:a.localeCompare(b));sorted.forEach(p=>{const t=pending.filter(x=>(x.project||"__none__")===p);if(t.length)groups.push({key:p,label:p==="__none__"?"No Project":p,color:p==="__none__"?C.muted:"#5a7a6a",tasks:sortTasksByDue(t),defaultOpen:p!=="__none__",projectKey:p});});}
        if(done.length)groups.push({key:"done",label:`Done (${done.length})`,color:C.muted,tasks:done,defaultOpen:false,onClear:clearDone});
        if(groups.length===0)return(<div style={{fontSize:12,color:C.muted,fontStyle:"italic",textAlign:"center",padding:"16px 0"}}>No tasks yet</div>);
        if(fullScreen){return(<div style={{display:"grid",gridTemplateColumns:`repeat(${groups.length}, 1fr)`,gap:16,alignItems:"start",height:"calc(100vh - 260px)",overflowY:"auto"}}>{groups.map(g=>(<div key={g.key} style={{background:C.bg,borderRadius:12,padding:12,border:`1px solid ${C.line}`}}><TaskGroup label={g.label} color={g.color} tasks={g.tasks} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask} defaultOpen={g.defaultOpen} onClear={g.onClear} onEditTask={setEditingTask} onAddProjectTask={g.projectKey!=null?()=>{setNewProject(g.projectKey==="__none__"?"":g.projectKey);setShowAddPopup(true);}:undefined} bigRockId={bigRockId} onPromoteBigRock={promoteBigRock}/></div>))}</div>);}
        return(<div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"calc(100vh - 280px)",overflowY:"auto"}}>{groups.map(g=>(<TaskGroup key={g.key} label={g.label} color={g.color} tasks={g.tasks} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask} defaultOpen={g.defaultOpen} onClear={g.onClear} onEditDue={(taskId,due)=>setEditingDue({taskId,due})} onEditTask={setEditingTask} onAddProjectTask={g.projectKey!=null?()=>{setNewProject(g.projectKey==="__none__"?"":g.projectKey);setShowAddPopup(true);}:undefined} bigRockId={bigRockId} onPromoteBigRock={promoteBigRock}/>))}</div>);
      })()}
    </div>
  );
}

function TaskGroup({label,color,tasks,onToggle,onDelete,onUpdate,defaultOpen,onClear,onEditDue,onEditTask,onAddProjectTask,bigRockId,onPromoteBigRock}){
  const[open,setOpen]=useState(defaultOpen??true);
  return(
    <div>
      <button onClick={()=>setOpen(v=>!v)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"6px 0",marginBottom:open?8:0}}>
        <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:16,fontWeight:800,textTransform:"uppercase",color}}>{label}</span>
        <span style={{...mono,fontSize:10,color:C.muted,marginTop:4}}>{tasks.length}</span>
        <span style={{marginLeft:"auto",fontSize:12,color:C.muted}}>{open?"v":">"}</span>
        {onClear&&open&&(<span onClick={e=>{e.stopPropagation();onClear();}} style={{fontSize:11,color:C.muted,fontFamily:"Inter",marginLeft:4,cursor:"pointer"}}>Clear</span>)}
      </button>
      {open&&(
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {tasks.map(task=>(<TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} onEditDue={onEditDue} onEditTask={onEditTask} isBigRock={task.id===bigRockId} onPromoteBigRock={onPromoteBigRock}/>))}
          {onAddProjectTask&&(<button onClick={onAddProjectTask} style={{marginTop:2,width:"100%",padding:"7px 0",background:"transparent",border:`1px dashed ${C.line2}`,borderRadius:8,fontSize:12,color:C.muted,cursor:"pointer",fontFamily:"Inter",letterSpacing:.2,transition:"all 150ms"}} onMouseEnter={e=>{e.currentTarget.style.color=C.ink2;e.currentTarget.style.borderColor=C.ink2;}} onMouseLeave={e=>{e.currentTarget.style.color=C.muted;e.currentTarget.style.borderColor=C.line2;}}>+ Add Project Task</button>)}
        </div>
      )}
    </div>
  );
}

function DateEditPopup({due,onSave,onClear,onClose}){
  const curYear=new Date().getFullYear();
  const[dy,dm,dd]=due?due.split("-").map(Number):[curYear,new Date().getMonth()+1,new Date().getDate()];
  const[m,setM]=useState(dm);const[d,setD]=useState(dd);const[y,setY]=useState(dy%100);
  function commit(){const fy=2000+(y||26);onSave(`${fy}-${String(m||1).padStart(2,"0")}-${String(d||1).padStart(2,"0")}`);}
  return(
    <div style={{position:"absolute",right:0,bottom:26,zIndex:20,background:C.white,border:`1px solid ${C.line}`,borderRadius:8,padding:8,boxShadow:"0 4px 16px rgba(0,0,0,.1)",minWidth:130}}>
      <div style={{display:"flex",alignItems:"center",gap:3}}>
        <input type="number" min={1} max={12} placeholder="M" value={m} onChange={e=>setM(parseInt(e.target.value)||"")} style={{...mono,fontSize:12,width:40,textAlign:"center",background:"transparent",border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 4px",outline:"none",color:C.ink}}/>
        <span style={{color:C.muted,fontSize:11}}>/</span>
        <input type="number" min={1} max={31} placeholder="D" value={d} onChange={e=>setD(parseInt(e.target.value)||"")} style={{...mono,fontSize:12,width:40,textAlign:"center",background:"transparent",border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 4px",outline:"none",color:C.ink}}/>
        <span style={{color:C.muted,fontSize:11}}>/</span>
        <input type="number" min={0} max={99} placeholder="YY" value={y} onChange={e=>setY(parseInt(e.target.value)||"")} style={{...mono,fontSize:12,width:40,textAlign:"center",background:"transparent",border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 4px",outline:"none",color:C.ink}}/>
      </div>
      {due&&<button onClick={onClear} style={{display:"block",width:"100%",marginTop:4,background:"transparent",border:"none",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"Inter",textAlign:"center"}}>Clear date</button>}
      <button onClick={commit} style={{display:"block",width:"100%",marginTop:2,background:C.ink,color:C.white,border:"none",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"Inter",padding:"4px 0"}}>Done</button>
    </div>
  );
}

function TaskRow({task,onToggle,onDelete,onUpdate,onEditDue,onEditTask,isBigRock,onPromoteBigRock}){
  const[showDate,setShowDate]=useState(false);
  const[showPriority,setShowPriority]=useState(false);
  const[showSize,setShowSize]=useState(false);
  const[showContext,setShowContext]=useState(false);
  const[confirmDelete,setConfirmDelete]=useState(false);
  const pri=PRIORITIES.find(p=>p.key===(task.priority??"medium"))??PRIORITIES[1];
  const size=SIZES.find(s=>s.key===(task.size??"medium"))??SIZES[1];
  const ctx=CONTEXTS.find(c=>c.key===(task.context??"actionable"))??CONTEXTS[0];
  const today=todayS();const due=task.due??null;
  const isOverdue=due&&!task.done&&due<today;const isToday=due&&due===today;
  function fmtDue(d){if(!d)return null;const[y,m,day]=d.split("-");return`${parseInt(m)}/${parseInt(day)}/${y.slice(2)}`;}
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5,padding:"7px 10px",background:C.bg,borderRadius:8,border:`1px solid ${C.line}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={()=>onToggle(task.id)} style={{width:18,height:18,borderRadius:4,border:`2px solid ${task.done?"#5a8a4a":C.line2}`,background:task.done?"#5a8a4a":"transparent",flexShrink:0,cursor:"pointer",padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{task.done&&<span style={{color:"#fff",fontSize:10,lineHeight:1}}>v</span>}</button>
        <div onDoubleClick={()=>{if(!task.done&&onEditTask)onEditTask(task);}} style={{...serif,flex:1,fontSize:14,color:task.done?C.muted:C.ink,textDecoration:task.done?"line-through":"none",cursor:task.done?"default":"pointer",userSelect:"none"}}>{task.label}</div>
        {onPromoteBigRock&&!task.done&&(<button onClick={()=>onPromoteBigRock(task.id)} title={isBigRock?"Clear Big Rock":"Set as Big Rock"} style={{background:"transparent",border:"none",cursor:"pointer",padding:"0 2px",fontSize:13,lineHeight:1,opacity:isBigRock?1:0.25,filter:isBigRock?"none":"grayscale(1)",transition:"opacity 150ms"}} onMouseEnter={e=>{if(!isBigRock)e.currentTarget.style.opacity="0.8";}} onMouseLeave={e=>{if(!isBigRock)e.currentTarget.style.opacity="0.25";}}>Rock</button>)}
        {confirmDelete?(
          <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:11,color:C.ink2,fontFamily:"Inter",whiteSpace:"nowrap"}}>Delete?</span><button onClick={()=>onDelete(task.id)} style={{...mono,fontSize:10,color:"#a04040",background:"transparent",border:"1px solid #f0d0d0",borderRadius:5,padding:"1px 6px",cursor:"pointer"}}>Yes</button><button onClick={()=>setConfirmDelete(false)} style={{...mono,fontSize:10,color:C.muted,background:"transparent",border:`1px solid ${C.line}`,borderRadius:5,padding:"1px 6px",cursor:"pointer"}}>No</button></div>
        ):(<button onClick={()=>setConfirmDelete(true)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:0,lineHeight:1,flexShrink:0}}>x</button>)}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:3,flexWrap:"wrap",paddingLeft:26}}>
        <div style={{position:"relative"}}><button onClick={()=>{if(!task.done){setShowPriority(v=>!v);setShowSize(false);setShowContext(false);}}} style={{...mono,fontSize:11,fontWeight:700,color:pri.color,background:"transparent",border:`1px solid ${pri.color}30`,borderRadius:5,padding:"1px 5px",cursor:task.done?"default":"pointer",lineHeight:1.4}}>{pri.label}</button>{showPriority&&(<div style={{position:"absolute",right:0,top:22,zIndex:20,background:C.white,border:`1px solid ${C.line}`,borderRadius:8,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,.1)"}}>{PRIORITIES.map(p=>(<button key={p.key} onClick={()=>{onUpdate(task.id,{priority:p.key});setShowPriority(false);}} style={{display:"block",width:"100%",padding:"6px 14px",border:"none",textAlign:"left",fontSize:12,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:p.color,background:p.key===task.priority?C.bg:"transparent",cursor:"pointer",whiteSpace:"nowrap"}}>{p.label}</button>))}</div>)}</div>
        <div style={{position:"relative"}}><button onClick={()=>{if(!task.done){setShowSize(v=>!v);setShowPriority(false);setShowContext(false);}}} style={{...mono,fontSize:10,color:C.muted,background:"transparent",border:`1px solid ${C.line}`,borderRadius:5,padding:"1px 5px",cursor:task.done?"default":"pointer",lineHeight:1.4}}>{size.label}</button>{showSize&&(<div style={{position:"absolute",right:0,top:22,zIndex:20,background:C.white,border:`1px solid ${C.line}`,borderRadius:8,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,.1)"}}>{SIZES.map(s=>(<button key={s.key} onClick={()=>{onUpdate(task.id,{size:s.key});setShowSize(false);}} style={{display:"block",width:"100%",padding:"6px 14px",border:"none",textAlign:"left",fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:C.ink2,background:s.key===task.size?C.bg:"transparent",cursor:"pointer",whiteSpace:"nowrap"}}>{s.label}</button>))}</div>)}</div>
        <div style={{position:"relative"}}><button onClick={()=>{if(!task.done){setShowContext(v=>!v);setShowPriority(false);setShowSize(false);}}} style={{...mono,fontSize:9,color:ctx.color,background:"transparent",border:`1px solid ${ctx.color}40`,borderRadius:5,padding:"1px 5px",cursor:task.done?"default":"pointer",lineHeight:1.4,whiteSpace:"nowrap"}}>{ctx.label}</button>{showContext&&(<div style={{position:"absolute",right:0,top:22,zIndex:20,background:C.white,border:`1px solid ${C.line}`,borderRadius:8,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,.1)"}}>{CONTEXTS.map(c=>(<button key={c.key} onClick={()=>{onUpdate(task.id,{context:c.key});setShowContext(false);}} style={{display:"block",width:"100%",padding:"6px 14px",border:"none",textAlign:"left",fontSize:11,fontFamily:"Inter",color:c.color,background:c.key===(task.context??"actionable")?C.bg:"transparent",cursor:"pointer",whiteSpace:"nowrap"}}>{c.label}</button>))}</div>)}</div>
        <div style={{position:"relative"}}><button onClick={()=>{if(!task.done){if(onEditDue){onEditDue(task.id,task.due);}else{setShowDate(v=>!v);}}}} style={{...mono,fontSize:10,color:isOverdue?"#a04040":isToday?"#b07030":due?C.ink2:C.muted,background:isOverdue?"#fdf4f4":isToday?"#fdf8f0":"transparent",border:`1px solid ${isOverdue?"#f0d0d0":isToday?"#e8d8b0":C.line}`,borderRadius:5,padding:"1px 5px",cursor:task.done?"default":"pointer",lineHeight:1.4,whiteSpace:"nowrap"}}>{due?fmtDue(due):"due"}</button>{showDate&&(<DateEditPopup due={due} onSave={(nd)=>{onUpdate(task.id,{due:nd});setShowDate(false);}} onClear={()=>{onUpdate(task.id,{due:null});setShowDate(false);}} onClose={()=>setShowDate(false)}/>)}</div>
        {task.project&&(<div style={{...mono,fontSize:9,color:"#5a7a6a",background:"#eef4f0",border:"1px solid #c8ddd0",borderRadius:5,padding:"1px 5px",lineHeight:1.4,whiteSpace:"nowrap",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis"}} title={task.project}>project {task.project}</div>)}
      </div>
    </div>
  );
}

function ActivityList({ranged,cats,setSelectedId}){
  const sorted=[...ranged].sort((a,b)=>{if(a.isSleep)return -1;if(b.isSleep)return 1;return a.startMin-b.startMin;});
  return(
    <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{padding:"12px 14px 10px",borderBottom:`1px solid ${C.line}`}}><div style={{...mono,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>All activities</div></div>
      <div style={{display:"flex",flexDirection:"column"}}>
        {sorted.map((sl,i)=>{const cat=cats[sl.cat]??{color:C.muted,label:"?"};return(<button key={sl.id} onClick={()=>!sl.isSleep&&setSelectedId(sl.id)} style={{display:"grid",gridTemplateColumns:"10px 1fr auto",gap:10,padding:"9px 14px",alignItems:"center",background:"transparent",border:"none",borderBottom:i<sorted.length-1?`1px solid ${C.line}`:"none",cursor:sl.isSleep?"default":"pointer",textAlign:"left",transition:"background 150ms"}} onMouseEnter={e=>{if(!sl.isSleep)e.currentTarget.style.background=C.bg;}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}><span style={{width:9,height:9,borderRadius:999,background:cat.color,flexShrink:0}}/><div style={{display:"flex",flexDirection:"column",gap:1}}><div style={{...serif,fontSize:15,color:C.ink,lineHeight:1.2}}>{sl.label}</div><div style={{...mono,fontSize:10,color:C.muted}}>{fmtH(sl.startMin)} - {fmtH(sl.endMin)} {fmtD(sl.duration)}</div></div><div style={{...mono,fontSize:10,color:C.muted,flexShrink:0}}>{cat.label}</div></button>);})}
      </div>
    </div>
  );
}

function CategoryStats({totals,goals,cats,onEdit}){
  const items=Object.entries(cats).map(([k,c])=>({key:k,...c,mins:totals[k]||0,goal:goals[k]||0})).filter(x=>x.mins>0||x.goal>0).sort((a,b)=>b.mins-a.mins);
  return(
    <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{...mono,fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:1.2}}>How the day stacks up</div><button onClick={onEdit} style={{background:"transparent",border:`1px solid ${C.line2}`,color:C.muted,padding:"3px 9px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"Inter"}}>Edit</button></div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {items.map(it=>{const hasGoal=it.goal>0;const diff=hasGoal?it.mins-it.goal:0;const over=hasGoal&&it.mins>it.goal;const pctBar=hasGoal?Math.min(100,(it.mins/it.goal)*100):Math.min(100,(it.mins/TOTAL)*100);const barColor=over?"#a05a3a":it.color;return(<div key={it.key}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><span style={{width:7,height:7,borderRadius:2,background:it.color,flexShrink:0}}/><div style={{flex:1,fontSize:12,color:C.ink2}}>{it.label}</div><div style={{...mono,fontSize:10.5,color:C.ink2}}>{fmtD(it.mins)}</div>{hasGoal&&(<div style={{...mono,fontSize:10,color:diff>0?"#5a8a4a":diff<0?"#a05a3a":C.muted,minWidth:36,textAlign:"right"}}>{diff===0?"done":diff>0?`+${fmtD(diff)}`:`-${fmtD(Math.abs(diff))}`}</div>)}</div><div style={{position:"relative",height:5,background:C.bg2,borderRadius:999,overflow:"hidden"}}><div style={{height:"100%",width:`${pctBar}%`,background:barColor,borderRadius:999,transition:"width 300ms ease-out"}}/></div>{hasGoal&&(<div style={{...mono,fontSize:9,color:C.muted,marginTop:2}}>{diff===0?"goal met":diff>0?`${fmtD(diff)} over goal`:`${fmtD(Math.abs(diff))} under goal`}</div>)}</div>);})}
      </div>
    </div>
  );
}

function CatModal({cats,templates,goals,onAdd,onUpdate,onDelete,onSetGoal,onClose,tplName}){
  const[pickerOpen,setPickerOpen]=useState(null);
  function isInUse(id){return Object.values(templates).some(t=>t.schedule.some(s=>s.cat===id));}
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(24,22,20,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:16,padding:24,width:520,maxWidth:"100%",maxHeight:"82vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(24,22,20,.22)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}><div style={{...serifI,fontSize:26,color:C.ink}}>Categories</div><button onClick={onClose} style={{background:"transparent",border:"none",fontSize:22,color:C.muted,cursor:"pointer",lineHeight:1,padding:0}}>x</button></div>
        <div style={{...mono,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:16}}>Goals are per template - currently: {tplName}</div>
        <div style={{display:"grid",gridTemplateColumns:"24px 1fr 90px 28px",gap:10,alignItems:"center",marginBottom:6}}><div/><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Name</div><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Goal / day</div><div/></div>
        <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
          {Object.entries(cats).map(([id,cat])=>{const used=isInUse(id);const goalHrs=(goals[id]||0)/60;const isSleepCat=id==="sleep";return(<div key={id} style={{display:"grid",gridTemplateColumns:"24px 1fr 90px 28px",gap:10,alignItems:"center",padding:"8px 10px",background:C.bg,borderRadius:8,border:`1px solid ${isSleepCat?C.line2:C.line}`}}><div style={{position:"relative"}}><button onClick={()=>setPickerOpen(pickerOpen===id?null:id)} style={{width:22,height:22,borderRadius:999,background:cat.color,border:`2px solid ${C.line2}`,cursor:"pointer",padding:0,display:"block"}}/>{pickerOpen===id&&(<div style={{position:"absolute",top:28,left:0,zIndex:10,background:C.white,border:`1px solid ${C.line}`,borderRadius:10,padding:10,display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:5,boxShadow:"0 8px 24px rgba(24,22,20,.15)",width:180}}>{PALETTE.map(col=>(<button key={col} onClick={()=>{onUpdate(id,{color:col});setPickerOpen(null);}} style={{width:22,height:22,borderRadius:999,background:col,border:col===cat.color?`2px solid ${C.ink}`:"2px solid transparent",cursor:"pointer",padding:0}}/>))}</div>)}</div><div style={{display:"flex",alignItems:"center",gap:6}}><input value={cat.label} onChange={e=>onUpdate(id,{label:e.target.value})} style={{...serif,fontSize:15,color:C.ink,background:"transparent",border:"none",borderBottom:`1px solid ${C.line}`,padding:"2px 0",outline:"none",width:"100%"}}/>{isSleepCat&&<span style={{...mono,fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:.6,flexShrink:0}}>sets sleep window</span>}</div><div style={{display:"flex",alignItems:"center",gap:4}}><input type="number" min={0} max={24} step={0.25} value={goalHrs||""} placeholder="none" onChange={e=>{const v=parseFloat(e.target.value)||0;onSetGoal(id,Math.round(v*60));}} style={{...mono,fontSize:13,color:C.ink,background:"transparent",border:`1px solid ${C.line}`,borderRadius:6,padding:"4px 6px",outline:"none",width:52,textAlign:"right"}}/><span style={{fontSize:11,color:C.muted}}>h</span></div>{used?(<span style={{...mono,fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:.6,textAlign:"center"}}>in use</span>):(<button onClick={()=>onDelete(id)} style={{background:"transparent",border:"none",color:C.muted,fontSize:16,cursor:"pointer",padding:0,lineHeight:1,textAlign:"center"}}>x</button>)}</div>);})}
        </div>
        <button onClick={onAdd} style={{width:"100%",padding:"10px 0",background:"transparent",border:`1px dashed ${C.line2}`,borderRadius:8,fontSize:13,color:C.muted,cursor:"pointer",fontFamily:"Inter"}}>+ Add category</button>
      </div>
    </div>
  );
}