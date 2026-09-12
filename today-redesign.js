(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
let wired=false,observer;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
function pctFromBar(bar){const raw=parseFloat(bar?.style?.width||'0');return Number.isFinite(raw)?Math.max(0,Math.min(100,raw)):0}
function syncRings(){
  [['.summary-calories','#scoreCaloriesBar'],['.summary-protein','#scoreProteinBar'],['.summary-steps','#scoreStepsBar'],['.summary-water','#scoreWaterBar']].forEach(([cardSel,barSel])=>{
    const card=$(cardSel,$('#today')),bar=$(barSel);if(!card||!bar)return;
    const p=Math.round(pctFromBar(bar));card.style.setProperty('--p',`${p}%`);card.dataset.pct=`${p}%`;
  });
}
function ensureSummaryHead(){
  const summary=$('#today .daily-summary');if(!summary)return;
  summary.classList.add('tr-dashboard');
  if(!$('.tr-summary-head',summary)){
    const head=document.createElement('div');head.className='tr-summary-head';
    head.innerHTML='<div><h3>Today at a glance</h3><p>Your actual progress against today’s targets</p></div><span>Target / Actual</span>';
    summary.prepend(head);
  }
}
function cleanCoach(){const card=$('#mybodyCoachCard');if(card)card.classList.add('tr-coach-compact')}
function cleanEnergy(){
  const card=$('#today .energy-overview');if(!card)return;card.classList.add('tr-energy-clean');
  const label=$('.energy-balance-summary>span',card);if(label&&label.textContent!=='Estimated energy balance')label.textContent='Estimated energy balance';
}
function localDate(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function dayNumber(date){const ms=new Date(`${date}T12:00:00`).getTime();return Number.isFinite(ms)?ms/86400000:null}
function mealsTotals(state,date){
  const totals={calories:0,protein:0,entries:0,mealSlots:0};
  const meals=state?.nutrition?.[date]?.meals||{};
  Object.values(meals).forEach(list=>{
    const items=Array.isArray(list)?list:[];
    if(items.length)totals.mealSlots++;
    items.forEach(food=>{totals.calories+=num(food?.calories);totals.protein+=num(food?.protein);totals.entries++});
  });
  return totals;
}
function workoutForDay(state,date){
  const sessions=state?.workoutLog?.[date];
  if(!sessions||typeof sessions!=='object')return {minutes:0,met:0,done:false};
  let minutes=0,met=0,done=false;
  Object.values(sessions).forEach(log=>{if(!log)return;const m=num(log.minutes);minutes+=m;met=Math.max(met,num(log.met,5.5));if(m>0||(log.exercises||[]).some(ex=>(ex?.setsDetail||[]).some(set=>set?.done)))done=true});
  return {minutes,met:met||5.5,done};
}
function weightTrend(rows){
  if(rows.length<2)return null;
  const first=rows[0].x,points=rows.map(r=>({x:r.x-first,y:r.weight}));
  const meanX=points.reduce((s,p)=>s+p.x,0)/points.length,meanY=points.reduce((s,p)=>s+p.y,0)/points.length;
  const variance=points.reduce((s,p)=>s+Math.pow(p.x-meanX,2),0);if(!variance)return 0;
  return clamp(points.reduce((s,p)=>s+(p.x-meanX)*(p.y-meanY),0)/variance,-1.5/7,1.5/7);
}
function isCompleteFoodDay(food,targetCalories){
  if(!food||food.calories<=0)return false;
  if(!targetCalories)return food.entries>=3||food.mealSlots>=2;
  const floor=Math.max(800,targetCalories*.55);
  return food.calories>=floor&&(food.entries>=3||food.mealSlots>=2);
}
function expectedWeight(){
  const Store=window.MyBodyStore;if(!Store)return null;
  const state=Store.read(),today=localDate(),todayN=dayNumber(today),byDate=new Map();
  (state.weights||[]).forEach(entry=>{const date=String(entry?.date||''),weight=num(entry?.weight);if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<=today&&weight>0)byDate.set(date,weight)});
  const allRows=[...byDate].map(([date,weight])=>({date,weight,x:dayNumber(date)})).filter(x=>x.x!==null).sort((a,b)=>a.x-b.x);
  const rows=allRows.slice(-12),latest=allRows.at(-1);
  if(!latest)return {value:null,count:0,suggestions:['Add your first weight log to start personalised projections.']};

  const cfg=state.config||{},targetCalories=num(cfg.calories),targetProtein=num(cfg.protein),targetSteps=num(cfg.steps),weight=latest.weight;
  const bmr=Math.max(800,10*weight+6.25*num(cfg.height,175)-5*num(cfg.age,40)+(cfg.sex==='female'?-161:5));
  let loggedDays=0,foodDays=0,completeFoodDays=0,incompleteFoodDays=0,activityDays=0,intakeSum=0,proteinDays=0,stepDays=0,workoutDays=0,deficitSum=0,stepSum=0,proteinSum=0;
  for(let offset=1;offset<=14;offset++){
    const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-offset);const key=localDate(d);
    const food=mealsTotals(state,key),activity=state?.activity?.[key]||{},steps=num(activity.steps),workout=workoutForDay(state,key);
    const hasFood=food.calories>0,hasActivity=steps>0||workout.done,completeFood=isCompleteFoodDay(food,targetCalories);
    if(!hasFood&&!hasActivity)continue;
    loggedDays++;
    if(hasFood){
      foodDays++;
      if(completeFood){
        completeFoodDays++;intakeSum+=food.calories;proteinSum+=food.protein;
        if(targetProtein&&food.protein>=targetProtein*.9)proteinDays++;
        const base=bmr*1.2,stepBurn=steps*weight*.0005,exerciseBurn=workout.minutes*workout.met*3.5*weight/200;
        deficitSum+=base+stepBurn+exerciseBurn-food.calories;
      }else incompleteFoodDays++;
    }
    if(steps>0){activityDays++;stepSum+=steps;if(targetSteps&&steps>=targetSteps*.9)stepDays++}
    if(workout.done)workoutDays++;
  }
  const weightSlope=weightTrend(rows);
  const energySlope=completeFoodDays>=3?-(deficitSum/Math.max(1,completeFoodDays))/7700:null;
  let projectedSlope=weightSlope;
  if(projectedSlope===null)projectedSlope=energySlope;
  else if(energySlope!==null)projectedSlope=projectedSlope*.75+energySlope*.25;
  if(projectedSlope===null)projectedSlope=0;
  projectedSlope=clamp(projectedSlope,-1.25/7,1.25/7);
  const elapsed=Math.max(0,todayN-latest.x);
  const value=Math.round(clamp(latest.weight+projectedSlope*elapsed,latest.weight-2,latest.weight+2)*10)/10;

  const goalWeight=num(cfg.goalWeight),goalDate=String(cfg.goalDate||''),goalN=dayNumber(goalDate),daysToGoal=goalN&&goalN>todayN?goalN-todayN:null;
  const expectedAtGoal=daysToGoal?value+projectedSlope*daysToGoal:null;
  const neededSlope=daysToGoal&&goalWeight?((goalWeight-value)/daysToGoal):null;
  const avgIntake=completeFoodDays?intakeSum/completeFoodDays:0,avgSteps=activityDays?stepSum/activityDays:0,avgProtein=completeFoodDays?proteinSum/completeFoodDays:0;
  const suggestions=[];
  let status='Building your trend';
  if(daysToGoal&&goalWeight){
    const gap=expectedAtGoal-goalWeight;
    if(Math.abs(gap)<=1)status='On track';
    else if((goalWeight<value&&gap>1)||(goalWeight>value&&gap<-1))status='Slower than target';
    else status='Ahead of target';
  }
  if(incompleteFoodDays>0)suggestions.push(`${incompleteFoodDays} recent food log${incompleteFoodDays===1?' looks':'s look'} incomplete. MYBODY excludes ${incompleteFoodDays===1?'it':'them'} from calorie/protein averages so partial logging does not create a false deficit.`);
  if(completeFoodDays<4)suggestions.push('Complete at least 4 full food-log days so calorie and protein coaching becomes reliable. Include oils/ghee, drinks, snacks and all meals.');
  if(targetCalories&&avgIntake>targetCalories*1.08)suggestions.push(`On complete days, intake averages about ${Math.round(avgIntake-targetCalories)} kcal above target. Keep most days closer to ${Math.round(targetCalories)} kcal.`);
  if(targetCalories&&avgIntake>0&&avgIntake<targetCalories*.82)suggestions.push('Complete logged days are well below the calorie target. Avoid an unnecessarily aggressive deficit and check that cooking fats and portions are fully captured.');
  if(targetProtein&&avgProtein>0&&avgProtein<targetProtein*.9)suggestions.push(`Protein is averaging ${Math.round(avgProtein)} g on complete days. Aim closer to ${Math.round(targetProtein)} g to support training and lean mass.`);
  if(targetSteps&&avgSteps>0&&avgSteps<targetSteps*.9)suggestions.push(`Steps are averaging ${Math.round(avgSteps).toLocaleString()} on synced days. Work gradually toward ${Math.round(targetSteps).toLocaleString()} for better activity consistency.`);
  if(activityDays<4)suggestions.push('Step data is missing on several recent days. Keep phone step sync working so low activity is not confused with missing data.');
  if(workoutDays<Math.min(3,Math.max(1,Math.round(num(cfg.daysPerWeek,4)*.6))))suggestions.push('Workout frequency has been low recently. Prioritise the planned sessions you can recover from.');
  if(weightSlope!==null&&neededSlope!==null&&goalWeight<value&&weightSlope>neededSlope*.65)suggestions.push('Scale progress is slower than the pace needed for the goal date. Tighten calorie, step and workout consistency for the next 7 days before changing targets.');
  if(!suggestions.length)suggestions.push('Execution is consistent. Keep the current calorie, protein, step and workout routine and judge progress from the 7-day weight trend.');
  const foodAdherence=completeFoodDays?Math.round(proteinDays/completeFoodDays*100):0;
  const stepAdherence=activityDays?Math.round(stepDays/activityDays*100):0;
  return {value,count:rows.length,weekly:Math.round(projectedSlope*70)/10,status,suggestions:suggestions.slice(0,4),loggedDays,foodDays,completeFoodDays,incompleteFoodDays,activityDays,avgIntake,avgProtein,avgSteps,proteinDays,stepDays,foodAdherence,stepAdherence,workoutDays,goalWeight,goalDate,expectedAtGoal:expectedAtGoal===null?null:Math.round(expectedAtGoal*10)/10};
}
function todayExecution(){
  const Store=window.MyBodyStore;if(!Store)return null;
  const state=Store.read(),cfg=state.config||{},key=localDate(),food=mealsTotals(state,key),steps=num(state?.activity?.[key]?.steps),workout=workoutForDay(state,key);
  const calories=num(cfg.calories),protein=num(cfg.protein),stepTarget=num(cfg.steps),hour=new Date().getHours();
  const messages=[];
  if(hour>=20&&food.calories>0&&!isCompleteFoodDay(food,calories))messages.push('Food log looks incomplete. Add missing meals, oils/ghee, drinks and snacks before MYBODY judges today.');
  if(hour>=19&&protein&&food.protein<protein*.75)messages.push(`Protein is behind today (${Math.round(food.protein)} / ${Math.round(protein)} g). Add a lean protein serving or your planned whey if it fits your calories.`);
  if(hour>=19&&stepTarget&&steps>0&&steps<stepTarget*.7)messages.push(`Activity is low today (${Math.round(steps).toLocaleString()} steps). Add comfortable movement only if your leg feels good.`);
  if(!messages.length){
    if(hour<18)messages.push('Day in progress. Keep logging as you eat so the evening coach can audit the full day.');
    else messages.push('Today is tracking normally so far. Finish logging everything before bed.');
  }
  return {food,steps,workout,messages:messages.slice(0,2),calories,protein,stepTarget};
}
function ensureForecastStyles(){
  if($('#trForecastStackStyles'))return;
  const style=document.createElement('style');style.id='trForecastStackStyles';style.textContent=`
  #today .tr-expected-weight{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;margin:-2px 0 14px!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important}
  #today .tr-forecast-card{display:block;min-width:0;padding:14px 15px;border:1px solid color-mix(in srgb,var(--accent) 24%,var(--line));border-radius:16px;background:linear-gradient(120deg,color-mix(in srgb,var(--accent-soft) 46%,var(--card)),var(--card));box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 6%,transparent)}
  #today .tr-forecast-label{display:block;margin-bottom:5px;color:var(--muted);font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
  #today .tr-forecast-value{display:block;color:var(--accent);font-size:clamp(28px,7vw,36px);line-height:1.02;letter-spacing:-.035em}
  #today .tr-forecast-meta{display:block;margin-top:7px;color:var(--muted);font-size:12px;line-height:1.45}
  #today .tr-projected-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
  #today .tr-projected-date{margin-top:4px;color:var(--text);font-size:14px;font-weight:800}
  #today .tr-status-pill{flex:none;padding:6px 9px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--line));border-radius:999px;background:color-mix(in srgb,var(--accent-soft) 65%,transparent);color:var(--accent);font-size:10px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
  #today .tr-forecast-factors{margin-top:9px;color:var(--muted);font-size:11px;font-weight:750;line-height:1.4}
  #today .tr-focus-list{display:grid;gap:8px;margin:8px 0 0;padding:0;list-style:none}
  #today .tr-focus-list li{position:relative;padding-left:17px;color:var(--text);font-size:14px;line-height:1.45}
  #today .tr-focus-list li:before{content:'•';position:absolute;left:2px;top:-1px;color:var(--accent);font-size:18px;font-weight:900}
  #today .tr-audit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:9px}
  #today .tr-audit-cell{padding:9px 10px;border:1px solid var(--line);border-radius:11px;background:color-mix(in srgb,var(--card) 82%,transparent)}
  #today .tr-audit-cell strong{display:block;color:var(--text);font-size:15px}.tr-audit-cell span{display:block;margin-top:2px;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
  #today .tr-daily-message{margin:7px 0 0;color:var(--text);font-size:13px;line-height:1.45}
  @media(max-width:430px){#today .tr-forecast-card{padding:13px 14px}#today .tr-forecast-value{font-size:30px}#today .tr-focus-list li{font-size:13px}}
  `;document.head.appendChild(style);
}
function renderExpectedWeight(card,h){
  ensureForecastStyles();
  let box=$('.tr-expected-weight',card);if(!box){box=document.createElement('div');box.className='tr-expected-weight';h.insertAdjacentElement('afterend',box)}
  const result=expectedWeight();
  if(!result||result.value===null){box.innerHTML='<section class="tr-forecast-card"><span class="tr-forecast-label">Expected weight today</span><strong class="tr-forecast-value">—</strong><small class="tr-forecast-meta">Add weight logs to start the forecast.</small></section>';return}
  const today=todayExecution();
  const trend=result.weekly===0?'Stable trend':`${result.weekly>0?'+':''}${result.weekly.toFixed(1)} kg/week trend`;
  const projection=result.expectedAtGoal!==null?`${result.expectedAtGoal.toFixed(1)} kg`:'—';
  const projectionDate=result.expectedAtGoal!==null&&result.goalDate?`by ${result.goalDate}`:`${result.loggedDays} recent logged days analysed`;
  const dailyMetrics=today?`<div class="tr-audit-grid"><div class="tr-audit-cell"><strong>${Math.round(today.food.calories)}${today.calories?' / '+Math.round(today.calories):''}</strong><span>kcal today</span></div><div class="tr-audit-cell"><strong>${Math.round(today.food.protein)}${today.protein?' / '+Math.round(today.protein):''} g</strong><span>protein</span></div><div class="tr-audit-cell"><strong>${Math.round(today.steps).toLocaleString()}${today.stepTarget?' / '+Math.round(today.stepTarget).toLocaleString():''}</strong><span>steps</span></div><div class="tr-audit-cell"><strong>${today.workout.done?'Done':'Not logged'}</strong><span>workout</span></div></div>${today.messages.map(x=>`<p class="tr-daily-message">${x}</p>`).join('')}`:'';
  box.innerHTML=`
    <section class="tr-forecast-card tr-daily-card">
      <span class="tr-forecast-label">Today execution check</span>
      ${dailyMetrics}
    </section>
    <section class="tr-forecast-card tr-expected-card">
      <span class="tr-forecast-label">Expected weight today</span>
      <strong class="tr-forecast-value">${result.value.toFixed(1)} kg</strong>
      <small class="tr-forecast-meta">${trend} · based on weight, complete food logs, activity and training history</small>
    </section>
    <section class="tr-forecast-card tr-projected-card">
      <div class="tr-projected-head"><div><span class="tr-forecast-label">Projected weight</span><strong class="tr-forecast-value">${projection}</strong><div class="tr-projected-date">${projectionDate}</div></div><span class="tr-status-pill">${result.status}</span></div>
      <div class="tr-forecast-factors">Partial food logs are excluded from deficit estimates</div>
    </section>
    <section class="tr-forecast-card tr-audit-card">
      <span class="tr-forecast-label">14-day execution audit</span>
      <div class="tr-audit-grid">
        <div class="tr-audit-cell"><strong>${result.completeFoodDays} / ${result.foodDays}</strong><span>complete food logs</span></div>
        <div class="tr-audit-cell"><strong>${result.proteinDays} / ${result.completeFoodDays}</strong><span>protein-target days</span></div>
        <div class="tr-audit-cell"><strong>${result.stepDays} / ${result.activityDays}</strong><span>step-target days</span></div>
        <div class="tr-audit-cell"><strong>${result.workoutDays}</strong><span>workouts</span></div>
      </div>
    </section>
    <section class="tr-forecast-card tr-focus-card">
      <span class="tr-forecast-label">What went wrong / what to do next</span>
      <ul class="tr-focus-list">${result.suggestions.map(x=>`<li>${x}</li>`).join('')}</ul>
    </section>`;
}
function cleanQuickUpdate(){const card=$('#today .form-card');if(!card)return;card.classList.add('tr-quick-update');const h=$('h3',card);if(h){h.textContent='MYBODY execution coach';renderExpectedWeight(card,h)}}
function cleanWeekly(){const grid=$('#today .insight-grid');if(grid)grid.classList.add('tr-weekly')}
function refresh(){
  const today=$('#today');if(!today)return;today.classList.add('tr-today');
  ensureSummaryHead();cleanCoach();cleanEnergy();cleanQuickUpdate();cleanWeekly();syncRings();
}
function wire(){
  if(wired)return;wired=true;
  window.addEventListener('mybody:state',()=>setTimeout(refresh,50));
  document.addEventListener('input',e=>{if(e.target.closest('#today'))setTimeout(refresh,40)},true);
  document.addEventListener('click',e=>{if(e.target.closest('[data-tab="today"],[data-nav="today"],[data-coach-action],#saveDaily,#saveWorkout'))setTimeout(refresh,80)},true);
  const today=$('#today');if(today){observer=new MutationObserver(()=>requestAnimationFrame(syncRings));observer.observe(today,{subtree:true,attributes:true,attributeFilter:['style']})}
}
document.addEventListener('DOMContentLoaded',()=>{refresh();wire();setTimeout(refresh,180)});
if(document.readyState!=='loading'){refresh();wire();setTimeout(refresh,180)}
})();