/* MYBODY 2.0 brand layer. Keeps personalised user name separate from product name. */
(function(){
  const BRAND='MYBODY 2.0', TAGLINE='Build the next version of you.';
  function apply(){
    document.title=BRAND;
    const top=document.querySelector('.topbar h1');if(top)top.textContent=BRAND;
    const eyebrow=document.querySelector('.topbar .eyebrow');if(eyebrow)eyebrow.textContent='YOUR TRANSFORMATION';
    const hero=document.querySelector('.hero');if(hero)hero.style.display='none';
    document.querySelectorAll('.auth-brand b').forEach(x=>x.textContent=BRAND);
    document.querySelectorAll('.auth-brand p').forEach(x=>x.textContent=TAGLINE);
  }
  const obs=new MutationObserver(apply);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{apply();obs.observe(document.body,{childList:true,subtree:true})}):(apply(),obs.observe(document.body,{childList:true,subtree:true}));
})();