/* MYBODY 2.0 page footer placement fix */
(function(){
'use strict';
const FOOTER_TEXT='© 2026 MYBODY 2.0 / Tausif Pathan. All rights reserved. · Energy estimates are approximate and are not medical advice';
function removeLegacy(){
  const nodes=Array.from(document.body.querySelectorAll('*')).filter(el=>{
    if(el.classList?.contains('mb-page-footer')) return false;
    const t=(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    return t.includes('all rights reserved')&&t.includes('energy estimates');
  });
  nodes.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length);
  const smallest=nodes[0];
  if(smallest){
    let target=smallest;
    while(target.parentElement && target.parentElement!==document.body && target.parentElement.childElementCount===1){
      const pt=(target.parentElement.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if(!(pt.includes('all rights reserved')&&pt.includes('energy estimates'))) break;
      target=target.parentElement;
    }
    target.remove();
  }
}
function ensureFooters(){
  removeLegacy();
  document.querySelectorAll('.app-shell > .panel').forEach(panel=>{
    let footer=panel.querySelector(':scope > .mb-page-footer');
    if(!footer){
      footer=document.createElement('footer');
      footer.className='mb-page-footer';
      footer.setAttribute('aria-label','MYBODY legal notice');
      panel.appendChild(footer);
    }
    footer.textContent=FOOTER_TEXT;
    panel.appendChild(footer);
  });
}
function init(){
  ensureFooters();
  window.addEventListener('mybody:state',()=>setTimeout(ensureFooters,80));
  document.addEventListener('click',e=>{if(e.target.closest('[data-nav],.tab'))setTimeout(ensureFooters,80)},true);
  const shell=document.querySelector('.app-shell');
  if(shell){new MutationObserver(()=>ensureFooters()).observe(shell,{childList:true,subtree:false});}
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
