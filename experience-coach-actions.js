(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
function build(){return document.querySelector('meta[name="app-build"]')?.content||'latest'}
function loadAsset(tag,attr,value,datasetKey){if(document.querySelector(`${tag}[data-${datasetKey}]`))return;const el=document.createElement(tag);if(tag==='link'){el.rel='stylesheet';el.href=value}else{el.src=value;el.defer=true}el.dataset[datasetKey]='1';document.head.appendChild(el)}
function loadCorrections(){
  const v=encodeURIComponent(build());
  loadAsset('link','href',`ui-corrections.css?v=${v}`,'uiCorrections');
  loadAsset('script','src',`ui-corrections.js?v=${v}`,'uiCorrections');
  loadAsset('link','href',`media-diet-upgrade.css?v=${v}`,'mediaDietUpgrade');
  loadAsset('script','src',`media-diet-upgrade.js?v=${v}`,'mediaDietUpgrade');
  loadAsset('script','src',`youtube-legacy-recovery.js?v=${v}`,'youtubeLegacyRecovery');
  loadAsset('link','href',`music-player.css?v=${v}`,'musicPlayer');
  loadAsset('script','src',`music-player.js?v=${v}`,'musicPlayer');
}
function removeDuplicateWorkoutCta(){const primary=$('#experienceBrief .xp-coach > [data-xp-action="workout"]');const featured=$('#today .today-workout-card [data-nav="workout"]');if(primary&&featured)primary.remove()}
function init(){loadCorrections();removeDuplicateWorkoutCta();window.addEventListener('mybody:state',()=>setTimeout(removeDuplicateWorkoutCta,80));document.addEventListener('click',e=>{if(e.target.closest('[data-nav],.tab'))setTimeout(removeDuplicateWorkoutCta,100)},true)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
