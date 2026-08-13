/* MYBODY 2.0 branding */
(function(){
  const BRAND='MYBODY 2.0';
  function setIfDifferent(el,text){if(el&&el.textContent!==text)el.textContent=text;}
  function apply(){
    if(document.title!==BRAND)document.title=BRAND;
    setIfDifferent(document.querySelector('.topbar h1'),BRAND);
    setIfDifferent(document.querySelector('.topbar .eyebrow'),'YOUR TRANSFORMATION');
    const hero=document.querySelector('.hero');if(hero&&hero.style.display!=='none')hero.style.display='none';
    document.querySelectorAll('.auth-brand b').forEach(function(el){setIfDifferent(el,BRAND);});
    document.querySelectorAll('.auth-brand p').forEach(function(el){setIfDifferent(el,'Build the next version of you.');});
  }
  function init(){
    apply();
    if(!document.body)return;
    let scheduled=false;
    const obs=new MutationObserver(function(){
      if(scheduled)return;
      scheduled=true;
      setTimeout(function(){scheduled=false;apply();},0);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();