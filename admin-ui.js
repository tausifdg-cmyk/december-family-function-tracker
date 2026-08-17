(function(){
'use strict';
const ADMIN_EMAIL='tausif.4946@gmail.com';
const RESEND_SECONDS=60;
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=v=>v?new Date(v).toLocaleString():'Never';
function localEmail(){try{return String(window.MyBodyCloud?.localAccount?.()?.email||'').trim().toLowerCase()}catch{return''}}
function showVerify(host,error){
  const email=localEmail();
  if(email!==ADMIN_EMAIL){host.innerHTML='<div class="admin-card"><h3>Users Report unavailable</h3><p>'+esc(error||'Admin access is limited to the MYBODY owner account.')+'</p></div>';return;}
  host.innerHTML=`<div class="admin-card"><h3>Verify Admin Email</h3><p>${esc(error||'Verify this device to open Users Report.')}</p><p style="opacity:.72">${ADMIN_EMAIL}</p><button id="adminSendOtp" class="primary" type="button" style="width:100%;margin-top:12px">Send 6-digit code</button><div id="adminOtpArea" style="display:none;margin-top:14px"><label style="display:block">6-digit verification code<input id="adminOtpCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" style="width:100%;box-sizing:border-box;margin-top:7px;min-height:50px;border-radius:12px;border:1px solid #384038;background:#090c0a;color:#fff;padding:12px;font-size:20px;letter-spacing:.18em"></label><button id="adminVerifyOtp" class="primary" type="button" style="width:100%;margin-top:10px">Verify & Open Report</button></div><p id="adminCloudMsg" style="min-height:22px;margin-top:10px"></p><p style="opacity:.68;font-size:13px">MYBODY uses a code-only admin sign-in. Do not use old Magic Link emails. If your newest email still shows only a Sign in link, the Supabase Magic Link email template must be changed to display the OTP token.</p></div>`;
  const send=host.querySelector('#adminSendOtp'),area=host.querySelector('#adminOtpArea'),code=host.querySelector('#adminOtpCode'),verify=host.querySelector('#adminVerifyOtp'),msg=host.querySelector('#adminCloudMsg');
  let timer=null;
  function startCooldown(){let left=RESEND_SECONDS;send.disabled=true;send.textContent=`Resend code in ${left}s`;clearInterval(timer);timer=setInterval(()=>{left-=1;if(left<=0){clearInterval(timer);send.disabled=false;send.textContent='Resend 6-digit code'}else send.textContent=`Resend code in ${left}s`},1000)}
  send.onclick=async()=>{if(!navigator.onLine){msg.textContent='Internet connection is required to send the verification code.';return}send.disabled=true;msg.textContent='Sending 6-digit code…';try{await window.MyBodyCloud.sendEmailOtp(ADMIN_EMAIL);area.style.display='block';msg.textContent='Code requested. Check the newest email and enter the 6-digit code here.';code.focus();startCooldown()}catch(e){const text=String(e?.message||'Unable to send verification code.');msg.textContent=/rate limit/i.test(text)?'Email rate limit reached. Please wait before requesting another code.':text;send.disabled=false;send.textContent='Send 6-digit code'}};
  verify.onclick=async()=>{if(!navigator.onLine){msg.textContent='Internet connection is required to verify the code.';return}const value=String(code.value||'').replace(/\D/g,'').slice(0,6);code.value=value;if(value.length!==6){msg.textContent='Enter the complete 6-digit code.';code.focus();return}verify.disabled=true;msg.textContent='Verifying…';try{await window.MyBodyCloud.verifyEmailOtp(ADMIN_EMAIL,value);msg.textContent='Verified. Loading Users Report…';clearInterval(timer);setTimeout(()=>render(host),200)}catch(e){msg.textContent=e?.message||'Unable to verify code.'}finally{verify.disabled=false}};
  code.addEventListener('input',()=>{code.value=code.value.replace(/\D/g,'').slice(0,6)});
}
async function render(host){
  host.innerHTML='<p>Loading users…</p>';
  try{
    const d=await window.MyBodyCloud.adminUsers(),now=Date.now(),day=864e5;
    host.innerHTML='<div class="admin-summary"><div class="admin-card"><small>Total users</small><h2>'+d.length+'</h2></div><div class="admin-card"><small>Active today</small><h2>'+d.filter(x=>x.last_opened_at&&now-new Date(x.last_opened_at)<day).length+'</h2></div><div class="admin-card"><small>Active 7 days</small><h2>'+d.filter(x=>x.last_opened_at&&now-new Date(x.last_opened_at)<day*7).length+'</h2></div><div class="admin-card"><small>Android</small><h2>'+d.filter(x=>/Android/i.test(x.app_type||'')).length+'</h2></div><div class="admin-card"><small>iOS</small><h2>'+d.filter(x=>/iOS/i.test(x.app_type||'')).length+'</h2></div><div class="admin-card"><small>Web/PWA</small><h2>'+d.filter(x=>!/Android|iOS/i.test(x.app_type||'')).length+'</h2></div></div><div class="admin-card" style="margin-top:14px;overflow:auto"><table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>App</th><th>Last opened</th><th>Last login</th><th>Joined</th></tr></thead><tbody>'+d.map(x=>'<tr><td>'+esc(x.name||'Unnamed')+'</td><td>'+esc(x.email)+'</td><td>'+esc(x.app_type||'Unknown')+'</td><td>'+esc(fmt(x.last_opened_at))+'</td><td>'+esc(fmt(x.last_login_at))+'</td><td>'+esc(fmt(x.created_at))+'</td></tr>').join('')+'</tbody></table></div>';
  }catch(e){showVerify(host,e?.message||'Users Report unavailable')}
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