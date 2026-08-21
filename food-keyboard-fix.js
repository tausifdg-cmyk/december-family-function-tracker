/* MYBODY 2.0 - isolated food autocomplete positioning without iOS focus/scroll interception. */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const FOOD_SELECTOR='.food-name,#customFoodName';
let activeFoodInput=null;
let frame=0;

function visualBounds(){
  const vv=window.visualViewport;
  const top=vv?.offsetTop||0;
  const height=vv?.height||window.innerHeight;
  return {top,height,bottom:top+height};
}
function queuePosition(){
  cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>requestAnimationFrame(positionMenu));
}
function positionMenu(){
  const input=activeFoodInput&&document.contains(activeFoodInput)
    ? activeFoodInput
    : (document.activeElement?.matches?.(FOOD_SELECTOR)?document.activeElement:null);
  const menu=$('.mb-food-search-menu');
  if(!input||!menu||menu.classList.contains('hidden'))return;

  const v=visualBounds();
  const r=input.getBoundingClientRect();
  const gap=4,edge=8;
  const width=Math.min(r.width,window.innerWidth-edge*2);
  const left=Math.max(edge,Math.min(r.left,window.innerWidth-width-edge));
  const available=Math.max(72,v.bottom-r.bottom-gap-edge);
  const maxHeight=Math.max(72,Math.min(300,available));

  menu.style.setProperty('position','fixed','important');
  menu.style.setProperty('left',`${Math.round(left)}px`,'important');
  menu.style.setProperty('right','auto','important');
  menu.style.setProperty('top',`${Math.round(r.bottom+gap)}px`,'important');
  menu.style.setProperty('bottom','auto','important');
  menu.style.setProperty('width',`${Math.round(width)}px`,'important');
  menu.style.setProperty('max-height',`${Math.round(maxHeight)}px`,'important');
  menu.style.setProperty('transform','none','important');
}
function wire(){
  document.addEventListener('focusin',e=>{
    const input=e.target.closest?.(FOOD_SELECTOR);
    if(!input)return;
    activeFoodInput=input;
    queuePosition();
    setTimeout(queuePosition,80);
    setTimeout(queuePosition,220);
  },true);
  document.addEventListener('input',e=>{
    const input=e.target.closest?.(FOOD_SELECTOR);
    if(input){activeFoodInput=input;queuePosition();}
  },true);
  document.addEventListener('focusout',e=>{
    if(e.target===activeFoodInput){
      setTimeout(()=>{if(document.activeElement!==activeFoodInput)activeFoodInput=null;},180);
    }
  },true);
  document.querySelector('.app-shell')?.addEventListener('scroll',queuePosition,{passive:true});
  window.addEventListener('resize',queuePosition,{passive:true});
  window.visualViewport?.addEventListener('resize',queuePosition,{passive:true});
  window.visualViewport?.addEventListener('scroll',queuePosition,{passive:true});
}
function init(){wire();}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
