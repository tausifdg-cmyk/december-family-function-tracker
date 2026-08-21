(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
let wired=false,observer;
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
function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dayNumber(date){const ms=new Date(`${date}T12:00:00`).getTime();return Number.isFinite(ms)?ms/86400000:null}
function expectedWeight(){
  const Store=window.MyBodyStore;if(!Store)return null;
  const state=Store.read(),today=localDate(),byDate=new Map();
  (state.weights||[]).forEach(entry=>{const date=String(entry?.date||''),weight=Number(entry?.weight);if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<today&&Number.isFinite(weight)&&weight>0)byDate.set(date,weight)});
  const rows=[...byDate].map(([date,weight])=>({date,weight,x:dayNumber(date)})).filter(x=>x.x!==null).sort((a,b)=>a.x-b.x).slice(-12);
  if(!rows.length)return {value:null,count:0,weekly:null};
  if(rows.length===1)return {value:rows[0].weight,count:1,weekly:null};
  const first=rows[0].x,points=rows.map(r=>({x:r.x-first,y:r.weight}));
  const meanX=points.reduce((s,p)=>s+p.x,0)/points.length,meanY=points.reduce((s,p)=>s+p.y,0)/points.length;
  const variance=points.reduce((s,p)=>s+Math.pow(p.x-meanX,2),0);
  let slope=variance?points.reduce((s,p)=>s+(p.x-meanX)*(p.y-meanY),0)/variance:0;
  slope=Math.max(-1.5/7,Math.min(1.5/7,slope));
  const intercept=meanY-slope*meanX,todayX=dayNumber(today)-first;
  let value=intercept+slope*todayX;
  const latest=rows[rows.length-1],elapsed=Math.max(0,dayNumber(today)-latest.x),maxMove=Math.max(.15,elapsed*(1.5/7));
  value=Math.max(latest.weight-maxMove,Math.min(latest.weight+maxMove,value));
  return {value:Math.round(value*10)/10,count:rows.length,weekly:Math.round(slope*70)/10};
}
function renderExpectedWeight(card,h){
  let box=$('.tr-expected-weight',card);if(!box){box=document.createElement('div');box.className='tr-expected-weight';h.insertAdjacentElement('afterend',box)}
  const result=expectedWeight();
  if(!result||result.value===null){box.innerHTML='<div><span>Expected weight today</span><strong>—</strong></div><small>Add weight logs to build your trend.</small>';return}
  if(result.count<2){box.innerHTML=`<div><span>Expected weight today</span><strong>${result.value.toFixed(1)} kg</strong></div><small>Based on your latest log. Add another weight entry for a trend estimate.</small>`;return}
  const trend=result.weekly===0?'stable':`${result.weekly>0?'+':''}${result.weekly.toFixed(1)} kg/week`;
  box.innerHTML=`<div><span>Expected weight today</span><strong>${result.value.toFixed(1)} kg</strong></div><small>History trend ${trend} · based on ${result.count} recent logs</small>`;
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
  document.addEventListener('click',e=>{if(e.target.closest('[data-tab="today"],[data-nav="today"],[data-coach-action]'))setTimeout(refresh,80)},true);
  const today=$('#today');if(today){observer=new MutationObserver(()=>requestAnimationFrame(syncRings));observer.observe(today,{subtree:true,attributes:true,attributeFilter:['style']})}
}
document.addEventListener('DOMContentLoaded',()=>{refresh();wire();setTimeout(refresh,180)});
if(document.readyState!=='loading'){refresh();wire();setTimeout(refresh,180)}
})();