/* MYBODY 2.0 recovery layer: keeps food/workout entry usable and repairs older/multi-user state shapes. */
(function(){
  const KEY='decemberTracker.v1';
  const round=(n,d=0)=>Math.round(Number(n||0)*10**d)/10**d;
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
  const cmToIn=v=>Number(v)?round(Number(v)/2.54,1):0;

  function normalise(){
    try{
      if(typeof state==='undefined')return;
      state.weights=Array.isArray(state.weights)?state.weights:[];
      state.waist=Array.isArray(state.waist)?state.waist:[];
      state.abdomen=Array.isArray(state.abdomen)?state.abdomen:[];
      state.pantWaist=Array.isArray(state.pantWaist)?state.pantWaist:[];
      state.nutrition=state.nutrition||{};state.activity=state.activity||{};state.workoutLog=state.workoutLog||{};
      state.workouts=Array.isArray(state.workouts)?state.workouts:[];
      ['weights','waist','abdomen','pantWaist'].forEach(k=>state[k].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))));
      if(typeof selectedDay!=='undefined'&&state.workouts.length)selectedDay=Math.max(0,Math.min(Number(selectedDay)||0,state.workouts.length-1));
      localStorage.setItem(KEY,JSON.stringify(state));
    }catch(e){console.warn('State normalisation failed',e)}
  }

  // Fix empty food lookup accidentally matching the first database item.
  try{if(typeof findFood==='function'){const original=findFood;findFood=function(name){if(!String(name||'').trim())return null;return original(name)}}}catch{}

  // Progress works for weight loss, weight gain and maintenance goals.
  try{progressPct=function(){const start=Number(state.config?.startWeight),goal=Number(state.config?.goalWeight),now=Number(state.weights?.[0]?.weight)||start;if(!Number.isFinite(start)||!Number.isFinite(goal)||!Number.isFinite(now))return 0;if(start===goal)return Math.abs(now-goal)<0.05?100:0;return clamp(((now-start)/(goal-start))*100)}}catch{}

  try{renderProgressList=function(){normalise();const dates=[...new Set([...state.weights.map(x=>x.date),...state.abdomen.map(x=>x.date),...state.pantWaist.map(x=>x.date),...state.waist.map(x=>x.date)].filter(Boolean))].sort().reverse().slice(0,30),host=document.getElementById('progressList');if(!host)return;host.innerHTML=dates.length?dates.map(k=>{const w=state.weights.find(x=>x.date===k)?.weight,a=state.abdomen.find(x=>x.date===k),p=state.pantWaist.find(x=>x.date===k),legacy=state.waist.find(x=>x.date===k)?.value,parts=[];if(w)parts.push(`${Number(w).toFixed(1)} kg`);if(a)parts.push(`Belly ${a.inches||cmToIn(a.value)} in`);if(p)parts.push(`Waist ${p.inches||cmToIn(p.value)} in`);else if(legacy)parts.push(`${Number(legacy).toFixed(1)} cm`);return `<div class="list-row"><span>${new Date(k+'T00:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short'})}</span><strong>${parts.join(' • ')||'—'}</strong></div>`}).join(''):'<div class="list-row"><span>No measurements yet</span></div>'}}catch{}

  try{renderProgress=function(){normalise();const c=state.config||{},w=Number(state.weights?.[0]?.weight)||Number(c.startWeight)||0,start=Number(c.startWeight)||w,goal=Number(c.goalWeight)||w,pant=state.pantWaist?.[0],firstPant=state.pantWaist?.[state.pantWaist.length-1],legacy=state.waist?.[0]?.value,legacyFirst=state.waist?.[state.waist.length-1]?.value;const set=(id,text)=>{const e=document.getElementById(id);if(e)e.textContent=text};set('currentWeight',`${w.toFixed(1)} kg`);set('goalWeight',`${goal.toFixed(1)} kg`);const change=round(w-start,1);set('weightChange',`${change>0?'+':''}${change} kg from start`);const left=goal>=start?Math.max(0,round(goal-w,1)):Math.max(0,round(w-goal,1));set('weightRemaining',`${left} kg to go`);set('latestWaist',pant?`${pant.inches||cmToIn(pant.value)} in`:(legacy?`${Number(legacy).toFixed(1)} cm`:'—'));set('waistChange',pant&&firstPant?`${round((pant.inches||cmToIn(pant.value))-(firstPant.inches||cmToIn(firstPant.value)),1)} in from baseline`:(legacy&&legacyFirst?`${round(legacy-legacyFirst,1)} cm from baseline`:'No baseline yet'));set('progressPct',`${Math.round(progressPct())}%`);renderProgressList();if(typeof drawChart==='function')drawChart()}}catch{}

  function rerender(){
    normalise();
    try{if(typeof renderWorkout==='function'&&state.workouts?.length)renderWorkout()}catch(e){console.warn('Workout render recovery',e)}
    try{if(typeof renderFood==='function')renderFood()}catch(e){console.warn('Food render recovery',e)}
    try{if(typeof renderProgress==='function')renderProgress()}catch(e){console.warn('Progress render recovery',e)}
    setTimeout(()=>{try{window.workoutVideoReference?.decorate?.()}catch{}},0);
  }

  function ensureWorkoutVisible(){const list=document.getElementById('exerciseList');if(!list)return;normalise();if(list.children.length===0&&typeof renderWorkout==='function'&&state.workouts?.length){try{renderWorkout()}catch(e){console.warn(e)}}const save=document.getElementById('saveWorkout');if(save)save.style.display='block'}
  function ensureFoodVisible(){const mount=document.getElementById('mealSections');if(!mount)return;if(mount.children.length===0&&typeof renderFood==='function'){try{renderFood()}catch(e){console.warn(e)}}document.querySelectorAll('.add-food').forEach(b=>b.style.display='inline-flex')}

  function init(){normalise();rerender();ensureWorkoutVisible();ensureFoodVisible();document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>setTimeout(()=>{if(t.dataset.tab==='workout')ensureWorkoutVisible();if(t.dataset.tab==='food')ensureFoodVisible();if(t.dataset.tab==='progress'&&typeof renderProgress==='function')renderProgress()},20)));window.addEventListener('pageshow',()=>setTimeout(rerender,30))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();