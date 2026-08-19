/* MYBODY 2.0 Apple Health Shortcut UX upgrade.
   - One-tap Shortcut installer on iPhone/iPad.
   - Automatic cloud retrieval while MYBODY is active or reopened.
   - Clear status for the Apple-required personal automation that performs true background uploads. */
(function(){
'use strict';
const Store=window.MyBodyStore;
if(!Store)return;
const $=(s,r=document)=>r.querySelector(s);
const AUTO_PULL_MS=5*60*1000;
let autoTimer=null;
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent||'')||((navigator.platform||'')==='MacIntel'&&(navigator.maxTouchPoints||0)>1);
const isNative=()=>Boolean(window.webkit?.messageHandlers?.healthkit);
function toast(message,type='success'){const el=$('#appToast');if(!el)return;el.textContent=message;el.dataset.type=type;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2400)}
function openHelp(){const sheet=$('#iosShortcutSheet');if(!sheet)return;sheet.classList.remove('hidden');document.body.classList.add('modal-open');sheet.querySelector('.sheet-panel')?.focus({preventScroll:true})}
function enhanceCard(){
  if(!isIOS()||isNative())return;
  const card=$('.ios-sync-card');if(!card)return;
  const setup=$('#setupIosShortcutBtn');
  if(setup){setup.textContent='Install Apple Health Sync';setup.setAttribute('aria-label','Install MYBODY Apple Health Shortcut');}
  let info=$('#iosAutoSyncInfo');
  if(!info){
    info=document.createElement('div');info.id='iosAutoSyncInfo';info.className='settings-note';
    info.innerHTML='<b>Automatic step sync</b><p>MYBODY checks for the latest Apple Health upload automatically while the app is open and whenever you return. For uploads while MYBODY is closed, enable a Shortcuts Time of Day automation with <strong>Run Immediately</strong>.</p><div class="sync-actions"><button id="iosShortcutHelpBtn" class="secondary" type="button">Setup help</button><button id="openShortcutsAutomationBtn" class="secondary" type="button">Open Shortcuts</button></div>';
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
  const limit=sheet.querySelector('.shortcut-limit');if(limit)limit.innerHTML='Apple does not allow a website or shared Shortcut to silently create Personal Automations. To sync while MYBODY is closed, create a <strong>Time of Day</strong> automation in Shortcuts, choose <strong>MYBODY step Sync</strong>, and select <strong>Run Immediately</strong>. MYBODY automatically retrieves each uploaded total when active.';
}
function oneTapInstall(event){
  if(!isIOS()||isNative())return;
  const btn=event.target.closest('#setupIosShortcutBtn');if(!btn)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  const api=window.MyBodyHealthSync;
  if(!api?.installShortcut){toast('Apple Health setup is still loading. Try again in a moment.','error');return;}
  api.installShortcut();
}
async function autoPull(force=false){
  if(!isIOS()||isNative()||document.hidden||!navigator.onLine)return;
  const api=window.MyBodyHealthSync;if(!api?.pullCloudSteps)return;
  try{await api.pullCloudSteps({force,feedback:false});}catch(_){ }
}
function startAutoPull(){
  clearInterval(autoTimer);
  autoTimer=setInterval(()=>autoPull(false),AUTO_PULL_MS);
  setTimeout(()=>autoPull(false),1200);
}
function init(){
  enhanceCard();enhanceSheet();
  document.addEventListener('click',oneTapInstall,true);
  window.addEventListener('focus',()=>setTimeout(()=>autoPull(true),350));
  window.addEventListener('pageshow',()=>setTimeout(()=>autoPull(true),500));
  window.addEventListener('online',()=>setTimeout(()=>autoPull(true),500));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>autoPull(true),350)});
  window.addEventListener('mybody:steps-synced',()=>enhanceCard());
  startAutoPull();
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
window.MyBodyIOSHealthUpgrade=Object.freeze({autoPull,openHelp});
})();