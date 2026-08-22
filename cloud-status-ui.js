/* MYBODY 2.0 - simple cloud status for users + detailed cloud health for admin. */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let adminWrapped=false;

function status(){
  const h=window.MyBodyCloudHealth?.getStatus?.()||{};
  const connected=Boolean(window.MyBodyCloud?.accountMatches?.());
  return {...h,connected};
}
function time(v){
  if(!v)return 'Never';
  const d=typeof v==='number'?new Date(v):new Date(String(v));
  return Number.isNaN(d.getTime())?'Never':d.toLocaleString();
}
function userLabel(s){
  if(!navigator.onLine)return ['Cloud unavailable','Device is offline'];
  if(!s.connected)return ['Cloud not connected','Connect cloud from Profile to sync your data'];
  if(s.ok===true)return ['Cloud synced',`Last successful check ${time(s.lastSuccessAt||s.checkedAt)}`];
  if(s.status==='request-failed'||s.status==='error'||s.status==='unavailable')return ['Sync pending',s.message||'Cloud check will retry automatically'];
  return ['Cloud connected',s.checkedAt?`Last checked ${time(s.checkedAt)}`:'Health check pending'];
}
function renderUserStatus(){
  const card=$('.cloud-auth-card');
  if(!card)return;
  let row=$('.mb-cloud-user-status',card);
  if(!row){
    row=document.createElement('div');row.className='mb-cloud-user-status';
    row.style.cssText='margin:12px 0;padding:11px 12px;border:1px solid rgba(160,255,45,.24);border-radius:12px;background:rgba(160,255,45,.055);text-align:left';
    const firstButton=card.querySelector('button');
    if(firstButton)card.insertBefore(row,firstButton);else card.appendChild(row);
  }
  const s=status(),[title,meta]=userLabel(s);
  row.innerHTML=`<div style="display:flex;align-items:center;gap:8px"><span aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:${s.ok===true&&s.connected&&navigator.onLine?'#a8ff2f':'#8d958d'};box-shadow:${s.ok===true&&s.connected&&navigator.onLine?'0 0 10px rgba(168,255,47,.45)':'none'}"></span><strong style="font-size:13px">${esc(title)}</strong></div><small style="display:block;margin-top:5px;opacity:.7;font-size:11px;line-height:1.35">${esc(meta)}</small>`;
}
function renderAdminHealth(){
  const body=$('#adminDashboardBody');
  if(!body||!window.MyBodyCloud?.isAdmin?.())return;
  let panel=$('.mb-cloud-health-admin',body);
  if(!panel){
    panel=document.createElement('div');panel.className='admin-card mb-cloud-health-admin';
    panel.style.cssText='margin:14px 0';
    body.prepend(panel);
  }
  const s=status();
  const health=s.ok===true&&s.connected&&navigator.onLine?'Healthy':(!navigator.onLine?'Offline':s.connected?'Attention':'Not connected');
  panel.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div><small>ADMIN ONLY</small><h3 style="margin:4px 0 0">Cloud Health</h3></div>
      <button type="button" class="secondary mb-cloud-health-refresh" style="min-height:38px;padding:7px 10px">Refresh</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px">
      <div style="padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:11px"><small>Supabase status</small><strong style="display:block;margin-top:3px">${esc(health)}</strong></div>
      <div style="padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:11px"><small>Account sync</small><strong style="display:block;margin-top:3px">${s.connected?'Connected':'Not connected'}</strong></div>
      <div style="padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:11px"><small>Last success</small><strong style="display:block;margin-top:3px;font-size:12px">${esc(time(s.lastSuccessAt))}</strong></div>
      <div style="padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:11px"><small>Last check</small><strong style="display:block;margin-top:3px;font-size:12px">${esc(time(s.checkedAt))}</strong></div>
    </div>
    <p style="margin:10px 0 0;opacity:.72;font-size:12px;line-height:1.4">Automatic health check: every 6 hours during normal app use. ${s.message?`Latest message: ${esc(s.message)}.`:''}</p>`;
  panel.querySelector('.mb-cloud-health-refresh').onclick=async e=>{
    const b=e.currentTarget;b.disabled=true;b.textContent='Checking…';
    try{await window.MyBodyCloudHealth?.check?.(true)}finally{setTimeout(()=>{renderAdminHealth();},120)}
  };
}
function scheduleProfile(){setTimeout(renderUserStatus,60);setTimeout(renderUserStatus,220)}
function wrapAdmin(){
  if(adminWrapped||!window.MyBodyAdminUI?.open)return false;
  const original=window.MyBodyAdminUI.open;
  window.MyBodyAdminUI.open=function(){
    const out=original.apply(this,arguments);
    setTimeout(renderAdminHealth,250);
    setTimeout(renderAdminHealth,800);
    setTimeout(renderAdminHealth,1600);
    return out;
  };
  adminWrapped=true;return true;
}
function init(){
  document.addEventListener('click',e=>{if(e.target.closest('#cloudAccountBtn'))scheduleProfile()},true);
  window.addEventListener('mybody:cloud-health',()=>{renderUserStatus();renderAdminHealth()});
  wrapAdmin();
  let tries=0;const t=setInterval(()=>{tries++;if(wrapAdmin()||tries>30)clearInterval(t)},200);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
