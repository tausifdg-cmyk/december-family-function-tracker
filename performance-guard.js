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

const build=()=>document.querySelector('meta[name="app-build"]')?.content||Date.now();
function loadScript(src,dataKey,onload){
  const selector=`script[data-${dataKey}]`;
  const existing=document.querySelector(selector);
  if(existing){if(onload){if(existing.dataset.loaded==='1')onload();else existing.addEventListener('load',onload,{once:true})}return existing}
  const script=document.createElement('script');
  script.setAttribute(`data-${dataKey}`,'1');
  script.src=`${src}?v=${encodeURIComponent(build())}`;
  script.addEventListener('load',()=>{script.dataset.loaded='1';onload?.()},{once:true});
  document.head.appendChild(script);
  return script;
}

function loadEnhancements(){
  loadScript('macro-target-engine.js','mybody-macro-engine',()=>{
    loadScript('macro-target-ui.js','mybody-macro-ui');
  });
  loadScript('nutrition-philosophy.js','mybody-nutrition-philosophy');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadEnhancements,{once:true});else loadEnhancements();
})();