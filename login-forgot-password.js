/* MYBODY 2.0 - stable login-screen password recovery */
(function(){
  'use strict';

  function isRecoveryLink(){
    try{
      const h=new URLSearchParams((location.hash||'').replace(/^#/,''));
      return h.get('type')==='recovery' && Boolean(h.get('access_token'));
    }catch{return false}
  }

  function showRecoveryForm(){
    if(!isRecoveryLink()) return false;
    const form=document.getElementById('authForm');
    const title=document.querySelector('.auth-title, #authTitle, .auth-card h1, .auth-card h2');
    const err=document.getElementById('authError');
    if(!form) return false;

    if(title) title.textContent='Set new password';
    form.innerHTML=`
      <label class="auth-label">New password
        <input id="recoveryNewPassword" class="auth-input" type="password" autocomplete="new-password" minlength="8" placeholder="Minimum 8 characters" required>
      </label>
      <label class="auth-label">Confirm new password
        <input id="recoveryConfirmPassword" class="auth-input" type="password" autocomplete="new-password" minlength="8" placeholder="Re-enter new password" required>
      </label>
      <button id="recoverySavePassword" class="auth-btn" type="button">Save new password</button>
      <p id="recoveryPasswordMsg" class="auth-error" style="min-height:22px"></p>`;

    const p1=form.querySelector('#recoveryNewPassword');
    const p2=form.querySelector('#recoveryConfirmPassword');
    const btn=form.querySelector('#recoverySavePassword');
    const msg=form.querySelector('#recoveryPasswordMsg');
    if(err) err.textContent='';

    btn.onclick=async()=>{
      const a=p1.value||'',b=p2.value||'';
      if(a.length<8){msg.textContent='Password must be at least 8 characters.';p1.focus();return}
      if(a!==b){msg.textContent='Passwords do not match.';p2.focus();return}
      if(!window.MyBodyCloud?.updatePassword){msg.textContent='Password recovery is still loading. Please wait a moment and try again.';return}
      btn.disabled=true;msg.style.color='#a8f000';msg.textContent='Saving new password…';
      try{
        await window.MyBodyCloud.updatePassword(a);
        history.replaceState(null,'',location.pathname+location.search);
        msg.textContent='Password updated successfully. Reloading login…';
        setTimeout(()=>location.reload(),900);
      }catch(e){
        msg.style.color='#ff7277';
        msg.textContent=e?.message||'Could not update password.';
        btn.disabled=false;
      }
    };
    return true;
  }

  function addForgotPassword(){
    if(showRecoveryForm()) return;
    const form=document.getElementById('authForm');
    const emailInput=document.getElementById('authEmail');
    const submit=form?.querySelector('.auth-btn');
    if(!form||!emailInput||!submit) return;

    const isLogin=/log in/i.test(submit.textContent||'');
    const existing=document.getElementById('authForgotPassword');
    if(!isLogin){ existing?.remove(); return; }
    if(existing) return;

    const btn=document.createElement('button');
    btn.id='authForgotPassword';
    btn.type='button';
    btn.className='auth-switch';
    btn.style.marginTop='0';
    btn.style.minHeight='44px';
    btn.textContent='Forgot password?';

    btn.addEventListener('click',async()=>{
      const err=document.getElementById('authError');
      const email=String(emailInput.value||'').trim().toLowerCase();
      if(!email){ if(err) err.textContent='Enter your email address first.'; emailInput.focus(); return; }
      if(!window.MyBodyCloud?.forgot){ if(err) err.textContent='Password recovery is temporarily unavailable. Please reopen the app.'; return; }
      btn.disabled=true;
      if(err){ err.style.color='#a8f000'; err.textContent='Sending password reset email…'; }
      try{
        await window.MyBodyCloud.forgot(email);
        if(err) err.textContent='Reset email sent. Open the link in your email to choose a new password.';
      }catch(e){
        if(err){ err.style.color='#ff7277'; err.textContent=e?.message||'Could not send reset email.'; }
      }finally{ btn.disabled=false; }
    });

    submit.insertAdjacentElement('afterend',btn);
  }

  const observer=new MutationObserver(addForgotPassword);
  function init(){ addForgotPassword(); observer.observe(document.body,{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();