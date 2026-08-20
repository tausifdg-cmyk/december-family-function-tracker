/* MYBODY 2.0 - isolated iPhone food keyboard/autocomplete fix. */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const FOOD_SELECTOR='.food-name,#customFoodName';
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||((navigator.platform==='MacIntel'||navigator.platform==='MacPPC')&&navigator.maxTouchPoints>1);
let activeFoodInput=null;
let frame=0;
let refocusTimer=0;

function shell(){return $('.app-shell');}
function visualBounds(){
  const vv=window.visualViewport;
  return {top:vv?.offsetTop||0,height:vv?.height||window.innerHeight,bottom:(vv?.offsetTop||0)+(vv?.height||window.innerHeight)};
}
function queuePosition(){
  cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>requestAnimationFrame(positionMenu));
}
function moveInputToSafeZone(input){
  const scroller=shell();
  if(!scroller||!input||!document.contains(input))return;
  const r=input.getBoundingClientRect();
  const s=scroller.getBoundingClientRect();
  const v=visualBounds();
  const desiredTop=Math.max(s.top+18,v.top+76);
  const delta=r.top-desiredTop;
  if(Math.abs(delta)>8) scroller.scrollTop=Math.max(0,scroller.scrollTop+delta);
}
function focusWithoutViewportJump(input){
  clearTimeout(refocusTimer);
  moveInputToSafeZone(input);
  refocusTimer=setTimeout(()=>{
    try{window.scrollTo(0,0);}catch(_){}
    try{input.focus({preventScroll:true});}catch(_){input.focus();}
    try{const n=input.value.length;input.setSelectionRange(n,n);}catch(_){}
    queuePosition();
    setTimeout(queuePosition,80);
    setTimeout(queuePosition,220);
  },45);
}
function positionMenu(){
  const input=activeFoodInput&&document.contains(activeFoodInput)?activeFoodInput:(document.activeElement?.matches?.(FOOD_SELECTOR)?document.activeElement:null);
  const menu=$('.mb-food-search-menu');
  if(!input||!menu||menu.classList.contains('hidden'))return;
  const v=visualBounds();
  let r=input.getBoundingClientRect();
  const gap=4,edge=8,minMenu=96;
  let available=v.bottom-r.bottom-gap-edge;
  if(available<minMenu){
    const scroller=shell();
    if(scroller){
      const shift=minMenu-available+16;
      scroller.scrollTop=Math.max(0,scroller.scrollTop+shift);
      r=input.getBoundingClientRect();
      available=v.bottom-r.bottom-gap-edge;
    }
  }
  const width=Math.min(r.width,window.innerWidth-edge*2);
  const left=Math.max(edge,Math.min(r.left,window.innerWidth-width-edge));
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
  document.addEventListener('pointerdown',e=>{
    const input=e.target.closest?.(FOOD_SELECTOR);
    if(!input)return;
    activeFoodInput=input;
    if(isIOS&&document.activeElement!==input){
      e.preventDefault();
      focusWithoutViewportJump(input);
    }else queuePosition();
  },true);
  document.addEventListener('focusin',e=>{
    const input=e.target.closest?.(FOOD_SELECTOR);
    if(!input)return;
    activeFoodInput=input;
    if(isIOS){
      moveInputToSafeZone(input);
      try{window.scrollTo(0,0);}catch(_){}
    }
    queuePosition();
    setTimeout(queuePosition,120);
  },true);
  document.addEventListener('input',e=>{
    const input=e.target.closest?.(FOOD_SELECTOR);
    if(input){activeFoodInput=input;queuePosition();}
  },true);
  document.addEventListener('focusout',e=>{
    if(e.target===activeFoodInput) setTimeout(()=>{if(document.activeElement!==activeFoodInput) activeFoodInput=null;},180);
  },true);
  shell()?.addEventListener('scroll',queuePosition,{passive:true});
  window.addEventListener('resize',queuePosition,{passive:true});
  window.visualViewport?.addEventListener('resize',()=>{if(isIOS&&activeFoodInput)moveInputToSafeZone(activeFoodInput);queuePosition();},{passive:true});
  window.visualViewport?.addEventListener('scroll',()=>{if(isIOS&&activeFoodInput){try{window.scrollTo(0,0);}catch(_){}}queuePosition();},{passive:true});
}
function init(){wire();}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
