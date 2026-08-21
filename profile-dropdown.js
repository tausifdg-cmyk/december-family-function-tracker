/* MYBODY 2.0 profile dropdown */
(function(){
  'use strict';
  const DATA_KEY='decemberTracker.v1';
  const ADMIN_EMAIL='tausifdg@gmail.com';
  const SHARE_MESSAGE=`MYBODY 2.0
iPhone / iPad app: https://tausifdg-cmyk.github.io/december-family-function-tracker/

Android APK: https://github.com/tausifdg-cmyk/december-family-function-tracker/releases/download/android-latest/mybody-android.apk

Web: https://tausifdg-cmyk.github.io/december-family-function-tracker/`;
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function profileData(){
    let local=null,data={};
    try{ local=window.MyBodyCloud?.localAccount?.()||null; }catch{}
    try{ data=JSON.parse(localStorage.getItem(DATA_KEY)||'{}')||{}; }catch{}
    const email=String(local?.email||data?.profile?.email||'').trim().toLowerCase();
    return {
      name:data?.profile?.name||local?.name||'User',
      email,
      admin:email===ADMIN_EMAIL||Boolean(window.MyBodyCloud?.isAdmin?.())
    };
  }
  function closeMenu(){
    document.getElementById('profileDropdownCard')?.remove();
    document.getElementById('cloudAccountBtn')?.setAttribute('aria-expanded','false');
  }
  async function shareApp(msg){
    let copied=false;
    try{
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(SHARE_MESSAGE);copied=true;}
    }catch{}
    try{
      if(navigator.share){
        await navigator.share({text:SHARE_MESSAGE});
        if(msg)msg.textContent=copied?'Exact share message copied too.':'Shared.';
        return;
      }
      if(msg)msg.textContent=copied?'Exact share message copied. Paste it into WhatsApp, Messages or Email.':'Unable to share right now.';
    }catch(e){
      if(e?.name==='AbortError'){if(msg&&copied)msg.textContent='Exact share message copied. You can paste it anywhere.';return;}
      if(msg)msg.textContent=copied?'Exact share message copied. Paste it into the app you want.':'Unable to share right now.';
    }
  }
  function style(){
    if(document.getElementById('profileDropdownStyles'))return;
    const s=document.createElement('style');s.id='profileDropdownStyles';s.textContent=`
      .profile-dropdown-card{position:fixed;z-index:100003;width:min(330px,calc(100vw - 24px));background:var(--card,#111611);color:inherit;border:1px solid var(--line,#303830);border-radius:18px;box-shadow:0 18px 55px #0008;padding:14px;overflow:hidden}
      .profile-dd-head{padding:4px 6px 14px;border-bottom:1px solid var(--line,#303830)}.profile-dd-name{font-size:18px;font-weight:900;line-height:1.25}.profile-dd-email{margin-top:3px;color:var(--muted,#98a098);font-size:13px;overflow-wrap:anywhere}
      .profile-dd-actions{display:grid;gap:7px;padding-top:12px}.profile-dd-btn{width:100%;min-height:46px;border:1px solid var(--line,#384038);border-radius:12px;background:transparent;color:inherit;text-align:left;padding:11px 13px;font:800 15px/1.2 inherit}.profile-dd-btn:active{transform:scale(.99)}.profile-dd-admin{border-color:#a8f000;color:#a8f000}.profile-dd-logout{color:#ff8589}.profile-dd-msg{min-height:18px;margin:8px 4px 0;color:var(--muted,#98a098);font-size:12px}
    `;document.head.appendChild(s);
  }
  function position(card,btn){
    const r=btn.getBoundingClientRect(),pad=12,w=Math.min(330,innerWidth-24);
    card.style.width=w+'px';
    let left=Math.min(innerWidth-w-pad,Math.max(pad,r.right-w));
    let top=r.bottom+8;
    if(top+card.offsetHeight>innerHeight-pad)top=Math.max(pad,r.top-card.offsetHeight-8);
    card.style.left=left+'px';card.style.top=top+'px';
  }
  function openMenu(btn){
    const existing=document.getElementById('profileDropdownCard');
    if(existing){closeMenu();return;}
    document.querySelectorAll('.cloud-auth-overlay').forEach(x=>x.remove());
    const p=profileData();
    const card=document.createElement('div');card.id='profileDropdownCard';card.className='profile-dropdown-card';card.setAttribute('role','menu');
    card.innerHTML=`<div class="profile-dd-head"><div class="profile-dd-name">${esc(p.name)}</div><div class="profile-dd-email">${esc(p.email)}</div></div><div class="profile-dd-actions">${p.admin?'<button id="profileAdminAction" class="profile-dd-btn profile-dd-admin" type="button">Users Report</button>':''}<button id="profileShareAction" class="profile-dd-btn" type="button">Share App</button><button id="profileLogoutAction" class="profile-dd-btn profile-dd-logout" type="button">Log out</button></div><div id="profileDropdownMsg" class="profile-dd-msg"></div>`;
    document.body.appendChild(card);btn.setAttribute('aria-expanded','true');position(card,btn);
    card.querySelector('#profileAdminAction')?.addEventListener('click',()=>{closeMenu();window.MyBodyAdminUI?.open?.();});
    card.querySelector('#profileShareAction')?.addEventListener('click',()=>shareApp(card.querySelector('#profileDropdownMsg')));
    card.querySelector('#profileLogoutAction')?.addEventListener('click',async()=>{card.querySelector('#profileDropdownMsg').textContent='Logging out…';try{await window.MyBodyCloud?.logout?.();}catch{location.reload();}});
  }
  function bind(){
    style();
    document.getElementById('adminDashboardBtn')?.remove();
    const btn=document.getElementById('cloudAccountBtn');if(!btn)return;
    if(btn.dataset.profileDropdown==='1')return;
    btn.dataset.profileDropdown='1';btn.setAttribute('aria-haspopup','menu');btn.setAttribute('aria-expanded','false');
    btn.onclick=e=>{e.stopPropagation();openMenu(btn)};
  }
  document.addEventListener('click',e=>{const c=document.getElementById('profileDropdownCard'),b=document.getElementById('cloudAccountBtn');if(c&&!c.contains(e.target)&&e.target!==b)closeMenu();});
  window.addEventListener('resize',closeMenu);window.addEventListener('scroll',closeMenu,{passive:true});
  const mo=new MutationObserver(bind);
  function init(){bind();mo.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();