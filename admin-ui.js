(function(){
'use strict';
const ADMIN_EMAIL='tausifdg@gmail.com';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=v=>v?new Date(v).toLocaleString():'Never';
function localEmail(){try{return String(window.MyBodyCloud?.localAccount?.()?.email||'').trim().toLowerCase()}catch{return''}}
function showLogin(host,error){
  const email=localEmail();
  if(email!==ADMIN_EMAIL){host.innerHTML='<div class="admin-card"><h3>Users Report unavailable</h3><p>'+esc(error||'Admin access is limited to the MYBODY owner account.')+'</p></div>';return;}
  host.innerHTML=`<div class="admin-card"><h3>Admin Login</h3><p>${esc(error||'Sign in to open Users Report.')}</p><button id="adminGithubLogin" class="primary" type="button" style="width:100%;margin-top:14px">Sign in with GitHub</button><p style="opacity:.68;font-size:13px;margin:10px 0 14px">Authorized GitHub account: tausifdg-cmyk</p><div style="display:flex;align-items:center;gap:10px;margin:12px 0"><span style="height:1px;background:#303631;flex:1"></span><small style="opacity:.58">OR</small><span style="height:1px;background:#303631;flex:1"></span></div><label style="display:block">Email<input id="adminCloudEmail" type="email" value="${ADMIN_EMAIL}" readonly style="width:100%;box-sizing:border-box;margin-top:7px;min-height:50px;border-radius:12px;border:1px solid #384038;background:#090c0a;color:#fff;padding:12px"></label><label style="display:block;margin-top:12px">Password<input id="adminCloudPass" type="password" autocomplete="current-password" style="width:100%;box-sizing:border-box;margin-top:7px;min-height:50px;border-radius:12px;border:1px solid #384038;background:#090c0a;color:#fff;padding:12px"></label><button id="adminCloudLogin" class="secondary" type="button" style="width:100%;margin-top:14px">Login with Password</button><button id="adminResetPassword" class="text-btn" type="button" style="width:100%;margin-top:8px">Forgot / Reset Admin Password</button><p id="adminCloudMsg" style="min-height:22px;margin-top:10px"></p></div>`;
  const pass=host.querySelector('#adminCloudPass'),login=host.querySelector('#adminCloudLogin'),github=host.querySelector('#adminGithubLogin'),reset=host.querySelector('#adminResetPassword'),msg=host.querySelector('#adminCloudMsg');
  github.onclick=async()=>{if(!navigator.onLine){msg.textContent='Internet connection is required for GitHub sign-in.';return}github.disabled=true;msg.textContent='Opening GitHub…';try{await window.MyBodyCloud.loginWithGithub()}catch(e){msg.textContent=e?.message||'Unable to start GitHub sign-in.';github.disabled=false}};
  reset.onclick=async()=>{if(!navigator.onLine){msg.textContent='Internet connection is required to reset your password.';return}reset.disabled=true;msg.textContent='Sending password reset email…';try{await window.MyBodyCloud.forgot(ADMIN_EMAIL);msg.textContent='Password reset email sent to '+ADMIN_EMAIL+'. Open the link in the email, enter a new password, then return to MYBODY 2.0 and sign in.'}catch(e){msg.textContent=e?.message||'Unable to send password reset email.'}finally{reset.disabled=false}};
  const submit=async()=>{if(!navigator.onLine){msg.textContent='Internet connection is required for Admin Login.';return}if(!pass.value){msg.textContent='Enter your password.';pass.focus();return}login.disabled=true;msg.textContent='Signing in…';try{await window.MyBodyCloud.login(ADMIN_EMAIL,pass.value);msg.textContent='Login successful. Loading Users Report…';setTimeout(()=>render(host),200)}catch(e){msg.textContent=e?.message||'Unable to sign in.'}finally{login.disabled=false}};
  login.onclick=submit;
  pass.addEventListener('keydown',e=>{if(e.key==='Enter')submit()});
}
async function render(host){
  host.innerHTML='<p>Loading users…</p>';
  try{
    const d=await window.MyBodyCloud.adminUsers(),now=Date.now(),day=864e5;
    host.innerHTML='<div class="admin-summary"><div class="admin-card"><small>Total users</small><h2>'+d.length+'</h2></div><div class="admin-card"><small>Active today</small><h2>'+d.filter(x=>x.last_opened_at&&now-new Date(x.last_opened_at)<day).length+'</h2></div><div class="admin-card"><small>Active 7 days</small><h2>'+d.filter(x=>x.last_opened_at&&now-new Date(x.last_opened_at)<day*7).length+'</h2></div><div class="admin-card"><small>Android</small><h2>'+d.filter(x=>/Android/i.test(x.app_type||'')).length+'</h2></div><div class="admin-card"><small>iOS</small><h2>'+d.filter(x=>/iOS/i.test(x.app_type||'')).length+'</h2></div><div class="admin-card"><small>Web/PWA</small><h2>'+d.filter(x=>!/Android|iOS/i.test(x.app_type||'')).length+'</h2></div></div><div class="admin-card" style="margin-top:14px;overflow:auto"><table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>App</th><th>Last opened</th><th>Last login</th><th>Joined</th></tr></thead><tbody>'+d.map(x=>'<tr><td>'+esc(x.name||'Unnamed')+'</td><td>'+esc(x.email)+'</td><td>'+esc(x.app_type||'Unknown')+'</td><td>'+esc(fmt(x.last_opened_at))+'</td><td>'+esc(fmt(x.last_login_at))+'</td><td>'+esc(fmt(x.created_at))+'</td></tr>').join('')+'</tbody></table></div>';
  }catch(e){showLogin(host,e?.message||'Users Report unavailable')}
}
function open(){
  let x=document.getElementById('adminDashboard');
  if(!x){x=document.createElement('div');x.id='adminDashboard';x.className='admin-dashboard';x.innerHTML='<div class="admin-dashboard-shell"><div style="display:flex;justify-content:space-between;align-items:center"><div><small>MYBODY 2.0</small><h1>Users Report</h1></div><button id="closeAdmin" type="button">Close</button></div><div id="adminDashboardBody"></div></div>';document.body.appendChild(x);x.querySelector('#closeAdmin').onclick=()=>x.remove()}
  render(x.querySelector('#adminDashboardBody'));
}
function copyright(){const f=document.querySelector('footer');if(f)f.textContent='© 2026 MYBODY 2.0 / Tausif Pathan. All rights reserved. • Energy estimates are approximate and are not medical advice'}
function init(){copyright();document.getElementById('adminDashboardBtn')?.remove()}
window.MyBodyAdminUI={open,init};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();