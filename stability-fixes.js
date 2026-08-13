/* MYBODY 2.0 stability layer: protects personalised plans, progress maths and recovery from older data shapes. */
(function(){
  const KEY='decemberTracker.v1';
  const q=s=>document.querySelector(s);
  const round=(n,d=0)=>Math.round(Number(n||0)*10**d)/10**d;
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
  const inFromCm=v=>Number(v)?round(Number(v)/2.54,1):0;

  function normaliseState(){
    if(typeof state==='undefined')return;
    state.weights=Array.isArray(state.weights)?state.weights:[];
    state.waist=Array.isArray(state.waist)?state.waist:[];
    state.abdomen=Array.isArray(state.abdomen)?state.abdomen:[];
    state.pantWaist=Array.isArray(state.pantWaist)?state.pantWaist:[];
    state.nutrition=state.nutrition||{};
    state.activity=state.activity||{};
    state.workoutLog=state.workoutLog||{};
    state.workouts=Array.isArray(state.workouts)?state.workouts:[];
    state.weights.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    state.waist.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    state.abdomen.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    state.pantWaist.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    if(typeof selectedDay!=='undefined'){
      const max=Math.max(0,state.workouts.length-1);
      selectedDay=Math.max(0,Math.min(Number(selectedDay)||0,max));
    }
  }

  // Empty food names must never resolve to the first database food.
  if(typeof findFood==='function'){
    const originalFindFood=findFood;
    findFood=function(name){if(!String(name||'').trim())return null;return originalFindFood(name)};
  }

  // Correct progress for both weight-loss and weight-gain goals and avoid divide-by-zero on maintenance plans.
  progressPct=function(){
    if(typeof state==='undefined')return 0;
    const start=Number(state.config?.startWeight),goal=Number(state.config?.goalWeight),now=Number(state.weights?.[0]?.weight)||start;
    if(!Number.isFinite(start)||!Number.isFinite(goal)||!Number.isFinite(now))return 0;
    if(start===goal)return Math.abs(now-goal)<0.05?100:0;
    return clamp(((now-start)/(goal-start))*100);
  };

  renderProgress=function(){
    normaliseState();
    const c=state.config||{},w=Number(state.weights?.[0]?.weight)||Number(c.startWeight)||0,start=Number(c.startWeight)||w,goal=Number(c.goalWeight)||w;
    const legacyLatest=state.waist?.[0]?.value,legacyFirst=state.waist?.[state.waist.length-1]?.value;
    const current=q('#currentWeight'),goalEl=q('#goalWeight'),change=q('#weightChange'),remaining=q('#weightRemaining'),latestWaist=q('#latestWaist'),waistChange=q('#waistChange'),pct=q('#progressPct');
    if(current)current.textContent=`${w.toFixed(1)} kg`;
    if(goalEl)goalEl.textContent=`${goal.toFixed(1)} kg`;
    if(change){const d=round(w-start,1);change.textContent=`${d>0?'+':''}${d} kg from start`}
    if(remaining){const left=goal>=start?Math.max(0,round(goal-w,1)):Math.max(0,round(w-goal,1));remaining.textContent=`${left} kg to go`}
    const pant=state.pantWaist?.[0];
    if(latestWaist)latestWaist.textContent=pant?`${pant.inches||inFromCm(pant.value)} in`:(legacyLatest?`${Number(legacyLatest).toFixed(1)} cm`:'—');
    if(waistChange){
      const firstPant=state.pantWaist?.[state.pantWaist.length-1];
      if(pant&&firstPant)waistChange.textContent=`${round((pant.inches||inFromCm(pant.value))-(firstPant.inches||inFromCm(firstPant.value)),1)} in from baseline`;
      else waistChange.textContent=legacyLatest&&legacyFirst?`${round(legacyLatest-legacyFirst,1)} cm from baseline`:'No baseline yet';
    }
    if(pct)pct.textContent=`${Math.round(progressPct())}%`;
    if(typeof renderProgressList==='function')renderProgressList();
    if(typeof drawChart==='function')drawChart();
  };

  renderProgressList=function(){
    normaliseState();
    const dates=[...new Set([
      ...state.weights.map(x=>x.date),...state.abdomen.map(x=>x.date),...state.pantWaist.map(x=>x.date),...state.waist.map(x=>x.date)
    ].filter(Boolean))].sort().reverse().slice(0,30);
    const host=q('#progressList');if(!host)return;
    host.innerHTML=dates.length?dates.map(k=>{
      const w=state.weights.find(x=>x.date===k)?.weight;
      const a=state.abdomen.find(x=>x.date===k);const p=state.pantWaist.find(x=>x.date===k);const legacy=state.waist.find(x=>x.date===k)?.value;
      const measurements=[];
      if(w)measurements.push(`${Number(w).toFixed(1)} kg`);
      if(a)measurements.push(`Belly ${a.inches||inFromCm(a.value)} in`);
      if(p)measurements.push(`Waist ${p.inches||inFromCm(p.value)} in`);
      else if(legacy)measurements.push(`${Number(legacy).toFixed(1)} cm`);
      return `<div class="list-row"><span>${new Date(k+'T00:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short'})}</span><strong>${measurements.join(' • ')||'—'}</strong></div>`;
    }).join(''):'<div class="list-row"><span>No measurements yet</span></div>';
  };

  function safeWorkoutRecovery(){
    if(typeof state==='undefined'||!Array.isArray(state.workouts)||!state.workouts.length)return;
    normaliseState();
    try{if(typeof renderWorkout==='function')renderWorkout()}catch(e){console.warn('MYBODY workout recovery',e)}
  }

  function init(){
    normaliseState();
    try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}
    try{if(typeof renderAll==='function')renderAll()}catch(e){console.warn('MYBODY render recovery',e);safeWorkoutRecovery()}
    document.querySelector('[data-tab="workout"]')?.addEventListener('click',()=>setTimeout(safeWorkoutRecovery,0));
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();