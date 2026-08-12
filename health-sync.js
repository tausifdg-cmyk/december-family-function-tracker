/* Apple Health bridge.
   In the native iOS wrapper this talks to HealthKit through WKWebView and updates
   the existing screen in place. In Safari/PWA mode Apple does not expose HealthKit,
   so the app keeps manual step entry available instead of launching a new page.
*/
(function(){
  const STORAGE_KEY='decemberTracker.v1';
  const today=()=>new Date().toLocaleDateString('en-CA');
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const nativeBridge=()=>window.webkit?.messageHandlers?.healthkit;

  function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch{return{}}}
  function saveSteps(steps,source='Apple Health',syncedAt=new Date().toISOString()){
    const value=Math.max(0,Math.round(Number(steps)||0));
    const s=load();s.activity=s.activity||{};const k=today();
    s.activity[k]={...(s.activity[k]||{}),steps:value,stepsSource:source,stepsSyncedAt:syncedAt||new Date().toISOString()};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
    return value;
  }
  function stateForToday(){const s=load(),a=s.activity?.[today()]||{};return{steps:Number(a.steps)||0,source:a.stepsSource||'Manual',syncedAt:a.stepsSyncedAt||''}}
  function formatTime(iso){if(!iso)return'Not synced yet';const d=new Date(iso);return Number.isNaN(d.getTime())?'Not synced yet':`Last sync ${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`}
  function isNative(){return !!nativeBridge()}
  function requestNative(action='syncSteps'){
    const bridge=nativeBridge();
    if(!bridge){showWebNotice();return false}
    bridge.postMessage({action});return true;
  }
  function syncNow(){return requestNative('syncSteps')}
  function receiveNativeSteps(payload){
    const p=payload||{};
    if(p.error){setStatus(`Apple Health: ${p.error}`);return false}
    const steps=saveSteps(p.steps,'Apple Health',p.syncedAt||new Date().toISOString());
    const input=document.getElementById('stepsInput');if(input)input.value=steps;
    refreshLabels();
    window.dispatchEvent(new CustomEvent('tausif-health-steps',{detail:{steps,source:'Apple Health'}}));
    // Re-render the existing dashboard without navigating or reloading.
    if(typeof renderAll==='function')renderAll();
    return true;
  }
  function setStatus(text){const a=document.getElementById('healthSyncStatus'),b=document.getElementById('quickHealthStatus');if(a)a.textContent=text;if(b)b.textContent=text}
  function showWebNotice(){
    setStatus('Apple Health direct sync is available in the iPhone app. Manual Steps entry still works here.');
    const input=document.getElementById('stepsInput');input?.focus();
  }
  function injectCard(){
    const settings=document.querySelector('#settings .form-card');if(!settings||document.getElementById('appleHealthCard'))return;
    const current=stateForToday(),native=isNative();const card=document.createElement('section');card.id='appleHealthCard';card.className='settings-note';
    card.innerHTML=`<b>Apple Health steps</b><p id="healthSyncStatus">${esc(current.steps?`${current.steps.toLocaleString()} steps • ${current.source} • ${formatTime(current.syncedAt)}`:(native?'Ready to sync':'Native iPhone app required for direct Health sync'))}</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button id="healthSyncBtn" type="button" class="secondary">${native?' Sync now':' Apple Health'}</button></div><p class="muted-copy" style="margin-top:8px">${native?'Sync stays on this screen. HealthKit also refreshes the cached step total in the background when iOS delivers updates.':'Safari/Home Screen apps cannot read HealthKit directly. Use the Steps field manually, or install the native iPhone version.'}</p>`;
    settings.insertBefore(card,settings.querySelector('#saveSettings'));document.getElementById('healthSyncBtn')?.addEventListener('click',syncNow);
  }
  function injectQuickSync(){
    const quick=document.querySelector('#today .form-card');if(!quick||document.getElementById('quickHealthSync'))return;
    const cur=stateForToday(),native=isNative();const row=document.createElement('div');row.id='quickHealthSync';row.className='settings-note';row.style.marginTop='12px';
    row.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><b> Apple Health steps</b><p id="quickHealthStatus">${esc(cur.steps?`${cur.steps.toLocaleString()} steps • ${formatTime(cur.syncedAt)}`:(native?'Ready to sync on this screen':'Manual steps in web version'))}</p></div><button id="quickHealthBtn" type="button" class="secondary">${native?'Sync steps':'Health sync'}</button></div>`;
    quick.appendChild(row);document.getElementById('quickHealthBtn')?.addEventListener('click',syncNow);
  }
  function refreshLabels(){const cur=stateForToday(),full=cur.steps?`${cur.steps.toLocaleString()} steps • ${cur.source} • ${formatTime(cur.syncedAt)}`:'Not synced yet',short=cur.steps?`${cur.steps.toLocaleString()} steps • ${formatTime(cur.syncedAt)}`:'Ready to sync';const a=document.getElementById('healthSyncStatus'),b=document.getElementById('quickHealthStatus');if(a)a.textContent=full;if(b)b.textContent=short}
  function init(){injectQuickSync();injectCard();refreshLabels();if(isNative())requestNative('requestSteps')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.appleHealthSteps={syncNow,saveSteps,receiveNativeSteps,isNative};
})();
