/* MYBODY 2.0 Apple Health Shortcut UX upgrade.
   - One-tap Shortcut installer on iPhone/iPad.
   - Automatic cloud retrieval every 30 minutes while MYBODY is active or reopened.
   - Automatically marks Shortcut sync ready when this profile already has a private token.
   - Sync now runs the Shortcut, then refreshes steps and returns to Today automatically. */
(function(){
'use strict';
const Store=window.MyBodyStore;
if(!Store)return;
const $=(s,r=document)=>r.querySelector(s);
const AUTO_PULL_MS=30*60*1000;
const SHORTCUT_READY_KEY='mybody.shortcut.ready.v1';
const SYNC_TOKEN_PREFIX='mybody.ios-sync.token.v1.';
const MANUAL_SYNC_PENDING='mybody.ios.manual-sync.pending.v2';
const MANUAL_SYNC_TTL=2*60*1000;
let autoTimer=null;
let resumeBusy=false;
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent||'')||((navigator.platform||'')==='MacIntel'&&(navigator.maxTouchPoints||0)>1);
const isNative=()=>Boolean(window.webkit?.messageHandlers?.healthkit);
const profileId=()=>localStorage.getItem(Store.SESSION_KEY)||'default';
const tokenKey=()=>`${SYNC_TOKEN_PREFIX}${profileId()}`;
function toast(message,type='success'){const el=$('#appToast');if(!el)return;el.textContent=message;el.dataset.type=type;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2400)}
function ensureShortcutReady(){
  if(!isIOS()||isNative())return false;
  const token=localStorage.getItem(tokenKey())||'';
  if(/^[a-f0-9]{64}$/.test(token)){
    if(localStorage.getItem(SHORTCUT_READY_KEY)!=='1')localStorage.setItem(SHORTCUT_READY_KEY,'1');
    return true;
  }
  return false;
}
function openHelp(){const sheet=$('#iosShortcutSheet');if(!sheet)return;sheet.classList.remove('hidden');document.body.classList.add('modal-open');sheet.querySelector('.sheet-panel')?.focus({preventScroll:true})}
function enhanceCard(){
  if(!isIOS()||isNative())return;
  const card=$('.ios-sync-card');if(!card)return;
  const setup=$('#setupIosShortcutBtn');
  if(setup){setup.textContent='Install Apple Health Sync';setup.setAttribute('aria-label','Install MYBODY Apple Health Shortcut');}
  const badge=$('#hourlySyncBadge');if(badge&&ensureShortcutReady())badge.textContent='30 min auto sync';
  const sync=$('#manualStepSyncBtn');if(sync)sync.setAttribute('aria-label','Sync Apple Health steps now');
  let info=$('#iosAutoSyncInfo');
  if(!info){
    info=document.createElement('div');info.id='iosAutoSyncInfo';info.className='settings-note';
    info.innerHTML='<b>Automatic step sync · every 30 min</b><p>The Shortcut can upload Apple Health steps in the background. MYBODY checks every 30 minutes while active. <strong>Sync now</strong> runs the Shortcut, then refreshes your steps and returns to Today automatically.</p><div class="sync-actions"><button id="iosShortcutHelpBtn" class="secondary" type="button">Setup help</button><button id="openShortcutsAutomationBtn" class="secondary" type="button">Open Shortcuts</button></div>';
    $('#stepSyncPrivacy',card)?.insertAdjacentElement('beforebegin',info);
    $('#iosShortcutHelpBtn',info)?.addEventListener('click',openHelp);
    $('#openShortcutsAutomationBtn',info)?.addEventListener('click',()=>{location.href='shortcuts://';});
  }
}
function enhanceSheet(){
  const sheet=$('#iosShortcutSheet');if(!sheet)return;
  const title=$('#iosShortcutTitle');if(title)title.textContent='Apple Health step sync';
  const callout=sheet.querySelector('.shortcut-callout');if(callout)callout.innerHTML='<b>One-tap install</b><p>Tap <strong>Install Apple Health Sync</strong>. MYBODY copies your private token and opens Apple’s Shortcut installer. Run the Shortcut once to approve Steps access.</p>';
  const install=$('#createIosShortcutBtn');if(install)install.textContent='Install Apple Health Sync';
  const limit=sheet.querySelector('.shortcut-limit');if(limit)limit.innerHTML='For background uploads, keep your Shortcuts Time of Day automation set to <strong>Run Immediately</strong>. MYBODY checks for a new uploaded step total every <strong>30 minutes</strong> while active and immediately whenever the app is reopened.';
}
function oneTapInstall(event){
  if(!isIOS()||isNative())return;
  const btn=event.target.closest('#setupIosShortcutBtn');if(!btn)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  const api=window.MyBodyHealthSync;
  if(!api?.installShortcut){toast('Apple Health setup is still loading. Try again in a moment.','error');return;}
  api.installShortcut();
  setTimeout(ensureShortcutReady,300);
}
async function autoPull(force=false){
  if(!isIOS()||isNative()||document.hidden||!navigator.onLine)return false;
  ensureShortcutReady();
  const api=window.MyBodyHealthSync;if(!api?.pullCloudSteps)return false;
  try{return await api.pullCloudSteps({force,feedback:false});}catch(_){return false}
}
function goToday(){
  const tab=$('[data-tab="today"],#today-tab');
  if(tab){tab.click();return}
  window.dispatchEvent(new CustomEvent('mybody:navigate',{detail:{id:'today'}}));
}
function markManualSync(){
  if(!isIOS()||isNative())return;
  localStorage.setItem(MANUAL_SYNC_PENDING,String(Date.now()));
}
function manualSyncPending(){
  const started=Number(localStorage.getItem(MANUAL_SYNC_PENDING)||0);
  if(!started)return false;
  if(Date.now()-started>MANUAL_SYNC_TTL){localStorage.removeItem(MANUAL_SYNC_PENDING);return false}
  return true;
}
async function finishManualSync(){
  if(resumeBusy||!manualSyncPending()||document.hidden)return false;
  resumeBusy=true;
  try{
    let updated=false;
    for(const delay of [350,1100,2200,3500]){
      await new Promise(r=>setTimeout(r,delay));
      const value=await autoPull(true);
      if(value!==false&&value!==undefined&&value!==null){updated=true;break}
    }
    localStorage.removeItem(MANUAL_SYNC_PENDING);
    goToday();
    if(updated)toast('Apple Health steps updated');
    else toast('Sync finished. MYBODY will keep checking for the new step total.');
    return updated;
  }finally{resumeBusy=false}
}
function startAutoPull(){
  clearInterval(autoTimer);
  autoTimer=setInterval(()=>autoPull(true),AUTO_PULL_MS);
  setTimeout(()=>autoPull(true),800);
}
function init(){
  ensureShortcutReady();enhanceCard();enhanceSheet();
  document.addEventListener('click',oneTapInstall,true);
  document.addEventListener('click',e=>{if(e.target.closest('#manualStepSyncBtn,#quickStepSyncBtn'))markManualSync()},true);
  window.addEventListener('focus',()=>{if(manualSyncPending())finishManualSync();else setTimeout(()=>autoPull(true),250)});
  window.addEventListener('pageshow',()=>{if(manualSyncPending())finishManualSync();else setTimeout(()=>autoPull(true),350)});
  window.addEventListener('online',()=>setTimeout(()=>autoPull(true),350));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(manualSyncPending())finishManualSync();else setTimeout(()=>autoPull(true),250)}});
  window.addEventListener('mybody:steps-synced',()=>{enhanceCard()});
  startAutoPull();
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
window.MyBodyIOSHealthUpgrade=Object.freeze({autoPull,openHelp,ensureShortcutReady,finishManualSync});
})();