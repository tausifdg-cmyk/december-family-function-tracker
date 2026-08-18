(function(){
'use strict';
const Store=window.MyBodyStore;
if(!Store)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
let daySelect,observer,summaryObserver;

function activeDay(){return Number($('.day-btn.active')?.dataset.day||0)}
function shortDayName(name){return String(name||'Workout').replace(/^\w+\s*[•-]\s*/,'').trim()}
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
      setTimeout(refreshAll,40);
    });
  }
  const buttons=$$('.day-btn',picker);
  const current=String(activeDay());
  const signature=buttons.map(b=>`${b.dataset.day}:${b.textContent.trim()}`).join('|');
  if(daySelect.dataset.signature!==signature){
    daySelect.innerHTML=buttons.map((b,i)=>{
      const title=b.querySelector('span')?.textContent?.trim()||b.textContent.trim();
      return `<option value="${b.dataset.day||i}">${title}</option>`;
    }).join('');
    daySelect.dataset.signature=signature;
  }
  daySelect.value=current;
}

function ensureBottomSessionCard(){
  const workout=$('#workout'),list=$('#exerciseList'),save=$('#saveWorkout');
  const summary=$('.workout-summary'),controls=$('.workout-controls');
  if(!workout||!list||!save||!summary||!controls)return;
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
  }
  const title=$('#sessionName')?.textContent||'Workout';
  const duration=$('#workoutMinutes')?.value||$('#sessionMinutes')?.textContent||'60';
  const burn=$('#sessionBurn')?.textContent||'—';
  const actualLabel=$('label',controls);
  if(actualLabel)actualLabel.childNodes[0].nodeValue='Actual duration ';
  $('#wrSessionTitle').textContent=shortDayName(title);
  $('#wrTargetDuration').textContent=`${duration} min`;
  $('#wrBurn').textContent=burn;
  controls.classList.add('wr-inline-controls');
}

function compactExerciseCards(){
  $$('#exerciseList .exercise').forEach(card=>{
    card.classList.add('wr-exercise-card');
    const media=$('.exercise-media',card),top=$('.exercise-top',card),main=$('.exercise-main',card),num=$('.exercise-num',card),inputs=$('.exercise-inputs',card),confirm=$('.entry-confirm',card),save=$('.entry-save',card),status=$('.save-status',card),swap=$('.p2-swap',card);
    if(num)num.hidden=true;
    if(inputs)inputs.hidden=true;
    if(save)save.hidden=true;
    if(media)media.classList.add('wr-thumb');
    if(top)top.classList.add('wr-exercise-open');
    if(main)main.classList.add('wr-exercise-main');
    if(confirm){confirm.classList.add('wr-card-footer'); if(status)status.classList.add('wr-save-status'); if(swap)swap.classList.add('wr-swap');}
  });
}

function compactSetDetail(){
  const sheet=$('#exerciseDetailSheet');
  if(!sheet||sheet.classList.contains('hidden'))return;
  const head=$('.set-detail-head',sheet),rows=$$('#exerciseSetRows .exercise-set-row',sheet);
  if(head){
    const h=$$('span',head);
    if(h.length>=6){h[0].textContent='Set';h[1].textContent='Target';h[2].textContent='';h[2].classList.add('wr-hide-target-reps');h[3].textContent='Actual kg';h[4].textContent='Actual reps';h[5].textContent='Done';}
    head.classList.add('wr-set-head');
  }
  rows.forEach(row=>{
    row.classList.add('wr-set-row');
    const spans=$(':scope > span',row);
    if(spans.length>=2){
      const kg=spans[0].dataset.rawKg||spans[0].textContent.trim();
      const reps=spans[1].dataset.rawReps||spans[1].textContent.trim();
      spans[0].dataset.rawKg=kg;spans[1].dataset.rawReps=reps;
      const load=kg==='—'||kg===''?'Body/—':`${kg} kg`;
      spans[0].textContent=`${load} × ${reps}`;
      spans[0].classList.add('wr-target-combined');
      spans[1].classList.add('wr-hide-target-reps');
    }
    const effort=$('.p2-effort',row);
    if(effort)effort.classList.add('wr-effort');
  });
}

function syncBottomCard(){
  if(!$('#wrSessionCard'))return;
  const title=$('#sessionName')?.textContent||'Workout';
  const duration=$('#workoutMinutes')?.value||$('#sessionMinutes')?.textContent||'60';
  $('#wrSessionTitle').textContent=shortDayName(title);
  $('#wrTargetDuration').textContent=`${duration} min`;
  $('#wrBurn').textContent=$('#sessionBurn')?.textContent||'—';
}

function refreshAll(){
  ensureDayDropdown();
  ensureBottomSessionCard();
  compactExerciseCards();
  compactSetDetail();
  syncBottomCard();
}

function watch(){
  if(observer)return;
  observer=new MutationObserver(()=>requestAnimationFrame(refreshAll));
  const workout=$('#workout');if(workout)observer.observe(workout,{childList:true,subtree:true,characterData:true});
  const rows=$('#exerciseSetRows');if(rows)observer.observe(rows,{childList:true,subtree:true});
  document.addEventListener('input',e=>{if(e.target.matches('#workoutMinutes,#workoutIntensity'))setTimeout(syncBottomCard,20)},true);
  document.addEventListener('click',e=>{if(e.target.closest('[data-action="open-exercise-detail"],[data-action="select-day"],.day-btn'))setTimeout(refreshAll,60)},true);
}

document.addEventListener('DOMContentLoaded',()=>{refreshAll();watch();});
if(document.readyState!=='loading'){refreshAll();watch();}
})();