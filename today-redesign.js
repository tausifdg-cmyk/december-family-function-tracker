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
  const totals={calories:0,protein:0};
  const meals=state?.nutrition?.[date]?.meals||{};
  Object.values(meals).flat().forEach(food=>{totals.calories+=num(food?.calories);totals.protein+=num(food?.protein)});
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
function expectedWeight(){
  const Store=window.MyBodyStore;if(!Store)return null;
  const state=Store.read(),today=localDate(),todayN=dayNumber(today),byDate=new Map();
  (state.weights||[]).forEach(entry=>{const date=String(entry?.date||''),weight=num(entry?.weight);if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<=today&&weight>0)byDate.set(date,weight)});
  const allRows=[...byDate].map(([date,weight])=>({date,weight,x:dayNumber(date)})).filter(x=>x.x!==null).sort((a,b)=>a.x-b.x);
  const rows=allRows.slice(-12),latest=allRows.at(-1);
  if(!latest)return {value:null,count:0,suggestions:['Add your first weight log to start personalised projections.']};

  const cfg=state.config||{},targetCalories=num(cfg.calories),targetProtein=num(cfg.protein),targetSteps=num(cfg.steps),weight=latest.weight;
  const bmr=Math.max(800,10*weight+6.25*num(cfg.height,175)-5*num(cfg.age,40)+(cfg.sex==='female'?-161:5));
  let loggedDays=0,intakeSum=0,proteinDays=0,stepDays=0,workoutDays=0,deficitSum=0,stepSum=0,proteinSum=0;
  for(let offset=1;offset<=14;offset++){
    const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-offset);const key=localDate(d);
    const food=mealsTotals(state,key),activity=state?.activity?.[key]||{},steps=num(activity.steps),workout=workoutForDay(state,key);
    const hasFood=food.calories>0,hasActivity=steps>0||workout.done;
    if(!hasFood&&!hasActivity)continue;
    loggedDays++;
    if(hasFood){intakeSum+=food.calories;proteinSum+=food.protein;if(targetProtein&&food.protein>=targetProtein*.9)proteinDays++}
    if(targetSteps&&steps>=targetSteps*.9)stepDays++;
    if(workout.done)workoutDays++;
    stepSum+=steps;
    if(hasFood){const base=bmr*1.2,stepBurn=steps*weight*.0005,exerciseBurn=workout.minutes*workout.met*3.5*weight/200;deficitSum+=base+stepBurn+exerciseBurn-food.calories}
  }
  const weightSlope=weightTrend(rows);
  const energySlope=loggedDays>=3?-(deficitSum/Math.max(1,loggedDays))/7700:null;
  let projectedSlope=weightSlope;
  if(projectedSlope===null)projectedSlope=energySlope;
  else if(energySlope!==null)projectedSlope=projectedSlope*.65+energySlope*.35;
  if(projectedSlope===null)projectedSlope=0;
  projectedSlope=clamp(projectedSlope,-1.25/7,1.25/7);
  const elapsed=Math.max(0,todayN-latest.x);
  const value=Math.round(clamp(latest.weight+projectedSlope*elapsed,latest.weight-2,latest.weight+2)*10)/10;

  const goalWeight=num(cfg.goalWeight),goalDate=String(cfg.goalDate||''),goalN=dayNumber(goalDate),daysToGoal=goalN&&goalN>todayN?goalN-todayN:null;
  const expectedAtGoal=daysToGoal?value+projectedSlope*daysToGoal:null;
  const neededSlope=daysToGoal&&goalWeight?((goalWeight-value)/daysToGoal):null;
  const avgIntake=loggedDays?intakeSum/loggedDays:0,avgSteps=loggedDays?stepSum/loggedDays:0,avgProtein=loggedDays?proteinSum/loggedDays:0;
  const suggestions=[];
  let status='Building your trend';
  if(daysToGoal&&goalWeight){
    const gap=expectedAtGoal-goalWeight;
    if(Math.abs(gap)<=1)status='On track';
    else if((goalWeight<value&&gap>1)||(goalWeight>value&&gap<-1))status='Slower than target';
    else status='Ahead of target';
  }
  if(loggedDays<4)suggestions.push('Log food, steps and workouts on more days so the forecast becomes more reliable.');
  if(targetCalories&&avgIntake>targetCalories*1.08)suggestions.push(`Average intake is about ${Math.round(avgIntake-targetCalories)} kcal above target. Keep most days closer to ${Math.round(targetCalories)} kcal.`);
  if(targetCalories&&avgIntake>0&&avgIntake<targetCalories*.82)suggestions.push('Recent intake is well below target. Avoid an overly aggressive deficit and focus on consistent days.');
  if(targetProtein&&avgProtein>0&&avgProtein<targetProtein*.9)suggestions.push(`Protein is averaging ${Math.round(avgProtein)} g/day. Aim closer to ${Math.round(targetProtein)} g to support training and lean mass.`);
  if(targetSteps&&avgSteps>0&&avgSteps<targetSteps*.9)suggestions.push(`Steps are averaging ${Math.round(avgSteps).toLocaleString()} per day. Work toward ${Math.round(targetSteps).toLocaleString()} for better activity consistency.`);
  if(workoutDays<Math.min(3,Math.max(1,Math.round(num(cfg.daysPerWeek,4)*.6))))suggestions.push('Workout frequency has been low recently. Prioritise the planned sessions you can recover from.');
  if(weightSlope!==null&&neededSlope!==null&&goalWeight<value&&weightSlope>neededSlope*.65)suggestions.push('Scale progress is slower than the pace needed for the goal date. Tighten calorie, step and workout consistency for the next 7 days before changing targets.');
  if(!suggestions.length)suggestions.push('Keep your current calorie, protein, step and workout routine consistent. Your recent pattern supports the target trajectory.');
  return {value,count:rows.length,weekly:Math.round(projectedSlope*70)/10,status,suggestions:suggestions.slice(0,3),loggedDays,avgIntake,avgProtein,avgSteps,workoutDays,goalWeight,goalDate,expectedAtGoal:expectedAtGoal===null?null:Math.round(expectedAtGoal*10)/10};
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
  @media(max-width:430px){#today .tr-forecast-card{padding:13px 14px}#today .tr-forecast-value{font-size:30px}#today .tr-focus-list li{font-size:13px}}
  `;document.head.appendChild(style);
}
function renderExpectedWeight(card,h){
  ensureForecastStyles();
  let box=$('.tr-expected-weight',card);if(!box){box=document.createElement('div');box.className='tr-expected-weight';h.insertAdjacentElement('afterend',box)}
  const result=expectedWeight();
  if(!result||result.value===null){box.innerHTML='<section class="tr-forecast-card"><span class="tr-forecast-label">Expected weight today</span><strong class="tr-forecast-value">—</strong><small class="tr-forecast-meta">Add weight logs to start the forecast.</small></section>';return}
  const trend=result.weekly===0?'Stable trend':`${result.weekly>0?'+':''}${result.weekly.toFixed(1)} kg/week trend`;
  const projection=result.expectedAtGoal!==null?`${result.expectedAtGoal.toFixed(1)} kg`:'—';
  const projectionDate=result.expectedAtGoal!==null&&result.goalDate?`by ${result.goalDate}`:`${result.loggedDays} recent logged days analysed`;
  box.innerHTML=`
    <section class="tr-forecast-card tr-expected-card">
      <span class="tr-forecast-label">Expected weight today</span>
      <strong class="tr-forecast-value">${result.value.toFixed(1)} kg</strong>
      <small class="tr-forecast-meta">${trend} · based on weight, food, activity and training history</small>
    </section>
    <section class="tr-forecast-card tr-projected-card">
      <div class="tr-projected-head"><div><span class="tr-forecast-label">Projected weight</span><strong class="tr-forecast-value">${projection}</strong><div class="tr-projected-date">${projectionDate}</div></div><span class="tr-status-pill">${result.status}</span></div>
      <div class="tr-forecast-factors">Uses daily weight + calories + protein + steps + workouts</div>
    </section>
    <section class="tr-forecast-card tr-focus-card">
      <span class="tr-forecast-label">What to focus on</span>
      <ul class="tr-focus-list">${result.suggestions.map(x=>`<li>${x}</li>`).join('')}</ul>
    </section>`;
}
function cleanQuickUpdate(){const card=$('#today .form-card');if(!card)return;card.classList.add('tr-quick-update');const h=$('h3',card);if(h){h.textContent='Quick update';renderExpectedWeight(card,h)}}
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