/* MYBODY 2.0 - isolated history log editor.
   Adds edit/delete actions to Food, Workout and Progress history without changing core renderers. */
(function(){
'use strict';
const Store=window.MyBodyStore;
if(!Store)return;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
let queued=false;

function injectStyles(){
  if($('#mbHistoryEditorStyles'))return;
  const s=document.createElement('style');
  s.id='mbHistoryEditorStyles';
  s.textContent=`
    .mb-history-actions{display:flex;align-items:center;gap:6px;margin-left:auto;flex:none}
    .mb-history-btn{display:grid;place-items:center;min-width:38px;min-height:38px;padding:7px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text)}
    .mb-history-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    .mb-history-btn.delete{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 35%,var(--line))}
    .mb-history-modal{position:fixed;z-index:99980;inset:0;display:grid;place-items:end center;padding:18px;background:rgba(0,0,0,.58);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
    .mb-history-modal.hidden{display:none}
    .mb-history-panel{width:min(100%,560px);max-height:min(82dvh,720px);overflow:auto;padding:20px;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:0 24px 70px rgba(0,0,0,.5)}
    .mb-history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}.mb-history-head h3{margin:2px 0 0;font-size:21px}.mb-history-head small{color:var(--muted)}
    .mb-history-close{display:grid;place-items:center;width:42px;height:42px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--text)}
    .mb-history-form{display:grid;gap:13px}.mb-history-form label{display:grid;gap:6px;color:var(--muted);font-size:13px;font-weight:750}.mb-history-form input,.mb-history-form select{width:100%;min-height:48px;padding:10px 12px;border:1px solid var(--line);border-radius:11px;background:var(--card);color:var(--text);font-size:16px}
    .mb-history-foods{display:grid;gap:10px}.mb-history-food-row{display:grid;grid-template-columns:minmax(0,1fr) 94px auto;align-items:end;gap:8px;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--card)}.mb-history-food-row strong{display:block;font-size:13px}.mb-history-food-row small{display:block;color:var(--muted);font-size:11px}.mb-history-food-row input{width:100%;min-height:42px;padding:8px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--text);font-size:16px}
    .mb-history-actions-bottom{display:grid;grid-template-columns:1fr auto;gap:9px;margin-top:18px}.mb-history-actions-bottom button{min-height:46px;border-radius:11px;font-weight:850}.mb-history-save{border:1px solid var(--accent);background:var(--accent);color:#0b1006}.mb-history-cancel{border:1px solid var(--line);background:var(--card);color:var(--text);padding:0 16px}
    @media(max-width:520px){.mb-history-modal{padding:10px}.mb-history-panel{padding:16px}.mb-history-food-row{grid-template-columns:minmax(0,1fr) 82px auto}.list-row:has(.mb-history-actions){gap:8px;align-items:center}.list-row:has(.mb-history-actions)>span:last-of-type{white-space:nowrap}}
  `;
  document.head.appendChild(s);
}

function state(){return Store.read()}
function save(next,msg){
  const result=Store.write(next);
  if(!result.ok){alert('Could not save the history change because storage is full.');return false}
  window.dispatchEvent(new CustomEvent('mybody:history-edited',{detail:{message:msg||'History updated'}}));
  schedule(80);return true;
}
function icon(type){return type==='edit'?'<svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>':'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>'}
function actions(kind,key,sub=''){
  return `<div class="mb-history-actions"><button type="button" class="mb-history-btn" data-history-action="edit" data-history-kind="${kind}" data-history-key="${esc(key)}" data-history-sub="${esc(sub)}" aria-label="Edit history entry">${icon('edit')}</button><button type="button" class="mb-history-btn delete" data-history-action="delete" data-history-kind="${kind}" data-history-key="${esc(key)}" data-history-sub="${esc(sub)}" aria-label="Delete history entry">${icon('delete')}</button></div>`;
}

function decorateFood(){
  const host=$('#foodHistory');if(!host)return;
  const s=state();
  const rows=Object.keys(s.nutrition||{}).sort().reverse().filter(date=>{
    const meals=s.nutrition?.[date]?.meals||{};return Object.values(meals).flat().some(x=>num(x?.calories)>0||x?.name);
  }).slice(0,30);
  $$('.list-row',host).forEach((row,i)=>{if(row.querySelector('.mb-history-actions')||!rows[i])return;row.insertAdjacentHTML('beforeend',actions('food',rows[i]));});
}
function decorateWorkout(){
  const host=$('#workoutHistory');if(!host)return;
  const s=state();
  const rows=Object.entries(s.workoutLog||{}).sort(([a],[b])=>b.localeCompare(a)).flatMap(([date,sessions])=>Object.entries(sessions||{}).map(([day])=>({date,day}))).slice(0,30);
  $$('.list-row',host).forEach((row,i)=>{if(row.querySelector('.mb-history-actions')||!rows[i])return;row.insertAdjacentHTML('beforeend',actions('workout',rows[i].date,rows[i].day));});
}
function decorateProgress(){
  const host=$('#progressList');if(!host)return;
  const s=state();
  const dates=[...new Set([...(s.weights||[]).map(x=>x.date),...(s.abdomen||[]).map(x=>x.date)])].filter(Boolean).sort().reverse().slice(0,30);
  $$('.list-row',host).forEach((row,i)=>{if(row.querySelector('.mb-history-actions')||!dates[i])return;row.insertAdjacentHTML('beforeend',actions('progress',dates[i]));});
}
function decorate(){queued=false;decorateFood();decorateWorkout();decorateProgress()}
function schedule(ms=0){if(ms){setTimeout(()=>schedule(),ms);return}if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(decorate))}

function modal(){
  let m=$('#mbHistoryModal');if(m)return m;
  m=document.createElement('div');m.id='mbHistoryModal';m.className='mb-history-modal hidden';m.innerHTML='<section class="mb-history-panel" role="dialog" aria-modal="true"><div id="mbHistoryBody"></div></section>';document.body.appendChild(m);return m;
}
function close(){modal().classList.add('hidden');document.body.classList.remove('modal-open')}
function open(title,date,body,onSave){
  const m=modal(),host=$('#mbHistoryBody',m);host.innerHTML=`<div class="mb-history-head"><div><small>${esc(date)}</small><h3>${esc(title)}</h3></div><button type="button" class="mb-history-close" data-history-close aria-label="Close">×</button></div>${body}<div class="mb-history-actions-bottom"><button type="button" class="mb-history-save" data-history-save>Save changes</button><button type="button" class="mb-history-cancel" data-history-close>Cancel</button></div>`;
  m.classList.remove('hidden');document.body.classList.add('modal-open');
  $('[data-history-save]',m).onclick=()=>{if(onSave(host)!==false)close()};
  $$('[data-history-close]',m).forEach(b=>b.onclick=close);
}

function editProgress(date){
  const s=state(),w=(s.weights||[]).find(x=>x.date===date),wa=(s.abdomen||[]).find(x=>x.date===date);const waist=wa?(num(wa.value)||num(wa.inches)*2.54):'';
  open('Edit measurement',date,`<div class="mb-history-form"><label>Weight (kg)<input id="mbHistWeight" type="number" inputmode="decimal" step="0.1" min="25" max="400" value="${w?num(w.weight):''}"></label><label>Waist (cm)<input id="mbHistWaist" type="number" inputmode="decimal" step="0.1" min="20" max="400" value="${wa?waist.toFixed(1):''}"></label></div>`,host=>{
    const weight=num($('#mbHistWeight',host)?.value),waistCm=num($('#mbHistWaist',host)?.value);
    s.weights=(s.weights||[]).filter(x=>x.date!==date);if(weight>0)s.weights.unshift({date,weight});
    s.abdomen=(s.abdomen||[]).filter(x=>x.date!==date);if(waistCm>0)s.abdomen.unshift({date,value:waistCm});
    return save(s,'Measurement updated');
  });
}
function editWorkout(date,day){
  const s=state(),log=s.workoutLog?.[date]?.[day];if(!log)return;
  open('Edit workout log',date,`<div class="mb-history-form"><label>Duration (minutes)<input id="mbHistMinutes" type="number" inputmode="numeric" min="0" max="600" value="${num(log.minutes)}"></label><label>Intensity (MET)<input id="mbHistMet" type="number" inputmode="decimal" step="0.1" min="1" max="20" value="${num(log.met,5.5)}"></label></div>`,host=>{log.minutes=Math.max(0,num($('#mbHistMinutes',host)?.value));log.met=Math.max(1,num($('#mbHistMet',host)?.value,5.5));return save(s,'Workout history updated')});
}
function foodRowsFor(record){const out=[];Object.entries(record?.meals||{}).forEach(([meal,items])=>(Array.isArray(items)?items:[]).forEach((item,index)=>out.push({meal,index,item})));return out}
function editFood(date){
  const s=state(),record=s.nutrition?.[date];if(!record)return;const rows=foodRowsFor(record);
  const body=rows.length?`<div class="mb-history-foods">${rows.map((r,i)=>{const amt=num(r.item.amount,num(r.item.grams));return `<div class="mb-history-food-row" data-food-row="${i}"><div><strong>${esc(r.item.name||'Food')}</strong><small>${esc(r.meal.replace(/([A-Z])/g,' $1'))} · ${Math.round(num(r.item.calories))} kcal</small></div><label>Amount<input type="number" inputmode="decimal" min="0" step="0.1" value="${amt||''}" data-food-amount></label><button type="button" class="mb-history-btn delete" data-food-remove="${i}" aria-label="Remove food">${icon('delete')}</button></div>`}).join('')}</div>`:'<p class="empty">No food items found for this day.</p>';
  open('Edit food history',date,body,host=>{
    const removed=new Set($$('[data-food-row].is-removed',host).map(x=>num(x.dataset.foodRow,-1)));
    rows.forEach((r,i)=>{
      if(removed.has(i)){const arr=record.meals?.[r.meal];if(Array.isArray(arr)){const pos=arr.indexOf(r.item);if(pos>=0)arr.splice(pos,1)}return}
      const input=$(`[data-food-row="${i}"] [data-food-amount]`,host),next=num(input?.value),old=num(r.item.amount,num(r.item.grams));
      if(next>0&&old>0&&next!==old){const ratio=next/old;['calories','protein','carbs','fat','grams'].forEach(k=>{if(Number.isFinite(Number(r.item[k])))r.item[k]=Math.round(num(r.item[k])*ratio*10)/10});r.item.amount=next}
      else if(next>0){r.item.amount=next}
    });
    return save(s,'Food history updated');
  });
  $$('[data-food-remove]',modal()).forEach(btn=>btn.onclick=()=>{const row=btn.closest('[data-food-row]');row.classList.toggle('is-removed');row.style.opacity=row.classList.contains('is-removed')?'.35':'1';btn.title=row.classList.contains('is-removed')?'Will be removed':'Remove food'});
}
function deleteEntry(kind,key,sub){
  const s=state();let label='this history entry';
  if(kind==='food')label=`all food logs for ${key}`;if(kind==='workout')label=`this workout from ${key}`;if(kind==='progress')label=`weight and waist measurements from ${key}`;
  if(!confirm(`Delete ${label}? This cannot be undone.`))return;
  if(kind==='food')delete s.nutrition[key];
  if(kind==='workout'&&s.workoutLog?.[key]){delete s.workoutLog[key][sub];if(!Object.keys(s.workoutLog[key]).length)delete s.workoutLog[key]}
  if(kind==='progress'){s.weights=(s.weights||[]).filter(x=>x.date!==key);s.abdomen=(s.abdomen||[]).filter(x=>x.date!==key)}
  save(s,'History entry deleted');
}

function wire(){
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-history-action]');if(b){e.preventDefault();e.stopPropagation();const kind=b.dataset.historyKind,key=b.dataset.historyKey,sub=b.dataset.historySub||'';if(b.dataset.historyAction==='delete')deleteEntry(kind,key,sub);else if(kind==='food')editFood(key);else if(kind==='workout')editWorkout(key,sub);else if(kind==='progress')editProgress(key);return}
    if(e.target===modal())close();
    if(e.target.closest?.('#food-tab,#workout-tab,#progress-tab,[data-tab="food"],[data-tab="workout"],[data-tab="progress"],#saveDaily,#saveWorkout,.food-save,.food-cancel'))schedule(100);
  },true);
  window.addEventListener('mybody:state',()=>schedule(100));
}
function init(){injectStyles();modal();wire();schedule(250)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
