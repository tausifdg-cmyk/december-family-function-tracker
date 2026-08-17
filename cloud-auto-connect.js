/* MYBODY 2.0 - automatic cloud connect while preserving offline-first login */
(function(){
  'use strict';
  const ACCOUNTS_KEY='tausifTracker.accounts.v1';
  const CLOUD_ATTEMPT_KEY='mybody.cloud.lastAttempt.v1';
  const getAccounts=()=>{try{return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)||'[]')||[]}catch{return[]}};
  async function hash(text){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  function mark(email,status){try{sessionStorage.setItem(CLOUD_ATTEMPT_KEY,JSON.stringify({email,status,at:Date.now()}))}catch{}}
  async function ensureCloud(email,password,mode){
    if(!navigator.onLine||!window.MyBodyCloud||!email||!password)return;
    try{
      if(mode==='signup'){
        await window.MyBodyCloud.signup(email,password);
        mark(email,'signup-requested');
        return;
      }
      try{
        await window.MyBodyCloud.login(email,password);
        mark(email,'connected');
      }catch(loginError){
        const msg=String(loginError?.message||'').toLowerCase();
        if(/invalid|credentials|not found|registered/.test(msg)){
          try{await window.MyBodyCloud.signup(email,password);mark(email,'signup-requested')}catch{mark(email,'pending')}
        }else mark(email,'pending');
      }
    }catch{mark(email,'pending')}
  }
  function wrapForm(){
    const form=document.getElementById('authForm');
    if(!form||form.dataset.cloudAutoConnect==='1'||typeof form.onsubmit!=='function')return;
    form.dataset.cloudAutoConnect='1';
    const original=form.onsubmit;
    form.onsubmit=async function(e){
      const email=String(document.getElementById('authEmail')?.value||'').trim().toLowerCase();
      const password=String(document.getElementById('authPass')?.value||'');
      const submit=form.querySelector('.auth-btn');
      const mode=/create account/i.test(submit?.textContent||'')?'signup':'login';
      if(mode==='login'&&navigator.onLine&&email&&password){
        try{
          const h=await hash(password);
          const localValid=getAccounts().some(a=>String(a.email||'').toLowerCase()===email&&a.passHash===h);
          if(localValid){
            await Promise.race([ensureCloud(email,password,'login'),new Promise(resolve=>setTimeout(resolve,1800))]);
          }
        }catch{}
      }else if(mode==='signup'&&navigator.onLine&&email&&password){
        ensureCloud(email,password,'signup').catch(()=>{});
      }
      return original.call(this,e);
    };
  }
  async function reconnectCurrent(){
    if(!navigator.onLine||!window.MyBodyCloud)return;
    try{
      if(window.MyBodyCloud.accountMatches?.()){
        await window.MyBodyCloud.recordActivity?.(false);
        await window.MyBodyCloud.sync?.();
      }
    }catch{}
  }
  const observer=new MutationObserver(wrapForm);
  function init(){
    wrapForm();
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('online',()=>{reconnectCurrent();setTimeout(reconnectCurrent,3000)});
    reconnectCurrent();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();