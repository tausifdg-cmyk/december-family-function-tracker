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
function cleanQuickUpdate(){const card=$('#today .form-card');if(!card)return;card.classList.add('tr-quick-update');const h=$('h3',card);if(h)h.textContent='Quick update'}
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