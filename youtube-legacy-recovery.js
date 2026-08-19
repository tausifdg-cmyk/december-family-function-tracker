/* MYBODY 2.0 YouTube recovery.
   Restores the earlier verified YouTube references and keeps playback embedded in MYBODY.
   The historical implementation used direct verified links plus an external YouTube search fallback;
   this recovery deliberately keeps only verified/direct videos inside the app. */
(function(){
'use strict';
const Library=window.MyBodyExerciseLibrary;
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const SAVED='mybody.youtube.exercise-links.v1';

/* Verified references recovered from the original workout-videos.js plus current curated references. */
const BY_ID=Object.freeze({
  'dumbbell-bench-press':'CayG6UYqL8g',
  'incline-dumbbell-press':'oS2Uy3MAbgs',
  'seated-cable-row':'k0cTJCfxa0Y',
  'romanian-deadlift':'xgusDooVfKU',
  'leg-press':'cDGOn-yfKJA',
  'leg-curl':'Dq5y4WEcqqo',
  'dumbbell-biceps-curl':'pQfJR-sSIvA',
  'plank':'mwlp75MS6Rg',
  'front-press':'2b5t0Cu2nQI'
});
const BY_NAME=Object.freeze({
  'barbell bench press':'CayG6UYqL8g',
  'bench press':'CayG6UYqL8g',
  'incline dumbbell press':'oS2Uy3MAbgs',
  'incline db press':'oS2Uy3MAbgs'
});
function savedMap(){try{return JSON.parse(localStorage.getItem(SAVED)||'{}')||{}}catch(_){return {}}}
function validId(v){return /^[A-Za-z0-9_-]{11}$/.test(String(v||''))}
function idFor(exercise){
  const saved=savedMap()[exercise?.id];
  if(validId(saved))return saved;
  if(validId(BY_ID[exercise?.id]))return BY_ID[exercise.id];
  const names=[exercise?.name,...(exercise?.aliases||[])].map(clean);
  for(const n of names)if(validId(BY_NAME[n]))return BY_NAME[n];
  return '';
}
function currentExercise(){
  const name=$('#exerciseLightboxTitle')?.textContent?.trim()||'';
  return Library?.find?Library.find(name):{id:clean(name).replace(/ /g,'-'),name,aliases:[]};
}
function renderEmbedded(){
  const stage=$('#exerciseMotion');if(!stage)return;
  const exercise=currentExercise(),id=idFor(exercise);
  if(id){
    stage.innerHTML=`<div class="mb-youtube-stage"><div class="mb-youtube-frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?playsinline=1&rel=0" title="${esc(exercise.name)} YouTube demonstration" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><p class="mb-youtube-note">YouTube video plays inside MYBODY. Internet connection required.</p></div>`;
    return;
  }
  stage.innerHTML=`<div class="mb-youtube-empty"><strong>No verified YouTube demo mapped yet</strong><p>MYBODY could not recover a verified direct YouTube video for ${esc(exercise.name)}. Use <b>Offline · Database</b> for this exercise. No broken link or external redirect will be shown.</p></div>`;
}
function intercept(e){
  const b=e.target.closest?.('[data-media-source="youtube"]');
  if(!b)return;
  const box=$('#exerciseLightbox');if(!box||box.classList.contains('hidden'))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  box.querySelectorAll('.mb-media-source button').forEach(x=>x.classList.toggle('active',x===b));
  renderEmbedded();
}
function init(){document.addEventListener('click',intercept,true)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
window.MyBodyYouTubeRecovery=Object.freeze({idFor,renderEmbedded});
})();
