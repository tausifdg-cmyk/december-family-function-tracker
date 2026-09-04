(function(){
'use strict';
const NativeMutationObserver=window.MutationObserver;
if(!NativeMutationObserver)return;
window.MutationObserver=function(callback){
  const src=String(document.currentScript?.src||'');
  if(/\/phase2\.js(?:\?|$)/.test(src)){
    return {observe(){},disconnect(){},takeRecords(){return[]}};
  }
  return new NativeMutationObserver(callback);
};
window.MutationObserver.prototype=NativeMutationObserver.prototype;
Object.defineProperty(window.MutationObserver,'name',{value:'MutationObserver'});

function hasOpenModal(){return Boolean(document.querySelector('.xp-modal:not(.hidden),.p5-modal:not(.hidden),.p4-modal:not(.hidden),.p3-modal:not(.hidden),.p2-modal:not(.hidden),.coach-modal:not(.hidden),.sheet-backdrop:not(.hidden),.media-lightbox:not(.hidden)'))}
function recoverInteraction(){
  if(!hasOpenModal())document.body.classList.remove('modal-open');
  const nav=document.querySelector('.bottom-nav,.tab-bar,[role="tablist"]');
  if(nav){nav.style.pointerEvents='auto';nav.style.zIndex='70000'}
}
window.addEventListener('pageshow',recoverInteraction);
window.addEventListener('mybody:state',()=>setTimeout(recoverInteraction,50));
document.addEventListener('click',e=>{if(e.target.closest('[data-tab],[data-nav],.tab,.sheet-close,.xp-close,.p2-close,.p3-close,.p4-close,.p5-close'))setTimeout(recoverInteraction,40)},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{recoverInteraction();setTimeout(recoverInteraction,700)});else{recoverInteraction();setTimeout(recoverInteraction,700)}

function loadNutritionPhilosophy(){
  if(document.querySelector('script[data-mybody-nutrition-philosophy]'))return;
  const script=document.createElement('script');
  script.dataset.mybodyNutritionPhilosophy='1';
  const build=document.querySelector('meta[name="app-build"]')?.content||Date.now();
  script.src=`nutrition-philosophy.js?v=${encodeURIComponent(build)}`;
  script.defer=true;
  document.head.appendChild(script);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadNutritionPhilosophy,{once:true});else loadNutritionPhilosophy();
})();