/* Apple Health bridge for the PWA.
   Safari/PWAs cannot read HealthKit directly. This module supports a one-tap
   Apple Shortcuts x-callback flow and is future-ready for a native HealthKit bridge.
*/
(function(){
  const STORAGE_KEY='decemberTracker.v1';
  const SHORTCUT_NAME='Sync Tausif Steps';
  const today=()=>new Date().toLocaleDateString('en-CA');
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function load(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch{return{}}
  }
  function saveSteps(steps,source='Apple Health'){
    const value=Math.max(0,Math.round(Number(steps)||0));
    if(!value)return false;
    const s=load();
    s.activity=s.activity||{};
    const k=today();
    s.activity[k]={...(s.activity[k]||{}),steps:value,stepsSource:source,stepsSyncedAt:new Date().toISOString()};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
    return true;
  }
  function stateForToday(){
    const s=load(),a=s.activity?.[today()]||{};
    return {steps:Number(a.steps)||0,source:a.stepsSource||'Manual',syncedAt:a.stepsSyncedAt||''};
  }
  function formatTime(iso){
    if(!iso)return 'Not synced yet';
    const d=new Date(iso);return Number.isNaN(d.getTime())?'Not synced yet':`Last sync ${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
  }
  function baseUrl(){
    const u=new URL(location.href);u.search='';u.hash='';return u.toString();
  }
  function shortcutUrl(){
    const success=new URL(baseUrl());
    success.searchParams.set('healthcallback','1');
    return `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}&x-success=${encodeURIComponent(success.toString())}`;
  }
  function syncNow(){location.href=shortcutUrl()}
  function processCallback(){
    const u=new URL(location.href),isCallback=u.searchParams.get('healthcallback')==='1';
    if(!isCallback)return false;
    const result=u.searchParams.get('result');
    const match=String(result||'').match(/([0-9][0-9,]*)/);
    const steps=match?Number(match[1].replace(/,/g,'')):0;
    const ok=saveSteps(steps,'Apple Health');
    u.searchParams.delete('healthcallback');u.searchParams.delete('result');u.searchParams.delete('errorMessage');
    history.replaceState({},'',u.pathname+(u.search?u.search:'')+u.hash);
    return ok;
  }
  function injectCard(){
    const settings=document.querySelector('#settings .form-card');
    if(!settings||document.getElementById('appleHealthCard'))return;
    const current=stateForToday();
    const card=document.createElement('section');
    card.id='appleHealthCard';
    card.className='settings-note';
    card.innerHTML=`<b>Apple Health steps</b><p id="healthSyncStatus">${esc(current.steps?`${current.steps.toLocaleString()} steps • ${current.source} • ${formatTime(current.syncedAt)}`:'Not synced yet')}</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button id="healthSyncBtn" type="button" class="secondary"> Sync Apple Health</button><button id="healthHelpBtn" type="button" class="text-btn">Setup help</button></div><p class="muted-copy" style="margin-top:8px">The web app cannot read HealthKit directly. The sync button runs an iPhone Shortcut and returns today's step total to this tracker.</p>`;
    settings.insertBefore(card,settings.querySelector('#saveSettings'));
    document.getElementById('healthSyncBtn')?.addEventListener('click',syncNow);
    document.getElementById('healthHelpBtn')?.addEventListener('click',()=>{
      alert(`Create an iPhone Shortcut named “${SHORTCUT_NAME}”.\n\n1. Add Find Health Samples.\n2. Type: Steps.\n3. Filter Start Date is Today.\n4. Add Calculate Statistics and choose Sum.\n5. Make the final shortcut output the summed number.\n\nThen return here and tap Sync Apple Health.`)
    });
  }
  function injectQuickSync(){
    const quick=document.querySelector('#today .form-card');
    if(!quick||document.getElementById('quickHealthSync'))return;
    const row=document.createElement('div');row.id='quickHealthSync';row.className='settings-note';row.style.marginTop='12px';
    const cur=stateForToday();
    row.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><b> Apple Health steps</b><p id="quickHealthStatus">${esc(cur.steps?`${cur.steps.toLocaleString()} steps • ${formatTime(cur.syncedAt)}`:'Tap Sync to import today’s steps')}</p></div><button id="quickHealthBtn" type="button" class="secondary">Sync steps</button></div>`;
    quick.appendChild(row);document.getElementById('quickHealthBtn')?.addEventListener('click',syncNow);
  }
  function refreshLabels(){
    const cur=stateForToday();
    const full=cur.steps?`${cur.steps.toLocaleString()} steps • ${cur.source} • ${formatTime(cur.syncedAt)}`:'Not synced yet';
    const short=cur.steps?`${cur.steps.toLocaleString()} steps • ${formatTime(cur.syncedAt)}`:'Tap Sync to import today’s steps';
    const a=document.getElementById('healthSyncStatus'),b=document.getElementById('quickHealthStatus');if(a)a.textContent=full;if(b)b.textContent=short;
  }
  function init(){
    const imported=processCallback();injectQuickSync();injectCard();refreshLabels();
    if(imported){const input=document.getElementById('stepsInput'),cur=stateForToday();if(input)input.value=cur.steps;setTimeout(()=>location.reload(),150)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.appleHealthSteps={syncNow,saveSteps};
})();