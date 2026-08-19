(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
function build(){return document.querySelector('meta[name="app-build"]')?.content||'latest'}
function loadCorrections(){
  if(!document.querySelector('link[data-ui-corrections]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href=`ui-corrections.css?v=${encodeURIComponent(build())}`;link.dataset.uiCorrections='1';document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-ui-corrections]')){
    const script=document.createElement('script');script.src=`ui-corrections.js?v=${encodeURIComponent(build())}`;script.defer=true;script.dataset.uiCorrections='1';document.head.appendChild(script);
  }
}
function removeDuplicateWorkoutCta(){const primary=$('#experienceBrief .xp-coach > [data-xp-action="workout"]');const featured=$('#today .today-workout-card [data-nav="workout"]');if(primary&&featured)primary.remove()}
function init(){loadCorrections();removeDuplicateWorkoutCta();window.addEventListener('mybody:state',()=>setTimeout(removeDuplicateWorkoutCta,80));document.addEventListener('click',e=>{if(e.target.closest('[data-nav],.tab'))setTimeout(removeDuplicateWorkoutCta,100)},true)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
