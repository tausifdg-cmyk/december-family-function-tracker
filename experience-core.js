(function(){
'use strict';
const Store=window.MyBodyStore;
if(!Store)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mealKeys=['breakfast','lunch','eveningSnacks','dinner'];
const LEVELS=[
  {name:'Foundation',xp:0},
  {name:'Momentum',xp:250},
  {name:'Consistent',xp:650},
  {name:'Committed',xp:1300},
  {name:'Strong habits',xp:2200},
  {name:'Transformation',xp:3500}
];
let state=Store.read();
let wired=false;
function localDate(date=new Date()){return Store.localDate(date)}
function dateBack(days){const d=new Date();d.setDate(d.getDate()-days);return localDate(d)}
function dayIndex(date=new Date()){return (date.getDay()+6)%7}
function nutrition(date){const meals=state.nutrition?.[date]?.meals||{};let calories=0,protein=0,entries=0;mealKeys.forEach(k=>(meals[k]||[]).forEach(f=>{calories+=n(f.calories);protein+=n(f.protein);entries++}));return{calories,protein,entries}}
function activity(date){const x=state.activity?.[date]||{};return{steps:n(x.steps),water:n(x.water),minutes:n(x.minutes),met:n(x.met)}}
function readiness(date){return state.profile?.coach?.readiness?.[date]||null}
function bodyLogged(date){const w=(state.weights||[]).some(x=>x.date===date&&n(x.weight)>0);const a=(state.abdomen||[]).some(x=>x.date===date&&(n(x.value)>0||n(x.inches)>0));return w||a}
function workoutForDate(date){const d=new Date(date+'T12:00:00');const index=dayIndex(d);return{index,planned:index<(state.workouts?.length||0),plan:state.workouts?.[index]||null}}
function workoutStatus(date){const entry=state.workoutLog?.[date]||{};const logs=Object.values(entry);const complete=logs.some(log=>Array.isArray(log?.exercises)&&log.exercises.some(ex=>{if(Array.isArray(ex?.setsDetail)&&ex.setsDetail.some(s=>s.done))return true;return n(ex?.weight)>0||n(ex?.reps)>0}))||logs.some(log=>n(log?.minutes)>0);return{complete,logs}}
function cardio(date){return n(state.profile?.phase3?.cardio?.[date])}
function dailyScore(date=localDate()){
  const nu=nutrition(date),ac=activity(date),wo=workoutForDate(date),done=workoutStatus(date),rd=readiness(date);
  const calTarget=n(state.config?.calories),proteinTarget=n(state.config?.protein),stepsTarget=n(state.config?.steps),waterTarget=n(state.config?.water);
  let earned=0,max=0;
  max+=30;if(nu.entries>0)earned+=12;if(calTarget&&nu.calories>0){const ratio=nu.calories/calTarget;if(ratio>=.75&&ratio<=1.15)earned+=8;else if(ratio>=.55&&ratio<=1.35)earned+=4}if(proteinTarget)earned+=10*clamp(nu.protein/(proteinTarget*.9),0,1);
  max+=20;if(stepsTarget)earned+=20*clamp(ac.steps/stepsTarget,0,1);
  max+=10;if(waterTarget)earned+=10*clamp(ac.water/waterTarget,0,1);else earned+=ac.water>0?10:0;
  max+=10;if(rd)earned+=5;if(bodyLogged(date))earned+=5;
  if(wo.planned){max+=25;if(done.complete)earned+=25;else{const anySet=done.logs.some(log=>(log?.exercises||[]).some(ex=>(ex?.setsDetail||[]).some(s=>s.done)));if(anySet)earned+=12}}else if(cardio(date)>0){max+=15;earned+=15*clamp(cardio(date)/30,0,1)}
  return Math.round(clamp(max?earned/max*100:0,0,100));
}
function knownDates(){const set=new Set();Object.keys(state.nutrition||{}).forEach(x=>set.add(x));Object.keys(state.activity||{}).forEach(x=>set.add(x));Object.keys(state.workoutLog||{}).forEach(x=>set.add(x));Object.keys(state.profile?.coach?.readiness||{}).forEach(x=>set.add(x));(state.weights||[]).forEach(x=>x.date&&set.add(x.date));return Array.from(set).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort()}
function totalXp(){return knownDates().reduce((sum,date)=>sum+dailyScore(date),0)}
function levelForXp(xp){let index=0;LEVELS.forEach((l,i)=>{if(xp>=l.xp)index=i});const current=LEVELS[index],next=LEVELS[index+1]||null;const span=next?next.xp-current.xp:1;const progress=next?clamp((xp-current.xp)/span*100,0,100):100;return{number:index+1,current,next,progress,xp}}
function sevenDayScore(){const rows=[],known=knownDates();for(let i=0;i<7;i++){const d=dateBack(i);if(known.includes(d)||i===0)rows.push(dailyScore(d))}return Math.round(avg(rows))}
function strengthMomentum(){let first=[],best=[];const byName=new Map();Object.keys(state.workoutLog||{}).sort().forEach(date=>{Object.entries(state.workoutLog?.[date]||{}).forEach(([dayKey,log])=>{const plan=state.workouts?.[n(dayKey)];(log?.exercises||[]).forEach((ex,i)=>{const name=plan?.exercises?.[i]?.[0]||`Exercise ${i+1}`;(ex?.setsDetail||[]).forEach(s=>{const w=n(s.actualWeight),r=n(s.actualReps);if(!(w>0&&r>0))return;const est=r<=15?w*(1+r/30):w;const item=byName.get(name)||{first:est,best:est};item.best=Math.max(item.best,est);byName.set(name,item)})})})});byName.forEach(v=>{first.push(v.first);best.push(v.best)});if(!first.length)return null;const a=avg(first),b=avg(best);return a?clamp((b-a)/a*100,0,25):0}
function weightProgress(){const rows=(state.weights||[]).filter(x=>n(x.weight)>0).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));if(!rows.length)return null;const start=n(state.config?.startWeight,rows[0].weight),goal=n(state.config?.goalWeight),current=n(rows[rows.length-1].weight);if(!goal||Math.abs(start-goal)<.1)return null;const direction=start>goal?1:-1;return clamp(((start-current)*direction)/Math.abs(start-goal)*100,0,100)}
function transformationMomentum(){const consistency=sevenDayScore(),wp=weightProgress(),strength=strengthMomentum();const parts=[{w:.65,v:consistency}];if(wp!==null)parts.push({w:.2,v:wp});if(strength!==null)parts.push({w:.15,v:clamp(strength*4,0,100)});const totalW=parts.reduce((s,x)=>s+x.w,0);return Math.round(parts.reduce((s,x)=>s+x.w*x.v,0)/totalW)}
function nextAction(date=localDate()){
  const nu=nutrition(date),ac=activity(date),wo=workoutForDate(date),done=workoutStatus(date),proteinTarget=n(state.config?.protein),stepsTarget=n(state.config?.steps),waterTarget=n(state.config?.water);
  if(!state.profile?.coach?.plan)return{title:'Build your MYBODY plan',body:'Set your goal, schedule and nutrition targets so coaching can adapt to you.',action:'coach',label:'Build plan'};
  if(state.profile?.phase3?.deloadActive)return{title:'Keep today lighter',body:'Recovery week is active. Reduce hard sets, keep technique crisp and avoid failure.',action:'workout',label:'Open workout'};
  if(state.profile?.phase3?.minimumDays?.[date])return{title:'Win the minimum day',body:'Prioritise protein, 6,000 steps and 20–30 minutes of movement.',action:'today',label:'Keep going'};
  if(wo.planned&&!done.complete)return{title:wo.plan?.name||'Workout is ready',body:wo.plan?.focus||'Complete today’s planned training when you are ready.',action:'workout',label:'Start workout'};
  if(proteinTarget&&nu.protein<proteinTarget*.8)return{title:'Protein is the next win',body:`About ${Math.max(0,Math.round(proteinTarget-nu.protein))} g remains today.`,action:'food',label:'Log food'};
  if(stepsTarget&&ac.steps<stepsTarget*.8)return{title:'Move a little more',body:`${Math.max(0,Math.round(stepsTarget-ac.steps)).toLocaleString()} steps remain to reach today’s target.`,action:'today',label:'View steps'};
  if(waterTarget&&ac.water<waterTarget*.8)return{title:'Hydration is behind',body:`About ${Math.max(0,waterTarget-ac.water).toFixed(1)} L remains today.`,action:'today',label:'Update water'};
  return{title:'You’re on track',body:'The important targets are covered. Keep the rest of the day simple and recover well.',action:'progress',label:'View progress'};
}
function ensureBrief(){const host=$('#today');if(!host)return null;let card=$('#experienceBrief');if(!card){card=document.createElement('section');card.id='experienceBrief';card.className='card experience-brief';host.querySelector('.section-head')?.insertAdjacentElement('afterend',card)}return card}
function renderBrief(){const card=ensureBrief();if(!card)return;const score=dailyScore(),xp=totalXp(),level=levelForXp(xp),action=nextAction(),remaining=level.next?Math.max(0,level.next.xp-xp):0;card.innerHTML=`<div class="xp-brief-top"><div class="xp-ring" style="--xp-score:${score}%"><strong>${score}</strong><span>Today</span></div><div class="xp-level"><span>LEVEL ${level.number}</span><h3>${esc(level.current.name)}</h3><div class="xp-progress"><i style="width:${level.progress}%"></i></div><small>${level.next?`${remaining} XP to ${esc(level.next.name)}`:'Highest level reached'} · ${xp.toLocaleString()} XP total</small></div></div><div class="xp-coach"><span>MYBODY COACH</span><strong>${esc(action.title)}</strong><p>${esc(action.body)}</p><button type="button" class="primary" data-xp-action="${action.action}">${esc(action.label)}</button></div>`;card.querySelector('[data-xp-action]')?.addEventListener('click',()=>handleAction(action.action))}
function ensureJourney(){const host=$('#progress');if(!host)return null;let card=$('#experienceJourney');if(!card){card=document.createElement('section');card.id='experienceJourney';card.className='card experience-journey';const stats=host.querySelector('.stats-grid');(stats||host.querySelector('.section-head'))?.insertAdjacentElement('afterend',card)}return card}
function renderJourney(){const card=ensureJourney();if(!card)return;const xp=totalXp(),level=levelForXp(xp),consistency=sevenDayScore(),momentum=transformationMomentum();card.innerHTML=`<div class="xp-journey-head"><div><span>MYBODY JOURNEY</span><h3>Level ${level.number} · ${esc(level.current.name)}</h3></div><button type="button" class="text-btn" data-xp-levels>How levels work</button></div><div class="xp-journey-grid"><div><small>Total XP</small><strong>${xp.toLocaleString()}</strong><span>Never reduced for a missed day</span></div><div><small>7-day consistency</small><strong>${consistency}%</strong><span>Logging + daily actions</span></div><div><small>Transformation momentum</small><strong>${momentum}%</strong><span>Habits + available progress</span></div></div><div class="xp-progress large"><i style="width:${level.progress}%"></i></div><p>${level.next?`${Math.max(0,level.next.xp-xp)} XP to reach ${esc(level.next.name)}.`:'You reached the highest MYBODY Journey level.'} Levels reward consistency, not extreme dieting or overtraining.</p>`;card.querySelector('[data-xp-levels]')?.addEventListener('click',openLevels)}
function openLevels(){let m=$('#experienceLevelsModal');if(!m){m=document.createElement('div');m.id='experienceLevelsModal';m.className='xp-modal hidden';document.body.appendChild(m)}const score=dailyScore(),xp=totalXp();m.innerHTML=`<div class="xp-modal-panel" role="dialog" aria-modal="true"><header><div><h2>MYBODY Journey</h2><p>Build your level through consistency. A missed day never removes XP.</p></div><button type="button" class="xp-close" aria-label="Close">×</button></header><div class="xp-breakdown"><article><span>Today</span><strong>${score}/100</strong><small>Food, movement, training, hydration and check-ins</small></article><article><span>Total</span><strong>${xp.toLocaleString()} XP</strong><small>Your cumulative consistency</small></article></div><div class="xp-level-list">${LEVELS.map((l,i)=>`<div class="${xp>=l.xp?'reached':''}"><b>${i+1}</b><span><strong>${esc(l.name)}</strong><small>${l.xp.toLocaleString()} XP</small></span></div>`).join('')}</div><p class="xp-note">MYBODY intentionally does not award extra points for very low calories, excessive exercise or rapid weight loss. Healthy consistency matters more.</p></div>`;m.classList.remove('hidden');document.body.classList.add('modal-open');$('.xp-close',m).onclick=()=>closeLevels();m.onclick=e=>{if(e.target===m)closeLevels()}}
function closeLevels(){const m=$('#experienceLevelsModal');if(m)m.classList.add('hidden');if(!document.querySelector('.xp-modal:not(.hidden),.p5-modal:not(.hidden),.p4-modal:not(.hidden),.p3-modal:not(.hidden),.coach-modal:not(.hidden),.sheet-backdrop:not(.hidden)'))document.body.classList.remove('modal-open')}
function handleAction(action){if(action==='coach'){const b=$('#mybodyCoachCard button');if(b)b.click();return}if(action==='workout'||action==='food'||action==='progress'){const tab=$(`[data-tab="${action}"],[data-nav="${action}"],#${action}-tab`);tab?.click();return}if(action==='today')$('#today .form-card')?.scrollIntoView({behavior:'smooth',block:'center'})}
function consolidateToday(){document.documentElement.classList.add('mybody-consolidated');[$('#mybodyCoachCard'),$('#phase3Adaptive'),$('#p4NextAction')].forEach(x=>{if(x)x.setAttribute('aria-hidden','true')})}
function renderAll(){state=Store.read();consolidateToday();renderBrief();renderJourney()}
function wire(){if(wired)return;wired=true;window.addEventListener('mybody:state',()=>setTimeout(renderAll,100));document.addEventListener('click',e=>{if(e.target.closest('[data-nav],.tab,#saveDaily,#saveWorkout,[data-action="save-food"],[data-action="save-exercise-detail"]'))setTimeout(renderAll,160)},true);const obs=new MutationObserver(()=>requestAnimationFrame(()=>{consolidateToday();if(!$('#experienceBrief')||!$('#experienceJourney'))renderAll()}));obs.observe(document.body,{childList:true,subtree:true})}
function init(){renderAll();wire();setTimeout(renderAll,300)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
window.MyBodyExperience={dailyScore,totalXp,levelForXp,sevenDayScore,transformationMomentum,nextAction};
})();