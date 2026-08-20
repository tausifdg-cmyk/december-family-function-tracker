/* MYBODY 2.0 exercise viewer layout behavior */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
let lastName='';
function ensureGuideToggle(lightbox){
  const guide=$('.lightbox-guide',lightbox);if(!guide)return;
  let body=$('.mb-instructions-body',guide),toggle=$('.mb-instructions-toggle',guide);
  if(!body){
    body=document.createElement('div');body.className='mb-instructions-body hidden';
    while(guide.firstChild)body.appendChild(guide.firstChild);
    guide.appendChild(body);
  }
  if(!toggle){
    toggle=document.createElement('button');toggle.type='button';toggle.className='mb-instructions-toggle';toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<span>Exercise instructions</span><span>View</span>';
    guide.insertBefore(toggle,body);
  }
}
function moveSourceButtons(lightbox){
  const stage=$('.lightbox-stage',lightbox),switcher=$('.mb-media-source',lightbox);if(!stage||!switcher)return;
  if(switcher.parentElement!==stage||stage.lastElementChild!==switcher)stage.appendChild(switcher);
}
function refine(){
  const lightbox=$('#exerciseLightbox');
  if(!lightbox||lightbox.classList.contains('hidden'))return;
  lightbox.classList.add('mb-viewer-refined');
  const name=$('#exerciseLightboxTitle')?.textContent?.trim()||'';
  ensureGuideToggle(lightbox);
  moveSourceButtons(lightbox);
  if(name!==lastName){
    lastName=name;
    const body=$('.mb-instructions-body',lightbox),toggle=$('.mb-instructions-toggle',lightbox);
    body?.classList.add('hidden');
    if(toggle){toggle.setAttribute('aria-expanded','false');const label=toggle.querySelector('span:last-child');if(label)label.textContent='View';}
    const stage=$('.lightbox-stage',lightbox);if(stage)stage.scrollTop=0;
  }
}
function toggleInstructions(button){
  const lightbox=button.closest('#exerciseLightbox');if(!lightbox)return;
  const body=$('.mb-instructions-body',lightbox);if(!body)return;
  const open=body.classList.contains('hidden');body.classList.toggle('hidden',!open);button.setAttribute('aria-expanded',String(open));const label=button.querySelector('span:last-child');if(label)label.textContent=open?'Hide':'View';
}
function init(){
  document.addEventListener('click',e=>{
    const t=e.target.closest('.mb-instructions-toggle');if(t){toggleInstructions(t);return}
    setTimeout(refine,40);setTimeout(refine,140);setTimeout(refine,300);
  },true);
  window.addEventListener('mybody:state',()=>setTimeout(refine,90));
  const obs=new MutationObserver(()=>{if(!$('#exerciseLightbox')?.classList.contains('hidden'))setTimeout(refine,30)});
  obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
