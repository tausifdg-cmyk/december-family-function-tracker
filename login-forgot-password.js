/* MYBODY 2.0 - stable login-screen password recovery */
(function(){
  'use strict';

  function addForgotPassword(){
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
