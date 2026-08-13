/* Phone Steps bridge. In a native WKWebView wrapper this talks to CMPedometer/Core Motion. In the PWA it keeps manual entry available and never leaves the app. */
(function(){
 const KEY='decemberTracker.v1', today=()=>new Date().toLocaleDateString('en-CA');
 const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
 const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
 function nativeBridge(){return window.webkit?.messageHandlers?.pedometer}
 function setStatus(text,ok=false){const e=document.getElementById('phoneStepsStatus');if(e){e.textContent=text;e.classList.toggle('ok',ok)}}
 function applySteps(steps,source='iPhone Motion'){
   steps=Math.max(0,Math.round(Number(steps)||0));
   const s=load(),k=today();s.activity=s.activity||{};s.activity[k]={...(s.activity[k]||{}),steps,stepSource:source,stepSyncedAt:new Date().toISOString()};save(s);
   const input=document.getElementById('stepsInput');if(input)input.value=steps;
   try{if(typeof state!=='undefined'){state.activity[k]={...(state.activity[k]||{}),steps,stepSource:source,stepSyncedAt:new Date().toISOString()};if(typeof renderAll==='function')renderAll()}}catch{}
   setStatus(`${steps.toLocaleString()} steps • ${source}`,true);
 }
 window.TausifPhoneSteps={receive:applySteps,error:msg=>setStatus(msg||'Could not read phone steps')};
 function sync(){
   if(nativeBridge()){setStatus('Reading iPhone Motion & Fitness…');nativeBridge().postMessage({action:'todaySteps'});return}
   setStatus('Phone sensor sync requires the native iPhone build. Manual steps still work in this web app.');
 }
 function init(){
   const steps=document.getElementById('stepsInput');if(!steps||document.getElementById('phoneStepsSync'))return;
   const box=document.createElement('div');box.className='settings-note';box.style.marginTop='12px';box.innerHTML='<b>Steps source</b><p id="phoneStepsStatus">Manual steps are active.</p><button type="button" id="phoneStepsSync" class="secondary full">📱 Sync Phone Steps</button><small style="display:block;margin-top:8px">Uses iPhone Motion & Fitness in the native app. No Apple Health permission required.</small>';
   steps.closest('.form-card')?.appendChild(box);document.getElementById('phoneStepsSync')?.addEventListener('click',sync);
   const s=load(),a=s.activity?.[today()];if(a?.stepSource)setStatus(`${Number(a.steps||0).toLocaleString()} steps • ${a.stepSource}`,true);
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();