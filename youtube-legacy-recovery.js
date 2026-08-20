/* MYBODY 2.0 verified YouTube exercise demos.
   Covers the full exercise library and the admin/default workout names.
   Uses the YouTube IFrame Player API so blocked/removed videos can fail over
   to another vetted candidate instead of leaving a broken player. */
(function(){
'use strict';
const Library=window.MyBodyExerciseLibrary;
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
let player=null,renderToken=0,apiPromise=null;

/* Vetted exercise-demo candidates. First item is preferred; later items are fallbacks
   if YouTube reports unavailable, removed or embedding-disabled (100/101/150). */
const BY_ID=Object.freeze({
  'dumbbell-bench-press':['CayG6UYqL8g'],
  'incline-dumbbell-press':['HFVwgST_WG4','oZVCBM9f8Eo','4eusnSBHniE','oS2Uy3MAbgs'],
  'dumbbell-chest-fly':['903TCjHpD4Y','Lw6A9NCwReU'],
  'squeeze-press':['CayG6UYqL8g','HFVwgST_WG4'],
  'dumbbell-pullover':['5YStMv6m2g8','32auHIqgEoM'],
  'one-arm-dumbbell-row':['dFzUjzfih7k','5foJiIVhs8Q'],
  'lat-pulldown':['lueEJGjTuPQ','32auHIqgEoM'],
  'seated-cable-row':['xQNrFHEMhI4','sP_4vybjVJs','k7n0GsKjILM','cGDmBmTwG58'],
  'front-press':['qEwKCR5JCog','Ia9DYFMkMmU','nhIDkyF4Rvo'],
  'upright-row':['K0dYqPCaO14'],
  'arnold-press':['Tux8PGVa9wQ','6Z15_WdXmVw','odhXwoS3mDA'],
  'lateral-raise':['PzsMitRdI_8'],
  'rear-delt-fly':['EA7u4Q_8HQ0'],
  'decline-shrug':['8lP_eJvClSA','YeILDnoeYEk'],
  'dumbbell-biceps-curl':['ykJmrZ5v0Oo','HU2lghjU29Y','pQfJR-sSIvA'],
  'hammer-curl':['TwD-YGVP4Bk','BRVDS6HVR9Q','QZN2PcBFAwg'],
  'incline-curl':['HhHHBj3qTJ4','F5CCxCnGN54'],
  'rope-pushdown':['2-LAMcpzODU','b17-9f6SmgA'],
  'overhead-triceps-extension':['_gsUck-7M74','T1EO7u2n7WU','hS82Wlo67O0'],
  'wrist-curl':['VGkF2NTtao0','S-ynXc4M-mY'],
  'romanian-deadlift':['xgusDooVfKU'],
  'back-squat':['kjlfpqXnyL8','BjGLs6KGWUc'],
  'sumo-squat':['kjlfpqXnyL8'],
  'leg-press':['cDGOn-yfKJA'],
  'leg-curl':['jxctD6fL_FQ','Dq5y4WEcqqo'],
  'leg-extension':['yR_LqZYSIgM'],
  'calf-raise':['-M4-G8p8fmc'],
  'glute-bridge':['LFvZ-d4rDac'],
  'hip-adduction':['kjlfpqXnyL8'],
  'russian-twist':['wkD8rjkodUI','JyUqwkVpsi8'],
  'v-sit-twist':['wkD8rjkodUI','JyUqwkVpsi8'],
  'flutter-kicks':['hq_0YlyfqGM'],
  'v-sit-hold':['3tQuBuZLma4'],
  'mountain-climber':['hq_0YlyfqGM'],
  'standing-knee-crunch':['hq_0YlyfqGM'],
  'seated-knee-tuck':['3tQuBuZLma4'],
  'plank':['mwlp75MS6Rg'],
  'cable-crunch':['wkD8rjkodUI'],
  'dumbbell-thruster':['2F7obW0u3Uc','tAxpvB1xRGQ'],
  'reverse-lunge':['8TNK5mD0UfM','SkNsa3eBwLA'],
  'bird-dog':['GlOpvsoCzeU','55Ij-z8vs4U','RlN8pKgKUN0'],
  'lower-back-rotation':['GlOpvsoCzeU','LFvZ-d4rDac']
});

/* Exact workout-name overrides are important because several plan exercises are variations
   that intentionally resolve to a close library movement. */
const BY_NAME=Object.freeze({
  'bench press':['CayG6UYqL8g'],
  'barbell bench press':['CayG6UYqL8g'],
  'machine chest press':['CayG6UYqL8g'],
  'incline db press':['HFVwgST_WG4','oZVCBM9f8Eo','oS2Uy3MAbgs'],
  'incline dumbbell press':['HFVwgST_WG4','oZVCBM9f8Eo','oS2Uy3MAbgs'],
  'incline bench press':['BjGLs6KGWUc','HFVwgST_WG4'],
  'incline smith press':['BjGLs6KGWUc','HFVwgST_WG4'],
  'decline machine press':['CayG6UYqL8g'],
  'cable chest fly':['903TCjHpD4Y','Lw6A9NCwReU'],
  'cable fly':['903TCjHpD4Y','Lw6A9NCwReU'],
  'cable crossover lower chest':['903TCjHpD4Y','Lw6A9NCwReU'],
  'low to high cable fly':['903TCjHpD4Y','Lw6A9NCwReU'],
  'pec deck fly':['903TCjHpD4Y','Lw6A9NCwReU'],
  'push ups finisher':['T54umm0lPe4','_l3ySVKYVJ8'],
  'push ups':['T54umm0lPe4','_l3ySVKYVJ8'],
  'cable rope pushdown':['2-LAMcpzODU','b17-9f6SmgA'],
  'rope pushdown':['2-LAMcpzODU','b17-9f6SmgA'],
  'reverse grip pushdown':['2-LAMcpzODU','b17-9f6SmgA'],
  'skull crushers':['sDxcKjCqXAo','lcmxokwc3ag','_lZIx3P2BY4'],
  'single arm overhead extension':['_gsUck-7M74','T1EO7u2n7WU'],
  'rope overhead extension':['_gsUck-7M74','T1EO7u2n7WU','hS82Wlo67O0'],
  'overhead cable extension':['_gsUck-7M74','T1EO7u2n7WU'],
  'close grip bench press smith':['Kr1zb_QG3nw','CayG6UYqL8g'],
  'tricep kickback':['qkZBtEHUjfw','b17-9f6SmgA'],
  'dips':['rbcQpIgdvMk'],
  'wide grip lat pulldown':['lueEJGjTuPQ','32auHIqgEoM'],
  'single arm lat pulldown':['lueEJGjTuPQ','32auHIqgEoM'],
  'neutral grip pulldown':['lueEJGjTuPQ','32auHIqgEoM'],
  'pulldown':['lueEJGjTuPQ','32auHIqgEoM'],
  'straight arm pulldown':['32auHIqgEoM','lueEJGjTuPQ'],
  'rope pullovers':['32auHIqgEoM','5YStMv6m2g8'],
  'chest supported row':['dFzUjzfih7k','xQNrFHEMhI4'],
  't bar row':['5foJiIVhs8Q','dFzUjzfih7k'],
  'unilateral cable row':['xQNrFHEMhI4','dFzUjzfih7k'],
  'machine row wide chest supported':['xQNrFHEMhI4','dFzUjzfih7k'],
  'barbell curl':['ykJmrZ5v0Oo','pQfJR-sSIvA'],
  'alternating db curl':['ykJmrZ5v0Oo','HU2lghjU29Y'],
  'machine preacher curl':['WK5yZMlgMb4','ykJmrZ5v0Oo'],
  'ez bar curl':['ykJmrZ5v0Oo','pQfJR-sSIvA'],
  'incline db curl':['HhHHBj3qTJ4','F5CCxCnGN54'],
  'spider curl':['ykJmrZ5v0Oo','HhHHBj3qTJ4'],
  'reverse curl':['3FjPUEF2UJA','ykJmrZ5v0Oo'],
  'seated shoulder press':['qEwKCR5JCog','Ia9DYFMkMmU'],
  'standing ohp':['nhIDkyF4Rvo','qEwKCR5JCog'],
  'front raises':['NxSuojHZa8k','PzsMitRdI_8'],
  'lateral raises':['PzsMitRdI_8'],
  'cable lateral raise':['PzsMitRdI_8'],
  'rear delt fly':['EA7u4Q_8HQ0'],
  'reverse pec deck':['EA7u4Q_8HQ0'],
  'db upright row':['K0dYqPCaO14'],
  'leg press':['cDGOn-yfKJA'],
  'hack squat smith squat':['kjlfpqXnyL8'],
  'barbell squat smith squat':['kjlfpqXnyL8'],
  'bulgarian split squat':['SkNsa3eBwLA'],
  'leg extension slow reps':['yR_LqZYSIgM'],
  'hamstring curl':['jxctD6fL_FQ','Dq5y4WEcqqo'],
  'standing calf raise':['-M4-G8p8fmc'],
  'romanian deadlift':['xgusDooVfKU']
});

function validId(v){return /^[A-Za-z0-9_-]{11}$/.test(String(v||''))}
function unique(list){return [...new Set((list||[]).filter(validId))]}
function currentTitle(){return $('#exerciseLightboxTitle')?.textContent?.trim()||''}
function currentExercise(){const name=currentTitle();return Library?.find?Library.find(name):{id:clean(name).replace(/ /g,'-'),name,aliases:[]}}
function candidatesFor(exercise,name=currentTitle()){
  const exact=BY_NAME[clean(name)];
  if(exact?.length)return unique(exact);
  const byId=BY_ID[exercise?.id];
  if(byId?.length)return unique(byId);
  for(const n of [exercise?.name,...(exercise?.aliases||[])]){
    const hit=BY_NAME[clean(n)];if(hit?.length)return unique(hit);
  }
  return [];
}
function destroyPlayer(){renderToken++;try{player?.destroy?.()}catch(_){ }player=null}
function setStatus(text,kind=''){const el=$('#mbYoutubeStatus');if(el){el.textContent=text;el.dataset.kind=kind}}
function showFailure(exercise){
  const stage=$('#exerciseMotion');if(!stage)return;
  stage.innerHTML=`<div class="mb-youtube-empty"><strong>YouTube demo unavailable right now</strong><p>No vetted embedded candidate for ${esc(exercise?.name||currentTitle())} could be played. Use <b>Offline · Database</b> for the cached demonstration.</p><button type="button" class="secondary" data-media-source="offline">Use offline demo</button></div>`;
}
function loadApi(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(apiPromise)return apiPromise;
  apiPromise=new Promise((resolve,reject)=>{
    const started=Date.now();
    const done=()=>window.YT?.Player?resolve(window.YT):null;
    const prior=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=function(){try{prior?.()}catch(_){ }done()};
    if(!document.querySelector('script[data-mybody-youtube-api]')){
      const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.async=true;s.dataset.mybodyYoutubeApi='1';s.onerror=()=>reject(new Error('YouTube API failed to load'));document.head.appendChild(s);
    }
    const timer=setInterval(()=>{if(done())clearInterval(timer);else if(Date.now()-started>10000){clearInterval(timer);reject(new Error('YouTube API timeout'))}},100);
  });
  return apiPromise;
}
async function mountCandidate(exercise,candidates,index,token){
  if(token!==renderToken)return;
  if(index>=candidates.length){showFailure(exercise);return}
  const id=candidates[index],mount=$('#mbYoutubePlayer');if(!mount)return;
  setStatus(index?'Trying another verified demo…':'Loading verified YouTube demo…','loading');
  try{
    const YT=await loadApi();if(token!==renderToken||!$('#mbYoutubePlayer'))return;
    try{player?.destroy?.()}catch(_){ }player=null;
    player=new YT.Player('mbYoutubePlayer',{
      videoId:id,
      width:'100%',height:'100%',
      playerVars:{playsinline:1,rel:0,controls:1,fs:1,origin:location.origin},
      events:{
        onReady:()=>{if(token===renderToken)setStatus('Verified YouTube demo · internet required','ready')},
        onError:(event)=>{
          if(token!==renderToken)return;
          const code=Number(event?.data);
          if([2,5,100,101,150].includes(code)){
            const frame=$('.mb-youtube-frame');if(frame)frame.innerHTML='<div id="mbYoutubePlayer"></div>';
            mountCandidate(exercise,candidates,index+1,token);
          }else setStatus('YouTube playback error. Try again or use Offline · Database.','error');
        }
      }
    });
  }catch(_){if(token===renderToken){setStatus('Could not connect to YouTube. Check internet or use Offline · Database.','error')}}
}
function renderEmbedded(){
  destroyPlayer();
  const stage=$('#exerciseMotion');if(!stage)return;
  const exercise=currentExercise(),candidates=candidatesFor(exercise),token=++renderToken;
  if(!candidates.length){showFailure(exercise);return}
  stage.innerHTML=`<div class="mb-youtube-stage"><div class="mb-youtube-frame"><div id="mbYoutubePlayer"></div></div><p id="mbYoutubeStatus" class="mb-youtube-note" data-kind="loading">Loading verified YouTube demo…</p></div>`;
  mountCandidate(exercise,candidates,0,token);
}
function coverage(){
  const exercises=Array.isArray(Library?.exercises)?Library.exercises:[];
  const missing=exercises.filter(x=>!candidatesFor(x,x.name).length).map(x=>x.name);
  return {mapped:exercises.length-missing.length,total:exercises.length,missing};
}
function intercept(e){
  const youtube=e.target.closest?.('[data-media-source="youtube"]');
  const offline=e.target.closest?.('[data-media-source="offline"]');
  const box=$('#exerciseLightbox');if(!box||box.classList.contains('hidden'))return;
  if(offline){destroyPlayer();return}
  if(!youtube)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  box.querySelectorAll('.mb-media-source button').forEach(x=>x.classList.toggle('active',x===youtube));
  renderEmbedded();
}
function init(){
  /* Ignore obsolete user-pasted links: verified mappings are authoritative. */
  try{localStorage.removeItem('mybody.youtube.exercise-links.v1')}catch(_){ }
  document.addEventListener('click',intercept,true);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-action="close-exercise-media"]'))destroyPlayer()},true);
  const result=coverage();if(result.missing.length)console.warn('MYBODY YouTube coverage missing:',result.missing);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
window.MyBodyYouTubeRecovery=Object.freeze({candidatesFor,renderEmbedded,coverage,destroyPlayer});
})();
