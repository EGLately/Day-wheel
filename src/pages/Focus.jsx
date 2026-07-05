import { useState, useEffect } from "react";

const C = { bg:"#f5f1ea", bg2:"#ebe5d9", white:"#fbf9f4", ink:"#181614", ink2:"#4a443c", muted:"#8b8378", line:"#d9d2c2", line2:"#c4bba8", accent:"#c9a84c", green:"#5a8a4a", red:"#a04040" };
const serif  = { fontFamily:"'Georgia','Times New Roman',serif" };
const serifI = { fontFamily:"'Georgia','Times New Roman',serif", fontStyle:"italic" };
const mono   = { fontFamily:"'JetBrains Mono',ui-monospace,monospace" };
const sans   = { fontFamily:"Inter,system-ui,sans-serif" };

function EditableText({text,onSave,style,children}){
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(text||"");
  useEffect(()=>setVal(text||""),[text]);
  return editing?(
    <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onBlur={()=>{setEditing(false);const t=(val||"").trim();if(t!==text&&t.length>0)onSave&&onSave(t);}} onKeyDown={e=>{if(e.key==="Enter"){e.currentTarget.blur();} if(e.key==="Escape"){setVal(text||"");setEditing(false);}}} style={{fontSize:14,padding:"4px 6px",borderRadius:6,border:`1px solid ${C.line}`,...style}} />
  ):(
    <span onClick={()=>setEditing(true)} style={{...style, cursor:"text"}}>
      {children}
      {text}
    </span>
  );
}

const STATUSES = [
  { key:"actionable", label:"Actionable", color:"#5a8a4a" },
  { key:"waiting",    label:"Waiting",    color:"#7a6fa0" },
  { key:"someday",    label:"Someday",    color:"#8b8378" },
  { key:"on_hold",    label:"On Hold",    color:"#b07030" },
  { key:"complete",   label:"Complete",   color:"#4a6fa5" },
];
const DEFAULT_CONTEXTS = [
  { key:"errand",   label:"Errand",   color:"#b07030" },
  { key:"together", label:"Together", color:"#7a6fa0" },
  { key:"him",      label:"Him",      color:"#6a9ea0" },
  { key:"online",   label:"Online",   color:"#4a6fa5" },
  { key:"call",     label:"Call",     color:"#a06a7c" },
  { key:"home",     label:"Home",     color:"#5a9e7a" },
  { key:"computer", label:"Computer", color:"#7a8fa8" },
];
const PRIORITIES = [
  { key:"urgent", label:"!!!!", color:"#a04040" },
  { key:"high",   label:"!!!",  color:"#b07030" },
  { key:"normal", label:"!!",   color:"#4a6fa5" },
  { key:"low",    label:"!",    color:"#8b8378" },
];
const SIZES = [{ key:"small",label:"S" },{ key:"medium",label:"M" },{ key:"large",label:"L" }];

function nid() { return `i${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }
function todayS() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function fmtDate(d) { if(!d)return null; const[y,m,day]=d.split("-"); return `${parseInt(m)}/${parseInt(day)}/${y.slice(2)}`; }

// ── Recurrence engine ──────────────────────────────────────────────────────────
const WEEKDAY_NAMES=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WEEKDAY_SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function parseISO(d){const[y,m,day]=d.split("-").map(Number);return new Date(y,m-1,day);}
function toISO(dt){return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;}
function addDays(d,n){const dt=parseISO(d);dt.setDate(dt.getDate()+n);return toISO(dt);}
function addMonths(d,n){const dt=parseISO(d);dt.setMonth(dt.getMonth()+n);return toISO(dt);}
function addYears(d,n){const dt=parseISO(d);dt.setFullYear(dt.getFullYear()+n);return toISO(dt);}
function isWeekend(dt){const day=dt.getDay();return day===0||day===6;}

function nthWeekdayOfMonth(year,monthIdx,weekday,ordinal){
  if(ordinal===-1){
    const last=new Date(year,monthIdx+1,0);
    for(let d=last.getDate();d>=1;d--){
      const dt=new Date(year,monthIdx,d);
      if(dt.getDay()===weekday)return dt;
    }
  } else {
    let count=0;
    const daysInMonth=new Date(year,monthIdx+1,0).getDate();
    for(let d=1;d<=daysInMonth;d++){
      const dt=new Date(year,monthIdx,d);
      if(dt.getDay()===weekday){count++;if(count===ordinal)return dt;}
    }
  }
  return null;
}

function nthBusinessDayOfMonth(year,monthIdx,n){
  let count=0;
  const daysInMonth=new Date(year,monthIdx+1,0).getDate();
  for(let d=1;d<=daysInMonth;d++){
    const dt=new Date(year,monthIdx,d);
    if(!isWeekend(dt)){count++;if(count===n)return dt;}
  }
  return null;
}

function computeNextDate(fromDate,rule){
  if(!rule||!rule.freq)return null;
  const interval=rule.interval||1;

  if(rule.freq==="daily"){
    return addDays(fromDate,interval);
  }

  if(rule.freq==="weekly"){
    if(rule.daysOfWeek&&rule.daysOfWeek.length>0){
      let dt=parseISO(fromDate);
      for(let i=1;i<=7*interval+7;i++){
        dt.setDate(dt.getDate()+1);
        if(rule.daysOfWeek.includes(dt.getDay()))return toISO(dt);
      }
      return null;
    }
    return addDays(fromDate,7*interval);
  }

  if(rule.freq==="monthly"){
    if(rule.dayType==="business"&&rule.businessDayN){
      const dt=parseISO(fromDate);
      let y=dt.getFullYear(),m=dt.getMonth()+interval;
      y+=Math.floor(m/12);m=((m%12)+12)%12;
      const result=nthBusinessDayOfMonth(y,m,rule.businessDayN);
      return result?toISO(result):null;
    }
    if(rule.dayType==="weekday_occurrence"&&rule.weekdayOrdinal!=null&&rule.weekday!=null){
      const dt=parseISO(fromDate);
      let y=dt.getFullYear(),m=dt.getMonth()+interval;
      y+=Math.floor(m/12);m=((m%12)+12)%12;
      const result=nthWeekdayOfMonth(y,m,rule.weekday,rule.weekdayOrdinal);
      return result?toISO(result):null;
    }
    const day=rule.dayOfMonth||parseISO(fromDate).getDate();
    const next=addMonths(fromDate,interval);
    const dt=parseISO(next);
    const daysInMonth=new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate();
    dt.setDate(Math.min(day,daysInMonth));
    return toISO(dt);
  }

  if(rule.freq==="yearly"){
    return addYears(fromDate,interval);
  }

  return null;
}

function ordSuffix(n){const s=["th","st","nd","rd"],v=n%100;return s[(v-20)%10]||s[v]||s[0];}

function generateNextOccurrence(task){
  const rec=task.recurrence;
  if(!rec)return null;
  const nextDo=task.doDate&&rec.do?computeNextDate(task.doDate,rec.do):task.doDate;
  const nextDue=task.dueDate&&rec.due?computeNextDate(task.dueDate,rec.due):task.dueDate;
  const endRule=rec.do||rec.due;
  if(endRule){
    if(endRule.endType==="date"&&endRule.endDate&&nextDo&&nextDo>endRule.endDate)return null;
    if(endRule.endType==="count"&&endRule.endCount!=null){
      const occurrenceNum=(task.recurrence._occurrenceNum||1)+1;
      if(occurrenceNum>endRule.endCount)return null;
    }
  }
  return {
    ...task,
    id:nid(),
    doDate:nextDo,
    dueDate:nextDue,
    status:"actionable",
    recurrence:{...rec,_occurrenceNum:(rec._occurrenceNum||1)+1},
    subtasks:(task.subtasks||[]).map(s=>({...s,done:false})),
  };
}

function smartDate(d) {
  if(!d)return null;
  const t=todayS();
  const tom=new Date(); tom.setDate(tom.getDate()+1);
  const tS=tom.toISOString().slice(0,10);
  if(d===t)return"Today"; if(d===tS)return"Tomorrow"; return fmtDate(d);
}

const SEED = [
  { id:"m1", type:"project", title:"Home Remodel", description:"Full house renovation", status:"actionable", contexts:[], parentId:null, dueDate:"2026-09-01", doDate:null, priority:null, size:null, waitingFor:"", subtasks:[] },
  { id:"m2", type:"project", title:"Bedroom", description:"", status:"actionable", contexts:[], parentId:"m1", dueDate:"2026-08-01", doDate:null, priority:null, size:null, waitingFor:"", subtasks:[] },
  { id:"m3", type:"project", title:"Window Coverings", description:"Blinds for all bedroom windows", status:"actionable", contexts:[], parentId:"m2", dueDate:"2026-07-15", doDate:null, priority:null, size:null, waitingFor:"", subtasks:[] },
  { id:"a1", type:"task", title:"Research blind options", description:"Compare styles and prices online", status:"actionable", contexts:["online"], parentId:"m3", dueDate:"2026-07-01", doDate:"2026-06-10", priority:"high", size:"small", waitingFor:"", subtasks:[{id:"s1",label:"Check Home Depot",done:false},{id:"s2",label:"Check IKEA",done:false}] },
  { id:"a2", type:"task", title:"Purchase blinds", description:"", status:"actionable", contexts:["errand","together"], parentId:"m3", dueDate:"2026-07-05", doDate:"2026-06-15", priority:"high", size:"small", waitingFor:"", subtasks:[] },
  { id:"a3", type:"task", title:"Install blinds", description:"", status:"waiting", contexts:["him"], parentId:"m3", dueDate:"2026-07-15", doDate:"2026-06-20", priority:"normal", size:"medium", waitingFor:"delivery", subtasks:[{id:"s3",label:"Measure windows",done:true},{id:"s4",label:"Mount brackets",done:false}] },
  { id:"m4", type:"project", title:"Phase ZERO - Daily Wheel", description:"Build and launch the Day Wheel app", status:"actionable", contexts:[], parentId:null, dueDate:"2026-08-01", doDate:null, priority:null, size:null, waitingFor:"", subtasks:[] },
  { id:"a4", type:"task", title:"Linked drag feature", description:"", status:"complete", contexts:["computer"], parentId:"m4", dueDate:"2026-06-05", doDate:"2026-06-01", priority:"high", size:"medium", waitingFor:"", subtasks:[] },
  { id:"a5", type:"task", title:"Password reset flow", description:"", status:"actionable", contexts:["computer"], parentId:"m4", dueDate:"2026-06-10", doDate:todayS(), priority:"high", size:"small", waitingFor:"", subtasks:[] },
  { id:"a6", type:"task", title:"Pick up paint samples", description:"", status:"actionable", contexts:["errand","together"], parentId:"m2", dueDate:"2026-06-20", doDate:todayS(), priority:"normal", size:"small", waitingFor:"", subtasks:[] },
  { id:"a7", type:"task", title:"Call contractor re: timeline", description:"", status:"actionable", contexts:["call"], parentId:"m1", dueDate:"2026-06-15", doDate:todayS(), priority:"high", size:"small", waitingFor:"", subtasks:[] },
];

function getChildren(items,pid){return items.filter(x=>x.parentId===pid);}
function getDescendants(items,id){const ch=getChildren(items,id);return ch.flatMap(c=>[c,...getDescendants(items,c.id)]);}
function getActions(items,id){return getDescendants(items,id).filter(x=>x.type==="task");}
function progressOf(items,id){const a=getActions(items,id);if(!a.length)return null;return Math.round(a.filter(x=>x.status==="complete").length/a.length*100);}
function rollupDoDate(items,id){const a=getActions(items,id).filter(x=>x.doDate&&x.status!=="complete");if(!a.length)return null;return a.map(x=>x.doDate).sort()[0];}

function ContextTag({ctx,small}){
  return <span style={{...mono,fontSize:small?9:10,color:C.ink2,background:C.bg2,border:`1px solid ${C.line2}`,borderRadius:5,padding:small?"1px 5px":"2px 7px",whiteSpace:"nowrap"}}>{ctx.label}</span>;
}
function StatusBadge({status,waitingFor,small,allStatuses}){
  const list=allStatuses||STATUSES;
  const s=list.find(x=>x.key===status)??list[0];
  const label=status==="waiting"&&waitingFor?`Waiting: ${waitingFor}`:s.label;
  return <span style={{...sans,fontSize:small?10:11,color:s.color,background:`${s.color}12`,border:`1px solid ${s.color}35`,borderRadius:5,padding:small?"2px 7px":"3px 9px",whiteSpace:"nowrap",fontWeight:500}}>{label}</span>;
}
function DateBadge({date,label,small}){
  const today=todayS(),isOverdue=date&&date<today,isToday=date&&date===today;
  return <span style={{...mono,fontSize:small?9:10,color:isOverdue?C.red:isToday?"#b07030":C.muted,border:`1px solid ${isOverdue?"#f0d0d0":isToday?"#e8d8b0":C.line}`,background:isOverdue?"#fdf4f4":isToday?"#fdf8f0":"transparent",borderRadius:5,padding:small?"1px 5px":"2px 7px",whiteSpace:"nowrap"}}>{label&&<span style={{opacity:.6,marginRight:3}}>{label}</span>}{fmtDate(date)??"—"}</span>;
}
function ProgressBar({pct}){
  if(pct===null)return null;
  return <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{flex:1,height:3,background:C.bg2,borderRadius:999,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct===100?C.green:C.accent,borderRadius:999}}/></div><span style={{...mono,fontSize:9,color:C.muted}}>{pct}%</span></div>;
}

// ── RecurrenceEditor ─────────────────────────────────────────────────────────
function RecurrenceRuleEditor({label,rule,onChange}){
  const active=!!rule;
  const r=rule||{freq:"monthly",interval:1,dayType:"calendar",dayOfMonth:1,daysOfWeek:[1],endType:"never"};
  function upd(patch){onChange({...r,...patch});}
  return(
    <div style={{background:C.bg,borderRadius:8,border:`1px solid ${C.line}`,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={()=>onChange(active?null:r)} style={{width:16,height:16,borderRadius:4,border:`2px solid ${active?C.accent:C.line2}`,background:active?C.accent:"transparent",cursor:"pointer",padding:0,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{active&&<span style={{color:"#fff",fontSize:9,lineHeight:1}}>✓</span>}</button>
        <div style={{...mono,fontSize:10,color:C.ink2,textTransform:"uppercase",letterSpacing:.5,fontWeight:600}}>{label} repeats</div>
      </div>
      {active&&<>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{...sans,fontSize:11,color:C.muted}}>Every</span>
          <input type="number" min={1} max={99} value={r.interval||1} onChange={e=>upd({interval:parseInt(e.target.value)||1})}
            style={{...mono,fontSize:12,width:44,textAlign:"center",background:C.white,border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 4px",outline:"none",color:C.ink}}/>
          {[["daily","day(s)"],["weekly","week(s)"],["monthly","month(s)"],["yearly","year(s)"]].map(([val,lbl])=>
            <button key={val} onClick={()=>upd({freq:val})} style={{padding:"3px 9px",fontSize:10,cursor:"pointer",...sans,border:`1px solid ${r.freq===val?C.ink:C.line}`,borderRadius:6,background:r.freq===val?C.ink:"transparent",color:r.freq===val?C.white:C.muted}}>{lbl}</button>
          )}
        </div>

        {r.freq==="weekly"&&(
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {WEEKDAY_SHORT.map((d,i)=>(
              <button key={i} onClick={()=>{const cur=r.daysOfWeek||[];upd({daysOfWeek:cur.includes(i)?cur.filter(x=>x!==i):[...cur,i]});}}
                style={{width:30,height:26,fontSize:10,cursor:"pointer",...sans,border:`1px solid ${(r.daysOfWeek||[]).includes(i)?C.ink:C.line}`,borderRadius:5,background:(r.daysOfWeek||[]).includes(i)?C.ink:C.white,color:(r.daysOfWeek||[]).includes(i)?C.white:C.muted}}>{d}</button>
            ))}
          </div>
        )}

        {(r.freq==="monthly"||r.freq==="yearly")&&(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {[["calendar","Calendar day"],["business","Business day"],["weekday_occurrence","Weekday"]].map(([val,lbl])=>
                <button key={val} onClick={()=>upd({dayType:val})} style={{padding:"3px 9px",fontSize:10,cursor:"pointer",...sans,border:`1px solid ${(r.dayType||"calendar")===val?C.ink:C.line}`,borderRadius:6,background:(r.dayType||"calendar")===val?C.ink:"transparent",color:(r.dayType||"calendar")===val?C.white:C.muted}}>{lbl}</button>
              )}
            </div>
            {(!r.dayType||r.dayType==="calendar")&&(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{...sans,fontSize:11,color:C.muted}}>Day</span>
                <input type="number" min={1} max={31} value={r.dayOfMonth||1} onChange={e=>upd({dayOfMonth:parseInt(e.target.value)||1})}
                  style={{...mono,fontSize:12,width:44,textAlign:"center",background:C.white,border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 4px",outline:"none",color:C.ink}}/>
                <span style={{...sans,fontSize:11,color:C.muted}}>of the month</span>
              </div>
            )}
            {r.dayType==="business"&&(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{...sans,fontSize:11,color:C.muted}}>The</span>
                <input type="number" min={1} max={23} value={r.businessDayN||1} onChange={e=>upd({businessDayN:parseInt(e.target.value)||1})}
                  style={{...mono,fontSize:12,width:44,textAlign:"center",background:C.white,border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 4px",outline:"none",color:C.ink}}/>
                <span style={{...sans,fontSize:11,color:C.muted}}>business day</span>
              </div>
            )}
            {r.dayType==="weekday_occurrence"&&(
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <select value={r.weekdayOrdinal??1} onChange={e=>upd({weekdayOrdinal:parseInt(e.target.value)})}
                  style={{...sans,fontSize:12,background:C.white,border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 6px",outline:"none",color:C.ink}}>
                  <option value={1}>1st</option><option value={2}>2nd</option><option value={3}>3rd</option><option value={4}>4th</option><option value={-1}>Last</option>
                </select>
                <select value={r.weekday??1} onChange={e=>upd({weekday:parseInt(e.target.value)})}
                  style={{...sans,fontSize:12,background:C.white,border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 6px",outline:"none",color:C.ink}}>
                  {WEEKDAY_NAMES.map((n,i)=><option key={i} value={i}>{n}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",borderTop:`1px solid ${C.line}`,paddingTop:8}}>
          <span style={{...sans,fontSize:11,color:C.muted}}>Ends</span>
          {[["never","Never"],["count","After N"],["date","On date"]].map(([val,lbl])=>
            <button key={val} onClick={()=>upd({endType:val})} style={{padding:"3px 9px",fontSize:10,cursor:"pointer",...sans,border:`1px solid ${(r.endType||"never")===val?C.ink:C.line}`,borderRadius:6,background:(r.endType||"never")===val?C.ink:"transparent",color:(r.endType||"never")===val?C.white:C.muted}}>{lbl}</button>
          )}
          {r.endType==="count"&&<input type="number" min={1} value={r.endCount||10} onChange={e=>upd({endCount:parseInt(e.target.value)||10})}
            style={{...mono,fontSize:12,width:44,textAlign:"center",background:C.white,border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 4px",outline:"none",color:C.ink}}/>}
          {r.endType==="date"&&<input type="date" value={r.endDate||""} onChange={e=>upd({endDate:e.target.value})}
            style={{...mono,fontSize:12,background:C.white,border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 6px",outline:"none",color:C.ink}}/>}
        </div>
      </>}
    </div>
  );
}

function RecurrenceSection({recurrence,onChange}){
  const trigger=recurrence?.trigger||"fixed";
  const window=recurrence?.window||1;

  function toggleOn(){
    if(recurrence){onChange(null);}
    else{onChange({trigger:"fixed",window:1,do:null,due:null});}
  }
  function setTrigger(t){onChange({...recurrence,trigger:t});}
  function setWindow(w){onChange({...recurrence,window:w});}
  function setDoRule(rule){onChange({...recurrence,do:rule});}
  function setDueRule(rule){onChange({...recurrence,due:rule});}

  return(
    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
      <div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:64,paddingTop:6}}>Repeat</div>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
        <button onClick={toggleOn} style={{display:"flex",alignItems:"center",gap:8,background:"transparent",border:"none",cursor:"pointer",padding:0}}>
          <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${recurrence?C.accent:C.line2}`,background:recurrence?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{recurrence&&<span style={{color:"#fff",fontSize:9,lineHeight:1}}>✓</span>}</div>
          <span style={{...sans,fontSize:13,color:C.ink2}}>🔁 This task repeats</span>
        </button>

        {recurrence&&<>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>setTrigger("fixed")} style={{flex:1,padding:"6px 10px",fontSize:11,cursor:"pointer",...sans,border:`1px solid ${trigger==="fixed"?C.ink:C.line}`,borderRadius:6,background:trigger==="fixed"?C.ink:"transparent",color:trigger==="fixed"?C.white:C.muted}}>Fixed schedule</button>
            <button onClick={()=>setTrigger("completion")} style={{flex:1,padding:"6px 10px",fontSize:11,cursor:"pointer",...sans,border:`1px solid ${trigger==="completion"?C.ink:C.line}`,borderRadius:6,background:trigger==="completion"?C.ink:"transparent",color:trigger==="completion"?C.white:C.muted}}>On completion</button>
          </div>
          <div style={{...sans,fontSize:11,color:C.muted,lineHeight:1.4}}>
            {trigger==="fixed"
              ?"Generates the next occurrence on schedule, whether or not you completed this one."
              :"Future occurrences appear as projections that shift with this one — completing it locks the next in place and generates a new projection at the end."}
          </div>

          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{...sans,fontSize:11,color:C.muted}}>Keep</span>
            <input type="number" min={1} max={12} value={window} onChange={e=>setWindow(parseInt(e.target.value)||1)}
              style={{...mono,fontSize:12,width:44,textAlign:"center",background:C.white,border:`1px solid ${C.line}`,borderRadius:5,padding:"3px 4px",outline:"none",color:C.ink}}/>
            <span style={{...sans,fontSize:11,color:C.muted}}>occurrence(s) visible ahead</span>
          </div>

          <RecurrenceRuleEditor label="Do date" rule={recurrence.do} onChange={setDoRule}/>
          <RecurrenceRuleEditor label="Due date" rule={recurrence.due} onChange={setDueRule}/>
        </>}
      </div>
    </div>
  );
}

function ItemForm({item,items,allContexts,allStatuses,onSave,onClose,onAddContext}){
  const STATUSES_F=allStatuses||STATUSES;
  const isNew=!item.id;
  const[type,setType]=useState(item.type??"task");
  const[title,setTitle]=useState(item.title??"");
  const[desc,setDesc]=useState(item.description??"");
  const[status,setStatus]=useState(item.status??"actionable");
  const[waitingFor,setWaiting]=useState(item.waitingFor??"");
  const[priority,setPriority]=useState(item.priority??"");
  const[size,setSize]=useState(item.size??"small");
  const[dueDate,setDueDate]=useState(item.dueDate??"");
  const[doDate,setDoDate]=useState(item.doDate??todayS());
  const[parentId,setParentId]=useState(item.parentId??null);
  const[contexts,setContexts]=useState(item.contexts??[]);
  const[newCtxLabel,setNewCtxLabel]=useState("");
  const[recurrence,setRecurrence]=useState(item.recurrence??null);
  const[subtasks,setSubtasks]=useState(item.subtasks??[]);
  const[newSubLabel,setNewSubLabel]=useState("");
  function addSub(){if(!newSubLabel.trim())return;setSubtasks(p=>[...p,{id:nid(),label:newSubLabel.trim(),done:false}]);setNewSubLabel("");}
  function updateSubLabel(id,label){setSubtasks(p=>p.map(s=>s.id===id?{...s,label}:s));}
  function toggleSub(id){setSubtasks(p=>p.map(s=>s.id===id?{...s,done:!s.done}:s));}
  function deleteSub(id){setSubtasks(p=>p.filter(s=>s.id!==id));}
  function moveSub(id,dir){const i=subtasks.findIndex(s=>s.id===id);const ni=i+dir;if(ni<0||ni>=subtasks.length)return;const arr=[...subtasks];[arr[i],arr[ni]]=[arr[ni],arr[i]];setSubtasks(arr);}
  const containers=items.filter(x=>x.type==="project"&&x.id!==item.id);
  function toggleCtx(key){setContexts(p=>p.includes(key)?p.filter(k=>k!==key):[...p,key]);}
  function addCustomCtx(){if(!newCtxLabel.trim())return;const key=newCtxLabel.trim().toLowerCase().replace(/\s+/g,"-");onAddContext({key,label:newCtxLabel.trim(),color:"#8b8378"});setContexts(p=>[...p,key]);setNewCtxLabel("");}
  function save(){if(!title.trim())return;const rec=type==="task"&&recurrence?{...recurrence,seriesId:recurrence.seriesId||item.id||nid()}:null;onSave({...item,id:item.id??nid(),type,title:title.trim(),description:desc.trim(),status,waitingFor:status==="waiting"?waitingFor:"",priority:type==="task"?priority:null,size:type==="task"?size:null,dueDate:dueDate||null,doDate:type==="task"?(doDate||null):null,parentId:parentId||null,contexts,subtasks:type==="task"?subtasks:[],recurrence:rec});}
  const segBtn=(val,set,opts)=><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{opts.map(o=><button key={o.key} onClick={()=>set(o.key)} style={{padding:"4px 10px",fontSize:11,cursor:"pointer",...sans,border:`1px solid ${val===o.key?C.ink:C.line}`,borderRadius:6,background:val===o.key?C.ink:"transparent",color:val===o.key?C.white:C.muted}}>{o.label}</button>)}</div>;
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:16,padding:28,width:480,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 16px 48px rgba(0,0,0,.18)",display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{...serifI,fontSize:24,color:C.ink}}>{isNew?"New item":"Edit item"}</div><button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>×</button></div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:64}}>Type</div>{segBtn(type,setType,[{key:"project",label:"◈ Project"},{key:"task",label:"○ Task"}])}</div>
        <input value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} autoFocus placeholder={type==="project"?"Milestone or project…":"What needs to be done?"} style={{...serif,fontSize:17,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:8,padding:"10px 12px",outline:"none",width:"100%"}}/>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (optional)…" rows={2} style={{...sans,fontSize:13,color:C.ink2,background:C.bg,border:`1px solid ${C.line}`,borderRadius:8,padding:"8px 12px",outline:"none",width:"100%",resize:"vertical"}}/>
        <div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:64}}>Parent</div><select value={parentId??""} onChange={e=>setParentId(e.target.value||null)} style={{...sans,flex:1,fontSize:13,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:6,padding:"6px 8px",outline:"none"}}><option value="">— None —</option>{containers.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:64,paddingTop:6}}>Status</div><div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>{segBtn(status,setStatus,STATUSES_F)}{status==="waiting"&&<input value={waitingFor} onChange={e=>setWaiting(e.target.value)} placeholder="Waiting for who/what?" style={{...sans,fontSize:13,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:6,padding:"6px 10px",outline:"none"}}/>}</div></div>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:64,paddingTop:6}}>Context</div><div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{allContexts.map(ctx=><button key={ctx.key} onClick={()=>toggleCtx(ctx.key)} style={{padding:"4px 10px",fontSize:11,cursor:"pointer",...sans,border:`1px solid ${contexts.includes(ctx.key)?C.ink:C.line}`,borderRadius:6,background:contexts.includes(ctx.key)?C.bg2:"transparent",color:contexts.includes(ctx.key)?C.ink2:C.muted}}>{ctx.label}</button>)}</div><div style={{display:"flex",gap:6}}><input value={newCtxLabel} onChange={e=>setNewCtxLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCustomCtx()} placeholder="Add custom context…" style={{...sans,flex:1,fontSize:12,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:6,padding:"5px 8px",outline:"none"}}/><button onClick={addCustomCtx} style={{...sans,fontSize:12,background:"transparent",border:`1px solid ${C.line}`,borderRadius:6,padding:"5px 10px",cursor:"pointer",color:C.muted}}>Add</button></div></div></div>
        {type==="task"&&<>
          <div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:64}}>Priority</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{PRIORITIES.map(o=><button key={o.key} onClick={()=>setPriority(p=>p===o.key?"":o.key)} style={{padding:"4px 10px",fontSize:11,cursor:"pointer",...sans,border:`1px solid ${priority===o.key?o.color:C.line}`,borderRadius:6,background:priority===o.key?`${o.color}20`:"transparent",color:priority===o.key?o.color:C.muted}}>{o.label}</button>)}{priority&&<button onClick={()=>setPriority("")} style={{padding:"4px 8px",fontSize:11,cursor:"pointer",...sans,border:`1px solid ${C.line}`,borderRadius:6,background:"transparent",color:C.muted}}>✕</button>}</div></div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:64}}>Size</div>{segBtn(size,setSize,SIZES)}</div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:64}}>Do date</div><input type="date" value={doDate} onChange={e=>setDoDate(e.target.value)} style={{...mono,fontSize:13,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:6,padding:"5px 8px",outline:"none"}}/>{doDate&&<button onClick={()=>setDoDate("")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>×</button>}</div>
          <RecurrenceSection recurrence={recurrence} onChange={setRecurrence}/>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:64,paddingTop:6}}>Checklist</div>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
              {subtasks.map((s,i)=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:6}}>
                  <button onClick={()=>toggleSub(s.id)} style={{width:16,height:16,borderRadius:4,flexShrink:0,cursor:"pointer",padding:0,border:`2px solid ${s.done?C.green:C.line2}`,background:s.done?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{s.done&&<span style={{color:"#fff",fontSize:9,lineHeight:1}}>✓</span>}</button>
                  <input value={s.label} onChange={e=>updateSubLabel(s.id,e.target.value)} style={{...sans,flex:1,fontSize:13,color:s.done?C.muted:C.ink,textDecoration:s.done?"line-through":"none",background:C.bg,border:`1px solid ${C.line}`,borderRadius:6,padding:"4px 8px",outline:"none"}}/>
                  <button onClick={()=>moveSub(s.id,-1)} disabled={i===0} style={{background:"transparent",border:"none",color:i===0?C.line2:C.muted,cursor:i===0?"default":"pointer",fontSize:12,padding:"0 2px"}}>↑</button>
                  <button onClick={()=>moveSub(s.id,1)} disabled={i===subtasks.length-1} style={{background:"transparent",border:"none",color:i===subtasks.length-1?C.line2:C.muted,cursor:i===subtasks.length-1?"default":"pointer",fontSize:12,padding:"0 2px"}}>↓</button>
                  <button onClick={()=>deleteSub(s.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:"0 2px"}}>×</button>
                </div>
              ))}
              <div style={{display:"flex",gap:6}}>
                <input value={newSubLabel} onChange={e=>setNewSubLabel(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addSub();}}} placeholder="Add checklist item…" style={{...sans,flex:1,fontSize:13,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:6,padding:"6px 8px",outline:"none"}}/>
                <button onClick={addSub} style={{...sans,fontSize:12,background:"transparent",border:`1px solid ${C.line}`,borderRadius:6,padding:"6px 12px",cursor:"pointer",color:C.muted}}>Add</button>
              </div>
            </div>
          </div>
        </>}
        <div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,width:64}}>Due date</div><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={{...mono,fontSize:13,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:6,padding:"5px 8px",outline:"none"}}/>{dueDate&&<button onClick={()=>setDueDate("")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>×</button>}</div>
        <div style={{display:"flex",gap:8,marginTop:4}}><button onClick={onClose} style={{flex:1,background:"transparent",border:`1px solid ${C.line}`,borderRadius:8,padding:"9px 0",fontSize:13,cursor:"pointer",...sans,color:C.muted}}>Cancel</button><button onClick={save} style={{flex:2,background:C.ink,color:C.white,border:"none",borderRadius:8,padding:"9px 0",fontSize:13,cursor:"pointer",...sans,fontWeight:600}}>{isNew?"Add item":"Save changes"}</button></div>
      </div>
    </div>
  );
}

// ── Shared task card body — used by both ActionRow (Today/Do) and TreeItem (Plan) ──
function TaskCardBody({item,allContexts,allStatuses,onEdit,onUpdate,onJumpTo,parent,grandparent,onToggleSubtask}){
  const pri=PRIORITIES.find(p=>p.key===item.priority);
  const ctxTags=allContexts.filter(c=>item.contexts?.includes(c.key));
  const isDone=item.status==="complete";
  const[openPop,setOpenPop]=useState(null);
  function toggle(pop){setOpenPop(p=>p===pop?null:pop);}

  function Popup({children}){
    return <div style={{position:"absolute",top:24,left:0,zIndex:50,background:C.white,border:`1px solid ${C.line}`,borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,.12)",minWidth:140,overflow:"hidden"}}>{children}</div>;
  }
  function PopBtn({label,active,color,onClick}){
    return <button onClick={onClick} style={{display:"block",width:"100%",padding:"6px 12px",border:"none",textAlign:"left",fontSize:12,...sans,cursor:"pointer",background:active?C.bg2:"transparent",color:color||C.ink2}}>{label}</button>;
  }
  const statusList=allStatuses||STATUSES;
  const statusObj=statusList.find(s=>s.key===item.status)||statusList[0];
  function toggleSub(subId){
    if(onToggleSubtask){onToggleSubtask(item.id,subId);return;}
    if(onUpdate){
      onUpdate(item.id,{subtasks:(item.subtasks||[]).map(s=>s.id===subId?{...s,done:!s.done}:s)});
    }
  }

  return(
    <div style={{flex:1,minWidth:0}} onClick={e=>{if(!e.target.closest("[data-pop]"))setOpenPop(null);}}>
      {/* Row 1: priority pill + title */}
      <div style={{display:"flex",alignItems:"baseline",gap:6}}>
        <div style={{position:"relative",flexShrink:0}} data-pop="1">
          <button onClick={()=>toggle("priority")} style={{...mono,fontSize:10,fontWeight:700,cursor:"pointer",border:`1px solid ${pri?`${pri.color}50`:C.line}`,borderRadius:5,padding:"0px 5px",lineHeight:"20px",background:pri?`${pri.color}18`:C.bg2,color:pri?pri.color:C.muted,verticalAlign:"baseline"}}>{pri?pri.label:"·"}</button>
          {openPop==="priority"&&<Popup>{PRIORITIES.map(p=><PopBtn key={p.key} label={p.label} active={item.priority===p.key} color={p.color} onClick={()=>{onUpdate(item.id,{priority:p.key});setOpenPop(null);}}/>)}<PopBtn label="— none" active={!item.priority} color={C.muted} onClick={()=>{onUpdate(item.id,{priority:null});setOpenPop(null);}}/></Popup>}
        </div>
        <EditableText text={item.title} onSave={t=>onUpdate&&onUpdate(item.id,{title:t})} style={{...serif,fontSize:14,color:item.linked?C.muted:isDone?C.muted:C.ink,fontStyle:item.linked?"italic":"normal",textDecoration:isDone?"line-through":"none",flex:1}}>
          {item.recurrence&&<span title={item.linked?"Projected — will shift until locked in":"Recurring"} style={{fontSize:11,marginRight:4,opacity:item.linked?0.6:1}}>{item.linked?"⤳":"🔁"}</span>}
        </EditableText>
      </div>

      {/* Rows 2+3: breadcrumb + do/due dates */}
      <div style={{paddingLeft:38,marginTop:1}}>
        {parent&&<div style={{...mono,fontSize:9,color:C.muted,lineHeight:1.4,marginBottom:3,display:"flex",alignItems:"center",gap:3,flexWrap:"wrap"}}>{grandparent&&<><button onClick={()=>onJumpTo&&onJumpTo(grandparent.id)} style={{...mono,fontSize:9,background:"transparent",border:"none",color:C.muted,cursor:"pointer",padding:0,textDecoration:"underline",textDecorationStyle:"dotted"}}>{grandparent.title}</button><span style={{color:C.line2}}>›</span></>}<button onClick={()=>onJumpTo&&onJumpTo(parent.id)} style={{...mono,fontSize:9,background:"transparent",border:"none",color:C.muted,cursor:"pointer",padding:0,textDecoration:"underline",textDecorationStyle:"dotted"}}>{parent.title}</button></div>}
        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
          <button onClick={()=>toggle("doDate")} style={{...mono,fontSize:10,cursor:"pointer",background:"transparent",border:"none",padding:0,color:C.muted,lineHeight:1}} data-pop="1">{item.doDate?`do ${smartDate(item.doDate)}`:"set do"}</button>
          {openPop==="doDate"&&<div style={{position:"absolute",top:0,left:0,zIndex:50,background:C.white,border:`1px solid ${C.line}`,borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,.12)",minWidth:140,overflow:"hidden",padding:8,display:"flex",flexDirection:"column",gap:6}} data-pop="1"><input type="date" defaultValue={item.doDate||""} onChange={e=>onUpdate(item.id,{doDate:e.target.value||null})} style={{...mono,fontSize:12,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:6,padding:"4px 6px",outline:"none"}}/>{item.doDate&&<button onClick={()=>{onUpdate(item.id,{doDate:null});setOpenPop(null);}} style={{fontSize:11,color:C.muted,background:"transparent",border:"none",cursor:"pointer",...sans}}>Clear</button>}</div>}
          <span style={{color:C.line2,fontSize:10,lineHeight:1,display:"inline-block",verticalAlign:"middle"}}>·</span>
          <button onClick={()=>toggle("dueDate")} style={{...mono,fontSize:10,cursor:"pointer",background:"transparent",border:"none",padding:0,color:C.muted,lineHeight:1}} data-pop="1">{item.dueDate?`due ${smartDate(item.dueDate)}`:"set due"}</button>
          {openPop==="dueDate"&&<div style={{position:"absolute",top:0,left:0,zIndex:50,background:C.white,border:`1px solid ${C.line}`,borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,.12)",minWidth:140,overflow:"hidden",padding:8,display:"flex",flexDirection:"column",gap:6}} data-pop="1"><input type="date" defaultValue={item.dueDate||""} onChange={e=>onUpdate(item.id,{dueDate:e.target.value||null})} style={{...mono,fontSize:12,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:6,padding:"4px 6px",outline:"none"}}/>{item.dueDate&&<button onClick={()=>{onUpdate(item.id,{dueDate:null});setOpenPop(null);}} style={{fontSize:11,color:C.muted,background:"transparent",border:"none",cursor:"pointer",...sans}}>Clear</button>}</div>}
        </div>
      </div>

      {/* Row 4: status + contexts */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4,paddingLeft:38,alignItems:"center"}}>
        <div style={{position:"relative",display:"flex",alignItems:"center"}} data-pop="1">
          <button onClick={()=>toggle("status")} style={{...sans,fontSize:10,cursor:"pointer",border:`1px solid ${statusObj.color}35`,borderRadius:5,padding:"2px 8px",fontWeight:500,background:`${statusObj.color}12`,color:statusObj.color}}>{item.status==="waiting"&&item.waitingFor?`Waiting: ${item.waitingFor}`:statusObj.label}</button>
          {openPop==="status"&&<Popup>{statusList.map(s=><PopBtn key={s.key} label={s.label} active={item.status===s.key} color={s.color} onClick={()=>{onUpdate(item.id,{status:s.key});setOpenPop(null);}}/>)}</Popup>}
        </div>
        {ctxTags.map(ctx=><ContextTag key={ctx.key} ctx={ctx} small/>)}
      </div>

      {item.subtasks?.length>0&&(
        <div style={{marginTop:4,paddingLeft:38,display:"flex",flexDirection:"column",gap:3}}>
          {item.subtasks.map(st=>(
            <div key={st.id} style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>toggleSub(st.id)} style={{width:13,height:13,borderRadius:3,flexShrink:0,cursor:"pointer",padding:0,border:`2px solid ${st.done?C.green:C.line2}`,background:st.done?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{st.done&&<span style={{color:"#fff",fontSize:8,lineHeight:1}}>✓</span>}</button>
              <span style={{...sans,fontSize:12,color:st.done?C.muted:C.ink2,textDecoration:st.done?"line-through":"none"}}>{st.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ActionRow (Today / Do views) ──────────────────────────────────────────────
function ActionRow({item,items,allContexts,allStatuses,onEdit,onToggleStatus,onUpdate,onJumpTo,onToggleSubtask}){
  const parent=items.find(x=>x.id===item.parentId);
  const grandparent=parent?items.find(x=>x.id===parent.parentId):null;
  const isDone=item.status==="complete";
  return(
    <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:item.linked?C.bg:C.white,border:`1px ${item.linked?"dashed":"solid"} ${C.line}`,borderRadius:10,opacity:isDone?0.6:item.linked?0.75:1,position:"relative"}}>
      <button onClick={()=>onToggleStatus(item.id)} style={{width:18,height:18,borderRadius:4,flexShrink:0,marginTop:3,cursor:"pointer",padding:0,border:`2px solid ${isDone?C.green:C.line2}`,background:isDone?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{isDone&&<span style={{color:"#fff",fontSize:10}}>✓</span>}</button>
      <TaskCardBody item={item} allContexts={allContexts} allStatuses={allStatuses} onEdit={onEdit} onUpdate={onUpdate} onJumpTo={onJumpTo} parent={parent} grandparent={grandparent} onToggleSubtask={onToggleSubtask}/>
      <button onClick={()=>onEdit(item)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0,marginTop:2}}>✎</button>
    </div>
  );
}

// ── TreeItem (Plan view) — now uses same card body as ActionRow ─────────────
function TreeItem({item,items,allContexts,allStatuses,depth,onEdit,onAdd,onDelete,onToggleSubtask,expanded,onToggleExpand,onEditDoDate,onUpdate,onJumpTo}){
  const children=getChildren(items,item.id);
  const isExpanded=expanded.has(item.id);
  const isProject=item.type==="project";
  const isDone=item.status==="complete";
  const pct=isProject?progressOf(items,item.id):null;
  const rolledDo=isProject?rollupDoDate(items,item.id):null;

  if(isProject){
    return(
      <div>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:C.white,border:`1px solid ${C.line}`,borderRadius:10,marginLeft:depth*18}}>
          <button onClick={()=>children.length&&onToggleExpand(item.id)} style={{width:18,height:18,flexShrink:0,marginTop:3,fontSize:12,color:C.muted,background:"transparent",border:"none",cursor:children.length?"pointer":"default",padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{children.length?(isExpanded?"▾":"▸"):"◈"}</button>
          <div style={{flex:1,minWidth:0}}>
            {/* Row 1: title (no priority pill for projects) */}
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <EditableText text={item.title} onSave={t=>onUpdate?onUpdate(item.id,{title:t}):onEdit&&onEdit({...item,title:t})} style={{...serif,fontSize:14,color:C.ink,flex:1}}>
                <span style={{fontSize:11,marginRight:4,opacity:0.7}}>◈</span>
              </EditableText>
            </div>

            {/* Row 2+3: description as "breadcrumb" analog + do/due dates */}
            <div style={{paddingLeft:18,marginTop:1}}>
              {item.description&&<div style={{...mono,fontSize:9,color:C.muted,lineHeight:1.4,marginBottom:3}}>{item.description}</div>}
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                <button onClick={()=>onEditDoDate(item)} style={{...mono,fontSize:10,cursor:"pointer",background:"transparent",border:"none",padding:0,color:C.muted,lineHeight:1}}>{item.doDate?`do ${fmtDate(item.doDate)}`:rolledDo?`do↑ ${fmtDate(rolledDo)}`:"set do"}</button>
                <span style={{color:C.line2,fontSize:10,lineHeight:1}}>·</span>
                <span style={{...mono,fontSize:10,color:C.muted,lineHeight:1}}>{item.dueDate?`due ${fmtDate(item.dueDate)}`:"no due"}</span>
              </div>
            </div>

            {/* Row 4: status */}
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4,paddingLeft:18,alignItems:"center"}}>
              <StatusBadge status={item.status} waitingFor={item.waitingFor} small allStatuses={allStatuses}/>
            </div>

            {pct!==null&&<div style={{marginTop:8,paddingLeft:18}}><ProgressBar pct={pct}/></div>}
          </div>
          <div style={{display:"flex",gap:3,flexShrink:0,marginTop:2}}>
            <button onClick={()=>onAdd(item.id)} style={{background:"transparent",border:`1px solid ${C.line}`,color:C.muted,borderRadius:6,padding:"2px 7px",fontSize:12,cursor:"pointer"}}>+</button>
            <button onClick={()=>onEdit(item)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0}}>✎</button>
            <button onClick={()=>onDelete(item.id)} style={{background:"transparent",border:"none",color:C.muted,borderRadius:6,padding:"2px 5px",fontSize:14,cursor:"pointer"}}>×</button>
          </div>
        </div>
        {isExpanded&&children.length>0&&(
          <div style={{marginTop:6,marginLeft:depth*18+18,display:"flex",flexDirection:"column",gap:6}}>
            {children.map(child=><TreeItem key={child.id} item={child} items={items} allContexts={allContexts} allStatuses={allStatuses} depth={depth+1} onEdit={onEdit} onAdd={onAdd} onDelete={onDelete} onToggleSubtask={onToggleSubtask} expanded={expanded} onToggleExpand={onToggleExpand} onEditDoDate={onEditDoDate} onUpdate={onUpdate} onJumpTo={onJumpTo}/>)}
            <button onClick={()=>onAdd(item.id)} style={{display:"block",width:"100%",padding:"6px 0",background:"transparent",border:`1px dashed ${C.line2}`,borderRadius:6,fontSize:12,color:C.muted,cursor:"pointer",...sans,textAlign:"center"}}>+ Add inside {item.title}</button>
          </div>
        )}
      </div>
    );
  }

  // Task-level item — same card look as ActionRow (Today dashboard)
  const parent=items.find(x=>x.id===item.parentId);
  const grandparent=parent?items.find(x=>x.id===parent.parentId):null;
  return(
    <div style={{marginLeft:depth*18}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:item.linked?C.bg:C.white,border:`1px ${item.linked?"dashed":"solid"} ${C.line}`,borderRadius:10,opacity:isDone?0.6:item.linked?0.75:1,position:"relative"}}>
        <button onClick={()=>onToggleSubtask&&onUpdate&&onUpdate(item.id,{status:isDone?"actionable":"complete"})} style={{width:18,height:18,borderRadius:4,flexShrink:0,marginTop:3,cursor:"pointer",padding:0,border:`2px solid ${isDone?C.green:C.line2}`,background:isDone?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{isDone&&<span style={{color:"#fff",fontSize:10}}>✓</span>}</button>
        <TaskCardBody item={item} allContexts={allContexts} allStatuses={allStatuses} onEdit={onEdit} onUpdate={onUpdate} onJumpTo={onJumpTo} parent={parent} grandparent={grandparent} onToggleSubtask={onToggleSubtask}/>
        <div style={{display:"flex",gap:3,flexShrink:0,marginTop:2}}>
          <button onClick={()=>onAdd(item.id)} style={{background:"transparent",border:`1px solid ${C.line}`,color:C.muted,borderRadius:6,padding:"2px 7px",fontSize:12,cursor:"pointer"}}>+</button>
          <button onClick={()=>onEdit(item)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0}}>✎</button>
          <button onClick={()=>onDelete(item.id)} style={{background:"transparent",border:"none",color:C.muted,borderRadius:6,padding:"2px 5px",fontSize:14,cursor:"pointer"}}>×</button>
        </div>
      </div>
      {isExpanded&&children.length>0&&(
        <div style={{marginTop:6,marginLeft:18,display:"flex",flexDirection:"column",gap:6}}>
          {children.map(child=><TreeItem key={child.id} item={child} items={items} allContexts={allContexts} allStatuses={allStatuses} depth={depth+1} onEdit={onEdit} onAdd={onAdd} onDelete={onDelete} onToggleSubtask={onToggleSubtask} expanded={expanded} onToggleExpand={onToggleExpand} onEditDoDate={onEditDoDate} onUpdate={onUpdate} onJumpTo={onJumpTo}/>)}
        </div>
      )}
    </div>
  );
}

function DoDateModal({item,onSave,onClose}){
  const[doDate,setDoDate]=useState(item.doDate??"");
  return(
    <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:24,width:320,boxShadow:"0 8px 32px rgba(0,0,0,.15)",display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{...serifI,fontSize:20,color:C.ink}}>Set DO date</div><button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>×</button></div>
        <div style={{...sans,fontSize:13,color:C.muted}}>{item.title}</div>
        <input type="date" value={doDate} onChange={e=>setDoDate(e.target.value)} autoFocus style={{...mono,fontSize:14,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:8,padding:"8px 10px",outline:"none",width:"100%"}}/>
        <div style={{display:"flex",gap:8}}>{doDate&&<button onClick={()=>onSave(null)} style={{flex:1,background:"transparent",border:`1px solid ${C.line}`,borderRadius:8,padding:"8px 0",fontSize:12,cursor:"pointer",...sans,color:C.muted}}>Clear</button>}<button onClick={onClose} style={{flex:1,background:"transparent",border:`1px solid ${C.line}`,borderRadius:8,padding:"8px 0",fontSize:12,cursor:"pointer",...sans,color:C.muted}}>Cancel</button><button onClick={()=>onSave(doDate||null)} style={{flex:2,background:C.ink,color:C.white,border:"none",borderRadius:8,padding:"8px 0",fontSize:13,cursor:"pointer",...sans,fontWeight:600}}>Save</button></div>
      </div>
    </div>
  );
}

function ProjectPopup({projectId,items,allContexts,allStatuses,onClose,onEdit,onAdd,onDelete,onToggleSubtask,onEditDoDate,expanded,onToggleExpand,onUpdate,onJumpTo}){
  const project=items.find(x=>x.id===projectId);
  if(!project)return null;
  const pct=progressOf(items,projectId);
  const rolledDo=rollupDoDate(items,projectId);
  return(
    <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:16,width:"100%",maxWidth:620,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.2)",overflow:"hidden"}}>
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.line}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontSize:14,color:C.muted}}>◈</span><div style={{...serif,fontSize:22,color:C.ink,lineHeight:1.2}}>{project.title}</div></div>
              {project.description&&<div style={{...sans,fontSize:13,color:C.muted,marginTop:4,lineHeight:1.5}}>{project.description}</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8,alignItems:"center"}}>
                <StatusBadge status={project.status} waitingFor={project.waitingFor} allStatuses={allStatuses}/>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center",marginTop:6}}>
                <button onClick={()=>onEditDoDate(project)} style={{...mono,fontSize:10,cursor:"pointer",background:"transparent",border:"none",padding:0,color:C.muted,lineHeight:1}}>{project.doDate?`do ${fmtDate(project.doDate)}`:rolledDo?`do↑ ${fmtDate(rolledDo)}`:"set do"}</button>
                <span style={{color:C.line2,fontSize:10,lineHeight:1}}>·</span>
                <span style={{...mono,fontSize:10,color:C.muted,lineHeight:1}}>{project.dueDate?`due ${fmtDate(project.dueDate)}`:"no due"}</span>
              </div>
              {pct!==null&&<div style={{marginTop:10}}><ProgressBar pct={pct}/></div>}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}><button onClick={()=>onEdit(project)} style={{...sans,fontSize:12,background:"transparent",border:`1px solid ${C.line}`,borderRadius:7,padding:"5px 12px",cursor:"pointer",color:C.ink2}}>Edit</button><button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:0,lineHeight:1}}>×</button></div>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 20px",display:"flex",flexDirection:"column",gap:6}}>
          {getChildren(items,projectId).map(child=><TreeItem key={child.id} item={child} items={items} allContexts={allContexts} allStatuses={allStatuses} depth={0} onEdit={onEdit} onAdd={onAdd} onDelete={onDelete} onToggleSubtask={onToggleSubtask} expanded={expanded} onToggleExpand={onToggleExpand} onEditDoDate={onEditDoDate} onUpdate={onUpdate} onJumpTo={onJumpTo}/>)}
          <button onClick={()=>onAdd(projectId)} style={{width:"100%",padding:"8px 0",marginTop:4,background:"transparent",border:`1px dashed ${C.line2}`,borderRadius:8,fontSize:12,color:C.muted,cursor:"pointer",...sans}}>+ Add task</button>
        </div>
      </div>
    </div>
  );
}

function DashPanel({title,icon,items,allItems,allContexts,allStatuses,onEdit,onToggleStatus,onUpdate,onJumpTo,emptyMsg}){
  return(
    <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,display:"flex",flexDirection:"column",minHeight:200,overflow:"hidden"}}>
      <div style={{padding:"14px 16px 12px",borderBottom:`1px solid ${C.line}`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14}}>{icon}</span>
        <div style={{...mono,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600}}>{title}</div>
        <span style={{...mono,fontSize:10,color:C.muted,marginLeft:"auto"}}>{items.length}</span>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
        {items.length===0?<div style={{...serifI,fontSize:14,color:C.muted,textAlign:"center",padding:"20px 0"}}>{emptyMsg}</div>:items.map(item=><ActionRow key={item.id} item={item} items={allItems} allContexts={allContexts} allStatuses={allStatuses} onEdit={onEdit} onToggleStatus={onToggleStatus} onUpdate={onUpdate} onJumpTo={onJumpTo}/>)}
      </div>
    </div>
  );
}

function MilestonePanel({items,allContexts,allStatuses,onEdit,onEditDoDate,onUpdate}){
  const projects=items.filter(x=>x.type==="project"&&x.status!=="complete"&&x.status!=="someday");
  return(
    <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,display:"flex",flexDirection:"column",minHeight:200,overflow:"hidden"}}>
      <div style={{padding:"14px 16px 12px",borderBottom:`1px solid ${C.line}`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14}}>◈</span>
        <div style={{...mono,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600}}>Active Projects</div>
        <span style={{...mono,fontSize:10,color:C.muted,marginLeft:"auto"}}>{projects.length}</span>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
        {projects.length===0?<div style={{...serifI,fontSize:14,color:C.muted,textAlign:"center",padding:"20px 0"}}>No active projects</div>:projects.map(item=>{
          const pct=progressOf(items,item.id);
          const rolledDo=rollupDoDate(items,item.id);
          return(
            <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:C.white,border:`1px solid ${C.line}`,borderRadius:10}}>
              <div style={{width:18,flexShrink:0,marginTop:3,fontSize:12,color:C.muted,textAlign:"center"}}>◈</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                  <EditableText text={item.title} onSave={t=>onUpdate?onUpdate(item.id,{title:t}):onEdit&&onEdit({...item,title:t})} style={{...serif,fontSize:14,color:C.ink,flex:1}} />
                </div>
                <div style={{paddingLeft:18,marginTop:1}}>
                  {item.description&&<div style={{...mono,fontSize:9,color:C.muted,lineHeight:1.4,marginBottom:3}}>{item.description}</div>}
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                    <button onClick={()=>onEditDoDate(item)} style={{...mono,fontSize:10,cursor:"pointer",background:"transparent",border:"none",padding:0,color:C.muted,lineHeight:1}}>{item.doDate?`do ${fmtDate(item.doDate)}`:rolledDo?`do↑ ${fmtDate(rolledDo)}`:"set do"}</button>
                    <span style={{color:C.line2,fontSize:10,lineHeight:1}}>·</span>
                    <span style={{...mono,fontSize:10,color:C.muted,lineHeight:1}}>{item.dueDate?`due ${fmtDate(item.dueDate)}`:"no due"}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4,paddingLeft:18,alignItems:"center"}}>
                  <StatusBadge status={item.status} waitingFor={item.waitingFor} small allStatuses={allStatuses}/>
                </div>
                {pct!==null&&<div style={{marginTop:8,paddingLeft:18}}><ProgressBar pct={pct}/></div>}
              </div>
              <button onClick={()=>onEdit(item)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0,marginTop:2}}>✎</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsModal({contexts,statuses,onUpdateContext,onDeleteContext,onAddContext,onUpdateStatus,onDeleteStatus,onAddStatus,onClose}){
  const[tab,setTab]=useState("contexts");
  const COLORS=["#a04040","#b07030","#4a6fa5","#7a6fa0","#6a9ea0","#5a9e7a","#a06a7c","#7a8fa8","#8b8378","#5a8a4a","#c9a84c","#b07030"];

  function ColorPicker({value,onChange}){
    return(
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
        {COLORS.map(col=>(
          <button key={col} onClick={()=>onChange(col)}
            style={{width:20,height:20,borderRadius:999,background:col,border:value===col?`2px solid ${C.ink}`:`2px solid transparent`,cursor:"pointer",padding:0,flexShrink:0}}/>
        ))}
        <input type="color" value={value} onChange={e=>onChange(e.target.value)}
          style={{width:20,height:20,borderRadius:999,border:`2px solid ${C.line}`,cursor:"pointer",padding:0,background:"transparent"}}/>
      </div>
    );
  }

  function ContextRow({ctx,onUpdate,onDelete}){
    const[label,setLabel]=useState(ctx.label);
    const[color,setColor]=useState(ctx.color);
    const[open,setOpen]=useState(false);
    function commit(){onUpdate({...ctx,label:label.trim()||ctx.label,color});}
    return(
      <div style={{background:C.bg,borderRadius:8,border:`1px solid ${C.line}`,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px"}}>
          <button onClick={()=>setOpen(v=>!v)} style={{width:18,height:18,borderRadius:999,background:color,border:`2px solid ${C.line2}`,cursor:"pointer",padding:0,flexShrink:0}}/>
          <input value={label} onChange={e=>setLabel(e.target.value)} onBlur={commit} onKeyDown={e=>e.key==="Enter"&&commit()}
            style={{...sans,flex:1,fontSize:13,color:C.ink,background:"transparent",border:"none",outline:"none"}}/>
          <button onClick={onDelete} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>×</button>
        </div>
        {open&&<div style={{padding:"0 10px 10px"}}><ColorPicker value={color} onChange={c=>{setColor(c);onUpdate({...ctx,label:label.trim()||ctx.label,color:c});}}/></div>}
      </div>
    );
  }

  function StatusRow({s,onUpdate,onDelete,isDefault}){
    const[label,setLabel]=useState(s.label);
    const[color,setColor]=useState(s.color);
    const[open,setOpen]=useState(false);
    function commit(){onUpdate({...s,label:label.trim()||s.label,color});}
    return(
      <div style={{background:C.bg,borderRadius:8,border:`1px solid ${C.line}`,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px"}}>
          <button onClick={()=>setOpen(v=>!v)} style={{width:18,height:18,borderRadius:999,background:color,border:`2px solid ${C.line2}`,cursor:"pointer",padding:0,flexShrink:0}}/>
          <input value={label} onChange={e=>setLabel(e.target.value)} onBlur={commit} onKeyDown={e=>e.key==="Enter"&&commit()}
            style={{...sans,flex:1,fontSize:13,color:C.ink,background:"transparent",border:"none",outline:"none"}}/>
          {isDefault
            ?<span style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.5}}>default</span>
            :<button onClick={onDelete} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>×</button>}
        </div>
        {open&&<div style={{padding:"0 10px 10px"}}><ColorPicker value={color} onChange={c=>{setColor(c);onUpdate({...s,label:label.trim()||s.label,color:c});}}/></div>}
      </div>
    );
  }

  const DEFAULT_STATUS_KEYS=["actionable","complete"];

  return(
    <div style={{position:"fixed",inset:0,zIndex:700,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:16,width:"100%",maxWidth:480,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.line}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{...serifI,fontSize:22,color:C.ink}}>Settings</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:0,lineHeight:1}}>×</button>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${C.line}`}}>
          {["contexts","statuses"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px 0",fontSize:12,...sans,border:"none",cursor:"pointer",background:"transparent",color:tab===t?C.ink:C.muted,borderBottom:tab===t?`2px solid ${C.ink}`:"2px solid transparent",fontWeight:tab===t?500:400,textTransform:"capitalize"}}>
              {t}
            </button>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:6}}>
          {tab==="contexts"&&<>
            {contexts.map(ctx=>(
              <ContextRow key={ctx.key} ctx={ctx}
                onUpdate={updated=>onUpdateContext(updated)}
                onDelete={()=>onDeleteContext(ctx.key)}/>
            ))}
            <button onClick={onAddContext} style={{width:"100%",padding:"8px 0",background:"transparent",border:`1px dashed ${C.line2}`,borderRadius:8,fontSize:12,color:C.muted,cursor:"pointer",...sans,marginTop:4}}>+ Add context</button>
          </>}
          {tab==="statuses"&&<>
            {statuses.map(s=>(
              <StatusRow key={s.key} s={s} isDefault={DEFAULT_STATUS_KEYS.includes(s.key)}
                onUpdate={updated=>onUpdateStatus(updated)}
                onDelete={()=>onDeleteStatus(s.key)}/>
            ))}
            <button onClick={onAddStatus} style={{width:"100%",padding:"8px 0",background:"transparent",border:`1px dashed ${C.line2}`,borderRadius:8,fontSize:12,color:C.muted,cursor:"pointer",...sans,marginTop:4}}>+ Add status</button>
          </>}
        </div>
      </div>
    </div>
  );
}

export default function Focus(){
  const[items,setItems]=useState(SEED);
  const[contexts,setContexts]=useState(DEFAULT_CONTEXTS);
  const[statuses,setStatuses]=useState(STATUSES);
  const[view,setView]=useState("dashboard");
  const[form,setForm]=useState(null);
  const[expanded,setExpanded]=useState(()=>new Set(["m1","m2","m3","m4"]));
  const[doFilter,setDoFilter]=useState("today");
  const[ctxFilter,setCtxFilter]=useState([]);
  const[doDateModal,setDoDateModal]=useState(null);
  const[projectPopup,setProjectPopup]=useState(null);
  const[settingsOpen,setSettingsOpen]=useState(false);
  useEffect(()=>{ maintainRecurrenceWindows(); },[]);
  const[inboxText,setInboxText]=useState("");
  const[quickAdd,setQuickAdd]=useState(false);
  const[quickText,setQuickText]=useState("");

  function updateContext(ctx){setContexts(p=>p.map(x=>x.key===ctx.key?ctx:x));}
  function deleteContext(key){setContexts(p=>p.filter(x=>x.key!==key));}
  function addContext2(){const key=`ctx_${Date.now()}`;setContexts(p=>[...p,{key,label:"New context",color:"#8b8378"}]);}
  function updateStatus(s){setStatuses(p=>p.map(x=>x.key===s.key?s:x));}
  function deleteStatus(key){setStatuses(p=>p.filter(x=>x.key!==key));}
  function addStatus(){const key=`st_${Date.now()}`;setStatuses(p=>[...p,{key,label:"New status",color:"#8b8378"}]);}
  function maintainRecurrenceWindows(){
    setItems(prev=>{
      let result=[...prev];
      const today=todayS();
      result=result.map(x=>{
        if(x.recurrence&&!x.recurrence.seriesId){
          return {...x,recurrence:{...x.recurrence,seriesId:x.id}};
        }
        return x;
      });

      const additions=[];

      const fixedTasks=result.filter(x=>x.recurrence&&x.recurrence.trigger==="fixed"&&x.status!=="complete");
      const seenFixedSeries=new Set();
      for(const task of fixedTasks){
        const seriesId=task.recurrence.seriesId;
        if(seenFixedSeries.has(seriesId))continue;
        seenFixedSeries.add(seriesId);
        const window=task.recurrence.window||1;
        const seriesInstances=result.filter(x=>x.recurrence&&x.recurrence.seriesId===seriesId);
        const futureOrToday=seriesInstances.filter(x=>x.doDate>=today);
        const need=window-futureOrToday.length;
        if(need>0){
          const latest=[...seriesInstances].sort((a,b)=>(a.doDate||"").localeCompare(b.doDate||"")).slice(-1)[0]||task;
          let cursor=latest;
          for(let i=0;i<need;i++){
            const next=generateNextOccurrence(cursor);
            if(!next)break;
            next.recurrence.seriesId=seriesId;
            additions.push(next);
            cursor=next;
          }
        }
      }
      const passedFixed=result.filter(x=>x.recurrence&&x.recurrence.trigger==="fixed"&&x.doDate&&x.doDate<today);
      for(const task of passedFixed){
        const seriesId=task.recurrence.seriesId;
        const nextDo=computeNextDate(task.doDate,task.recurrence.do);
        const alreadyExists=result.some(x=>x.recurrence?.seriesId===seriesId&&x.doDate===nextDo)||additions.some(x=>x.recurrence?.seriesId===seriesId&&x.doDate===nextDo);
        if(!alreadyExists){
          const next=generateNextOccurrence(task);
          if(next){next.recurrence.seriesId=seriesId;additions.push(next);}
        }
      }

      const compTasks=result.filter(x=>x.recurrence&&x.recurrence.trigger==="completion");
      const seenCompSeries=new Set();
      for(const task of compTasks){
        const seriesId=task.recurrence.seriesId;
        if(seenCompSeries.has(seriesId))continue;
        seenCompSeries.add(seriesId);
        const window=task.recurrence.window||1;
        const seriesInstances=result.filter(x=>x.recurrence&&x.recurrence.seriesId===seriesId&&x.status!=="complete");
        const need=window-seriesInstances.length;
        if(need>0){
          const latest=[...seriesInstances].sort((a,b)=>(a.doDate||"").localeCompare(b.doDate||"")).slice(-1)[0]||task;
          let cursor=latest;
          for(let i=0;i<need;i++){
            const next=generateNextOccurrence(cursor);
            if(!next)break;
            next.recurrence.seriesId=seriesId;
            next.linked=true;
            additions.push(next);
            cursor=next;
          }
        }
      }

      if(additions.length===0&&result.length===prev.length)return prev;
      return [...result,...additions];
    });
  }

  function shiftLinkedDescendants(changedTask,oldDoDate,oldDueDate){
    if(!changedTask.recurrence||changedTask.recurrence.trigger!=="completion")return;
    const seriesId=changedTask.recurrence.seriesId;
    if(!seriesId)return;
    const doDelta=changedTask.doDate&&oldDoDate?(parseISO(changedTask.doDate)-parseISO(oldDoDate))/86400000:0;
    const dueDelta=changedTask.dueDate&&oldDueDate?(parseISO(changedTask.dueDate)-parseISO(oldDueDate))/86400000:0;
    if(doDelta===0&&dueDelta===0)return;
    setItems(prev=>prev.map(x=>{
      if(x.id===changedTask.id)return x;
      if(x.recurrence?.seriesId===seriesId&&x.linked){
        return {
          ...x,
          doDate:x.doDate&&doDelta?addDays(x.doDate,doDelta):x.doDate,
          dueDate:x.dueDate&&dueDelta?addDays(x.dueDate,dueDelta):x.dueDate,
        };
      }
      return x;
    }));
  }

  function captureQuick(e){
    if(e.key==="Escape"){setQuickAdd(false);setQuickText("");return;}
    if(e.key!=="Enter"||!quickText.trim())return;
    const newTask={id:nid(),type:"task",title:quickText.trim(),description:"",status:"actionable",contexts:[],parentId:null,dueDate:null,doDate:null,priority:null,size:null,waitingFor:"",subtasks:[]};
    setItems(p=>[newTask,...p]);
    setQuickText("");
    setQuickAdd(false);
  }

  function captureInbox(e){
    if(e.key!=="Enter"||!inboxText.trim())return;
    const newTask={id:nid(),type:"task",title:inboxText.trim(),description:"",status:"actionable",contexts:[],parentId:null,dueDate:null,doDate:null,priority:null,size:null,waitingFor:"",subtasks:[]};
    setItems(p=>[newTask,...p]);
    setInboxText("");
  }

  function jumpTo(id){let item=items.find(x=>x.id===id);while(item?.parentId){item=items.find(x=>x.id===item.parentId);}if(item)setProjectPopup(item.id);}
  function saveDoDate(item,date){setItems(p=>p.map(x=>x.id===item.id?{...x,doDate:date}:x));shiftLinkedDescendants({...item,doDate:date},item.doDate,item.dueDate);setDoDateModal(null);}
  function saveItem(item){setItems(p=>p.find(x=>x.id===item.id)?p.map(x=>x.id===item.id?item:x):[...p,item]);if(item.parentId)setExpanded(e=>{const n=new Set(e);n.add(item.parentId);return n;});setForm(null);if(item.recurrence&&(item.recurrence.trigger==="fixed"||item.recurrence.trigger==="completion")){maintainRecurrenceWindows();}}
  function deleteItem(id){if(!confirm("Delete this and all children?"))return;const d=new Set([id,...getDescendants(items,id).map(x=>x.id)]);setItems(p=>p.filter(x=>!d.has(x.id)));}
  function toggleSubtask(iid,sid){setItems(p=>p.map(x=>x.id!==iid?x:{...x,subtasks:x.subtasks.map(s=>s.id===sid?{...s,done:!s.done}:s)}));}
  function updateTask(id,patch){
    const before=items.find(x=>x.id===id);
    setItems(p=>p.map(x=>x.id!==id?x:{...x,...patch}));
    if(before&&("doDate" in patch||"dueDate" in patch)){
      const after={...before,...patch};
      shiftLinkedDescendants(after,before.doDate,before.dueDate);
    }
  }
  function toggleStatus(id){
    setItems(p=>{
      const task=p.find(x=>x.id===id);
      if(!task)return p;
      const willComplete=task.status!=="complete";
      let updated=p.map(x=>x.id!==id?x:{...x,status:willComplete?"complete":"actionable"});

      if(willComplete&&task.recurrence&&task.recurrence.trigger==="completion"){
        const seriesId=task.recurrence.seriesId;
        if(seriesId){
          const successors=updated
            .filter(x=>x.recurrence?.seriesId===seriesId&&x.linked&&x.status!=="complete")
            .sort((a,b)=>(a.doDate||"").localeCompare(b.doDate||""));
          if(successors.length>0){
            const lockId=successors[0].id;
            updated=updated.map(x=>x.id===lockId?{...x,linked:false}:x);
          }
        }
      }
      return updated;
    });
    const task=items.find(x=>x.id===id);
    if(task&&task.status!=="complete"&&task.recurrence&&task.recurrence.trigger==="completion"){
      maintainRecurrenceWindows();
    }
  }
  function toggleExpand(id){setExpanded(e=>{const n=new Set(e);n.has(id)?n.delete(id):n.add(id);return n;});}
  function addContext(ctx){setContexts(p=>p.find(x=>x.key===ctx.key)?p:[...p,ctx]);}
  function toggleCtxFilter(key){setCtxFilter(p=>p.includes(key)?p.filter(k=>k!==key):[...p,key]);}

  const today=todayS();
  const weekEnd=new Date();weekEnd.setDate(weekEnd.getDate()+7);
  const weekEndS=weekEnd.toISOString().slice(0,10);
  const PRI_ORDER={urgent:0,high:1,normal:2,low:3};
  const sortByPri=arr=>[...arr].sort((a,b)=>{const pa=PRI_ORDER[a.priority]??4,pb=PRI_ORDER[b.priority]??4;if(pa!==pb)return pa-pb;const ad=a.doDate??"9999",bd=b.doDate??"9999";return ad<bd?-1:ad>bd?1:0;});
  const allActions=items.filter(x=>x.type==="task");
  let filteredActions=allActions.filter(x=>{if(doFilter==="today")return x.doDate===today;if(doFilter==="week")return x.doDate&&x.doDate<=weekEndS;return true;});
  if(ctxFilter.length>0)filteredActions=filteredActions.filter(x=>ctxFilter.every(k=>x.contexts?.includes(k)));
  filteredActions=sortByPri(filteredActions);
  const dashActionable=sortByPri(allActions.filter(x=>x.doDate===today&&x.status==="actionable"));
  const dashNotActionable=sortByPri(allActions.filter(x=>x.doDate===today&&x.status!=="actionable"&&x.status!=="complete"));
  const roots=items.filter(x=>!x.parentId);
  const inboxItems=items.filter(x=>x.type==="task"&&!x.parentId&&!x.doDate&&x.status==="actionable");
  const openToday=allActions.filter(x=>x.doDate===today&&x.status!=="complete").length;

  return(
    <div style={{minHeight:"100vh",background:C.bg,...sans,color:C.ink}} onClick={e=>{if(quickAdd&&!e.target.closest("[data-quickadd]"))setQuickAdd(false);}}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
      <div style={{borderBottom:`1px solid ${C.line}`,padding:"16px 20px",background:C.white,display:"grid",gridTemplateColumns:"auto 1fr auto",alignItems:"center",gap:10}}>
        <div><div style={{...serifI,fontSize:32,color:C.ink,lineHeight:1}}>Focus</div><div style={{fontSize:12,color:C.muted,marginTop:3}}>{allActions.filter(x=>x.status!=="complete").length} open · {openToday} do today</div></div>
        <div style={{display:"flex",justifyContent:"center",width:"100%"}}>
          <div style={{display:"flex",border:`1px solid ${C.line}`,borderRadius:8,overflow:"hidden"}}>
            {[{key:"dashboard",label:"Today"},{key:"inbox",label:"Inbox"},{key:"plan",label:"◈ Plan"},{key:"do",label:"○ Do"}].map((v,i,arr)=><button key={v.key} onClick={()=>setView(v.key)} style={{padding:"7px 18px",fontSize:12,border:"none",cursor:"pointer",...sans,background:view===v.key?C.ink:"transparent",color:view===v.key?C.white:C.ink2,borderRight:i<arr.length-1?`1px solid ${C.line}`:"none"}}>{v.key==="inbox"?<>{v.label}{inboxItems.length>0&&<span style={{marginLeft:5,background:C.accent,color:C.white,borderRadius:999,fontSize:9,padding:"1px 5px",...mono}}>{inboxItems.length}</span>}</>:v.label}</button>)}
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"flex-end",flexWrap:"wrap"}}>
          <button onClick={()=>setSettingsOpen(true)} style={{background:"transparent",border:`1px solid ${C.line}`,color:C.muted,borderRadius:8,padding:"8px 12px",fontSize:14,cursor:"pointer",...sans}}>⚙</button>
          <div style={{position:"relative"}} data-quickadd="1">
            <button onClick={()=>{setQuickAdd(v=>!v);setQuickText("");}} style={{background:C.ink,color:C.white,border:"none",borderRadius:8,padding:"8px 18px",fontSize:13,cursor:"pointer",...sans,fontWeight:600}}>+ Add</button>
            {quickAdd&&(
              <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:200,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"10vh 16px 0"}} onClick={e=>{if(e.target===e.currentTarget)setQuickAdd(false);}}>
              <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,.15)",padding:"14px 16px",width:"100%",maxWidth:360,display:"flex",flexDirection:"column",gap:10}}>
                <input autoFocus value={quickText} onChange={e=>setQuickText(e.target.value)} onKeyDown={captureQuick}
                  placeholder="Task name... Enter to add"
                  style={{...serif,fontSize:16,color:C.ink,background:C.bg,border:`1px solid ${C.line}`,borderRadius:8,padding:"10px 12px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={()=>{setQuickAdd(false);setQuickText("");}} style={{flex:"1 1 80px",background:"transparent",border:`1px solid ${C.line}`,borderRadius:8,padding:"9px 0",fontSize:12,cursor:"pointer",...sans,color:C.muted}}>Cancel</button>
                  <button
                    disabled={!quickText.trim()}
                    onClick={()=>{
                      if(!quickText.trim())return;
                      const newTask={id:nid(),type:"task",title:quickText.trim(),description:"",status:"actionable",contexts:[],parentId:null,dueDate:null,doDate:null,priority:null,size:null,waitingFor:"",subtasks:[]};
                      setItems(p=>[newTask,...p]);
                      setQuickText("");
                      setQuickAdd(false);
                    }}
                    style={{flex:"1 1 110px",background:quickText.trim()?C.ink:C.line2,color:C.white,border:"none",borderRadius:8,padding:"9px 0",fontSize:12,cursor:quickText.trim()?"pointer":"default",...sans,fontWeight:600}}>
                    Add to Inbox
                  </button>
                  <button
                    disabled={!quickText.trim()}
                    onClick={()=>{
                      const newTask={id:nid(),type:"task",title:quickText.trim(),description:"",status:"actionable",contexts:[],parentId:null,dueDate:null,doDate:null,priority:null,size:null,waitingFor:"",subtasks:[]};
                      setItems(p=>[newTask,...p]);
                      setQuickText("");
                      setQuickAdd(false);
                      setForm({item:newTask});
                    }}
                    style={{flex:"1 1 90px",background:"transparent",border:`1px solid ${quickText.trim()?C.accent:C.line}`,borderRadius:8,padding:"9px 0",fontSize:11,cursor:quickText.trim()?"pointer":"default",...sans,color:quickText.trim()?C.accent:C.muted}}>
                    + Details
                  </button>
                </div>
              </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{padding:"20px 16px",maxWidth:1600,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
        {view==="dashboard"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:16,alignItems:"start"}}>
            <DashPanel title="Actionable Today" icon="○" items={dashActionable} allItems={items} allContexts={contexts} allStatuses={statuses} onEdit={item=>setForm({item})} onToggleStatus={toggleStatus} onUpdate={updateTask} onJumpTo={jumpTo} emptyMsg="Nothing actionable today"/>
            <DashPanel title="Not Actionable Today" icon="◌" items={dashNotActionable} allItems={items} allContexts={contexts} allStatuses={statuses} onEdit={item=>setForm({item})} onToggleStatus={toggleStatus} onUpdate={updateTask} onJumpTo={jumpTo} emptyMsg="Nothing else today"/>
            <MilestonePanel items={items} allContexts={contexts} allStatuses={statuses} onEdit={item=>setForm({item})} onEditDoDate={item=>setDoDateModal(item)} onUpdate={updateTask} />
          </div>
        )}
        {view==="inbox"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,padding:"16px 20px",display:"flex",gap:12,alignItems:"center"}}>
              <span style={{fontSize:16,color:C.muted}}>+</span>
              <input
                autoFocus
                value={inboxText}
                onChange={e=>setInboxText(e.target.value)}
                onKeyDown={captureInbox}
                placeholder="Capture a task... press Enter to add"
                style={{...serif,flex:1,fontSize:17,color:C.ink,background:"transparent",border:"none",outline:"none"}}
              />
            </div>

            {inboxItems.length===0?(
              <div style={{textAlign:"center",padding:"48px 0",color:C.muted}}>
                <div style={{...serifI,fontSize:22,marginBottom:8}}>Inbox is empty.</div>
                <div style={{fontSize:13}}>Type above and press Enter to capture a task.</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {inboxItems.map(item=>(
                  <div key={item.id} style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{flex:1}}>
                      <EditableText text={item.title} onSave={t=>updateTask(item.id,{title:t})} style={{...serif,fontSize:14,color:C.ink}} />
                    </div>
                    <button
                      onClick={()=>setForm({item})}
                      style={{...sans,fontSize:11,color:C.accent,background:`${C.accent}15`,border:`1px solid ${C.accent}40`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>
                      Process →
                    </button>
                    <button onClick={()=>deleteItem(item.id)}
                      style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:0,lineHeight:1}}>×</button>
                  </div>
                ))}
                <div style={{...mono,fontSize:10,color:C.muted,textAlign:"center",marginTop:4}}>
                  {inboxItems.length} unprocessed {inboxItems.length===1?"item":"items"}
                </div>
              </div>
            )}
          </div>
        )}

        {view==="plan"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {roots.map(item=><TreeItem key={item.id} item={item} items={items} allContexts={contexts} allStatuses={statuses} depth={0} onEdit={item=>setForm({item})} onAdd={pid=>setForm({item:{type:"task",parentId:pid,subtasks:[],contexts:[]}})} onDelete={deleteItem} onToggleSubtask={toggleSubtask} expanded={expanded} onToggleExpand={toggleExpand} onEditDoDate={item=>setDoDateModal(item)} onUpdate={updateTask} onJumpTo={jumpTo}/>)}
            {roots.length===0&&<div style={{textAlign:"center",padding:"48px 0",color:C.muted}}><div style={{...serifI,fontSize:22,marginBottom:8}}>Nothing here yet.</div></div>}
            <button onClick={()=>setForm({item:{type:"project",subtasks:[],contexts:[]}})} style={{width:"100%",padding:"10px 0",background:"transparent",border:`1px dashed ${C.line2}`,borderRadius:10,fontSize:13,color:C.muted,cursor:"pointer",...sans,marginTop:4}}>+ New project</button>
          </div>
        )}
        {view==="do"&&(
          <div>
            <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
              {[{key:"today",label:"Today"},{key:"week",label:"This week"},{key:"all",label:"All"}].map(f=><button key={f.key} onClick={()=>setDoFilter(f.key)} style={{padding:"6px 16px",fontSize:12,border:`1px solid ${doFilter===f.key?C.ink:C.line}`,borderRadius:999,cursor:"pointer",...sans,background:doFilter===f.key?C.ink:"transparent",color:doFilter===f.key?C.white:C.ink2}}>{f.label}{f.key==="today"&&openToday>0&&<span style={{...mono,fontSize:10,marginLeft:5,opacity:.6}}>{openToday}</span>}</button>)}
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16}}>
              {contexts.map(ctx=><button key={ctx.key} onClick={()=>toggleCtxFilter(ctx.key)} style={{padding:"3px 10px",fontSize:11,cursor:"pointer",...sans,border:`1px solid ${ctxFilter.includes(ctx.key)?C.ink:C.line}`,borderRadius:999,background:ctxFilter.includes(ctx.key)?C.bg2:"transparent",color:ctxFilter.includes(ctx.key)?C.ink2:C.muted}}>{ctx.label}</button>)}
              {ctxFilter.length>0&&<button onClick={()=>setCtxFilter([])} style={{padding:"3px 10px",fontSize:11,cursor:"pointer",...sans,border:`1px solid ${C.line}`,borderRadius:999,background:"transparent",color:C.muted}}>Clear</button>}
            </div>
            {filteredActions.length===0?<div style={{textAlign:"center",padding:"48px 0",color:C.muted}}><div style={{...serifI,fontSize:22,marginBottom:8}}>{doFilter==="today"?"Nothing scheduled for today.":"No items found."}</div></div>:<div style={{display:"flex",flexDirection:"column",gap:6}}>{filteredActions.map(item=><ActionRow key={item.id} item={item} items={items} allContexts={contexts} onEdit={item=>setForm({item})} onToggleStatus={toggleStatus} onUpdate={updateTask} onJumpTo={jumpTo} allStatuses={statuses}/>)}</div>}
          </div>
        )}
      </div>

      {settingsOpen&&<SettingsModal contexts={contexts} statuses={statuses} onUpdateContext={updateContext} onDeleteContext={deleteContext} onAddContext={addContext2} onUpdateStatus={updateStatus} onDeleteStatus={deleteStatus} onAddStatus={addStatus} onClose={()=>setSettingsOpen(false)}/>}
      {projectPopup&&<ProjectPopup projectId={projectPopup} items={items} allContexts={contexts} allStatuses={statuses} onClose={()=>setProjectPopup(null)} onEdit={item=>{setForm({item});setProjectPopup(null);}} onAdd={pid=>setForm({item:{type:"task",parentId:pid,subtasks:[],contexts:[]}})} onDelete={deleteItem} onToggleSubtask={toggleSubtask} onEditDoDate={item=>setDoDateModal(item)} expanded={expanded} onToggleExpand={toggleExpand} onUpdate={updateTask} onJumpTo={jumpTo}/>}
      {doDateModal&&<DoDateModal item={doDateModal} onSave={date=>saveDoDate(doDateModal,date)} onClose={()=>setDoDateModal(null)}/>}
      {form&&<ItemForm item={form.item} items={items} allContexts={contexts} allStatuses={statuses} onSave={saveItem} onClose={()=>setForm(null)} onAddContext={addContext}/>}
    </div>
  );
}