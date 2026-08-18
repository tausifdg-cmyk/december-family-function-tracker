(function(){
'use strict';
const Store=window.MyBodyStore;
if(!Store)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
let daySelect;
function activeDay(){return Number($('.day-btn.active')?.dataset.day||0)}
function shortDayName(name){return String(name||'Workout').replace(/^\w+\s*[•-]\s*/,'').trim()}
function stateNow(){return Store.read()}
function targetMinutes(){const s=stateNow();return Number(s.profile?.coach?.plan?.profile?.minutes||s.config?.minutesPerWorkout||60)||60}

function ensureDayDropdown(){
  const picker=$('#dayPicker');
  if(!picker)return;
  if(!daySelect){
    const wrap=document.createElement('div');
    wrap.className='wr-day-select-wrap';
    wrap.innerHTML='<label for="workoutDaySelect">Workout day</label><select id="workoutDaySelect" aria-label="Choose workout day"></select>';
    picker.before(wrap);
    daySelect=$('#workoutDaySelect');
    daySelect.addEventListener('change',()=>{
      const btn=$(`.day-btn[data-day="${daySelect.value}"]`);
      if(btn)btn.click();
      setTimeout(refreshAll,70);
      setTimeout(refreshAll,160);
    });
  }
  const buttons=$$('.day-btn',picker),current=String(activeDay());
  const signature=buttons.map(b=>`${b.dataset.day}:${b.textContent.trim()}`).join('|');
  if(daySelect.dataset.signature!==signature){
    daySelect.innerHTML=buttons.map((b,i)=>{
      const title=b.querySelector('span')?.textContent?.trim()||b.textContent.trim();
      return `<option value="${b.dataset.day||i}">${title}</option>`;
    }).join('');
    daySelect.dataset.signature=signature;
  }
  if(daySelect.value!==current)daySelect.value=current;
}

function ensureBottomSessionCard(){
  const save=$('#saveWorkout'),summary=$('.workout-summary'),controls=$('.workout-controls');
  if(!save||!summary||!controls)return;
  let card=$('#wrSessionCard');
  if(!card){
    card=document.createElement('section');
    card.id='wrSessionCard';
    card.className='card wr-session-card';
    card.innerHTML='<div class="wr-session-head"><div><span>Session summary</span><strong id="wrSessionTitle">Workout</strong></div><small>Target & actual</small></div><div class="wr-session-grid"><div><span>Target duration</span><strong id="wrTargetDuration">60 min</strong></div><div><span>Est. burn</span><strong id="wrBurn">—</strong></div></div><div class="wr-session-controls"></div>';
    save.before(card);
    $('.wr-session-controls',card).appendChild(controls);
    summary.classList.add('wr-source-summary');
    summary.hidden=true;
    controls.classList.add('wr-inline-controls');
  }
  const actualLabel=$('label',controls);
  if(actualLabel&&actualLabel.childNodes[0]?.nodeType===3&&actualLabel.childNodes[0].nodeValue!=='Actual duration ')actualLabel.childNodes[0].nodeValue='Actual duration ';
  syncBottomCard();
}

function compactExerciseCards(){
  $$('#exerciseList .exercise').forEach(card=>{
    card.classList.add('wr-exercise-card');
    const media=$('.exercise-media',card),top=$('.exercise-top',card),main=$('.exercise-main',card),num=$('.exercise-num',card),inputs=$('.exercise-inputs',card),confirm=$('.entry-confirm',card),save=$('.entry-save',card),status=$('.save-status',card),swap=$('.p2-swap',card);
    if(num)num.hidden=true;if(inputs)inputs.hidden=true;if(save)save.hidden=true;
    media?.classList.add('wr-thumb');top?.classList.add('wr-exercise-open');main?.classList.add('wr-exercise-main');
    if(confirm){confirm.classList.add('wr-card-footer');status?.classList.add('wr-save-status');swap?.classList.add('wr-swap');}
  });
}

function compactSetDetail(){
  const sheet=$('#exerciseDetailSheet');
  if(!sheet||sheet.classList.contains('hidden'))return;
  const head=$('.set-detail-head',sheet),rows=$$('#exerciseSetRows .exercise-set-row',sheet);
  if(head){
    const h=$$('span',head);
    if(h.length>=6){
      if(h[0].textContent!=='Set')h[0].textContent='Set';
      if(h[1].textContent!=='Target')h[1].textContent='Target';
      h[2].classList.add('wr-hide-target-reps');
      if(h[3].textContent!=='Actual kg')h[3].textContent='Actual kg';
      if(h[4].textContent!=='Actual reps')h[4].textContent='Actual reps';
      if(h[5].textContent!=='Done')h[5].textContent='Done';
    }
    head.classList.add('wr-set-head');
  }
  rows.forEach(row=>{
    row.classList.add('wr-set-row');
    const spans=$$(':scope > span',row);
    if(spans.length>=2){
      const kg=spans[0].dataset.rawKg||spans[0].textContent.trim();
      const reps=spans[1].dataset.rawReps||spans[1].textContent.trim();
      spans[0].dataset.rawKg=kg;spans[1].dataset.rawReps=reps;
      const load=kg==='—'||kg===''?'—':`${kg} kg`;
      const combined=`${load} × ${reps}`;
      if(spans[0].textContent!==combined)spans[0].textContent=combined;
      spans[0].classList.add('wr-target-combined');spans[1].classList.add('wr-hide-target-reps');
    }
    $('.p2-effort',row)?.classList.add('wr-effort');
  });
}

function syncBottomCard(){
  if(!$('#wrSessionCard'))return;
  const title=shortDayName($('#sessionName')?.textContent||'Workout');
  const target=`${targetMinutes()} min`,burn=$('#sessionBurn')?.textContent||'—';
  if($('#wrSessionTitle')?.textContent!==title)$('#wrSessionTitle').textContent=title;
  if($('#wrTargetDuration')?.textContent!==target)$('#wrTargetDuration').textContent=target;
  if($('#wrBurn')?.textContent!==burn)$('#wrBurn').textContent=burn;
}

function refreshAll(){ensureDayDropdown();ensureBottomSessionCard();compactExerciseCards();compactSetDetail();syncBottomCard()}
function wire(){
  document.addEventListener('input',e=>{if(e.target.matches('#workoutMinutes,#workoutIntensity'))setTimeout(syncBottomCard,20)},true);
  document.addEventListener('change',e=>{if(e.target.matches('#workoutMinutes,#workoutIntensity'))setTimeout(syncBottomCard,20)},true);
  document.addEventListener('click',e=>{if(e.target.closest('[data-action="open-exercise-detail"],[data-action="select-day"],.day-btn,[data-action="save-exercise-detail"]')){setTimeout(refreshAll,70);setTimeout(refreshAll,180)}},true);
  window.addEventListener('mybody:state',()=>setTimeout(refreshAll,80));
}
document.addEventListener('DOMContentLoaded',()=>{refreshAll();wire();setTimeout(refreshAll,180)});
if(document.readyState!=='loading'){refreshAll();wire();setTimeout(refreshAll,180)}
})();