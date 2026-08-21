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
function weightTrend(rows,today){
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
  const weightSlope=weightTrend(rows,today);
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
    if(Math.abs(gap)<=1)status='On track for your goal';
    else if((goalWeight<value&&gap>1)||(goalWeight>value&&gap<-1))status='Progress is slower than target';
    else status='Tracking ahead of target';
  }
  if(loggedDays<4)suggestions.push('Log food, steps and workouts on more days so the forecast becomes more reliable.');
  if(targetCalories&&avgIntake>targetCalories*1.08)suggestions.push(`Your recent intake is averaging about ${Math.round(avgIntake-targetCalories)} kcal above target. Bring most days closer to ${Math.round(targetCalories)} kcal.`);
  if(targetCalories&&avgIntake>0&&avgIntake<targetCalories*.82)suggestions.push('Your recent intake is well below target. Avoid pushing the deficit too aggressively; consistency is more useful than extreme low-calorie days.');
  if(targetProtein&&avgProtein>0&&avgProtein<targetProtein*.9)suggestions.push(`Protein is averaging ${Math.round(avgProtein)} g/day. Aim closer to ${Math.round(targetProtein)} g to support training and lean mass.`);
  if(targetSteps&&avgSteps>0&&avgSteps<targetSteps*.9)suggestions.push(`Steps are averaging ${Math.round(avgSteps).toLocaleString()} per day. Closing the gap toward ${Math.round(targetSteps).toLocaleString()} will improve activity consistency.`);
  if(workoutDays<Math.min(3,Math.max(1,Math.round(num(cfg.daysPerWeek,4)*.6))))suggestions.push('Workout frequency has been low recently. Complete the planned sessions you can recover from rather than adding extra crash cardio.');
  if(weightSlope!==null&&neededSlope!==null&&goalWeight<value&&weightSlope>neededSlope*.65)suggestions.push('Your scale trend is moving more slowly than the pace required for the goal date. Prioritise calorie adherence, steps and planned workouts for the next 7 days before changing targets.');
  if(!suggestions.length)suggestions.push('Keep your current calorie, protein, step and workout routine consistent. The recent pattern is supporting the target trajectory.');
  return {value,count:rows.length,weekly:Math.round(projectedSlope*70)/10,status,suggestions:suggestions.slice(0,3),loggedDays,avgIntake,avgProtein,avgSteps,workoutDays,goalWeight,goalDate,expectedAtGoal:expectedAtGoal===null?null:Math.round(expectedAtGoal*10)/10};
}
function renderExpectedWeight(card,h){
  let box=$('.tr-expected-weight',card);if(!box){box=document.createElement('div');box.className='tr-expected-weight';h.insertAdjacentElement('afterend',box)}
  const result=expectedWeight();
  if(!result||result.value===null){box.innerHTML='<div class="tr-ew-main"><span>Expected weight today</span><strong>—</strong><small>Add weight logs to start the forecast.</small></div>';return}
  const trend=result.weekly===0?'stable':`${result.weekly>0?'+':''}${result.weekly.toFixed(1)} kg/week`;
  const goalLine=result.expectedAtGoal!==null?`Projected ${result.expectedAtGoal.toFixed(1)} kg by ${result.goalDate}`:`${result.loggedDays} recent logged days analysed`;
  box.innerHTML=`<div class="tr-ew-main"><span>Expected weight today</span><strong>${result.value.toFixed(1)} kg</strong><small>${result.status} · ${trend}</small></div><div class="tr-ew-factors"><b>${goalLine}</b><span>Uses weight + calories + protein + steps + workouts</span></div><div class="tr-ew-advice"><span>What to focus on</span>${result.suggestions.map(x=>`<p>${x}</p>`).join('')}</div>`;
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