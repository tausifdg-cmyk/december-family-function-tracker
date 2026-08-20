/* MYBODY 2.0 mobile UX polish */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
let foodInput=null,menuFrame=0;

function lockViewport(){
  const meta=$('meta[name="viewport"]');
  if(meta) meta.setAttribute('content','width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
}

function scrollContentTop(){
  const shell=$('.app-shell');
  if(!shell)return;
  try{shell.scrollTo({top:0,left:0,behavior:'instant'});}catch(_){shell.scrollTop=0;}
}

function scheduleFoodMenu(){
  cancelAnimationFrame(menuFrame);
  menuFrame=requestAnimationFrame(()=>requestAnimationFrame(positionFoodMenu));
}
function positionFoodMenu(){
  const menu=$('.mb-food-search-menu');
  const shell=$('.app-shell');
  if(!menu||!shell||menu.classList.contains('hidden')||!foodInput||!document.contains(foodInput))return;

  if(menu.parentElement!==shell) shell.appendChild(menu);

  const inputRect=foodInput.getBoundingClientRect();
  const shellRect=shell.getBoundingClientRect();
  const margin=8;
  const gap=4;
  const width=Math.min(inputRect.width,shell.clientWidth-margin*2);
  const contentLeft=inputRect.left-shellRect.left+shell.scrollLeft;
  const contentTop=inputRect.bottom-shellRect.top+shell.scrollTop+gap;
  const left=Math.max(margin,Math.min(contentLeft,shell.scrollWidth-width-margin));
  const visibleBelow=Math.max(120,shellRect.bottom-inputRect.bottom-12);
  const maxHeight=Math.min(360,visibleBelow);

  menu.style.setProperty('position','absolute','important');
  menu.style.setProperty('left',`${Math.round(left)}px`,'important');
  menu.style.setProperty('right','auto','important');
  menu.style.setProperty('top',`${Math.round(contentTop)}px`,'important');
  menu.style.setProperty('bottom','auto','important');
  menu.style.setProperty('width',`${Math.round(width)}px`,'important');
  menu.style.setProperty('max-height',`${Math.round(maxHeight)}px`,'important');
  menu.style.setProperty('transform','none','important');
}

function ensureMusicControls(){
  const mini=$('#mbMusicMini');
  if(!mini)return;
  if(!mini.querySelector('[data-music-hide]')){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='mb-music-hide';
    btn.dataset.musicHide='1';
    btn.setAttribute('aria-label','Close music player');
    btn.title='Close player';
    btn.textContent='×';
    const controls=mini.querySelector('.mb-music-mini-controls')||mini;
    controls.appendChild(btn);
  }
  if(!$('#mbMusicReopen')){
    const reopen=document.createElement('button');
    reopen.id='mbMusicReopen';
    reopen.type='button';
    reopen.className='mb-music-reopen hidden';
    reopen.setAttribute('aria-label','Open music player');
    reopen.innerHTML='<span>♪</span><b>Music</b><span>⌃</span>';
    document.body.appendChild(reopen);
  }
}
function hideMusicUi(){
  document.documentElement.classList.add('mb-music-ui-hidden');
  $('#mbMusicReopen')?.classList.remove('hidden');
}
function showMusicUi(){
  document.documentElement.classList.remove('mb-music-ui-hidden');
  $('#mbMusicReopen')?.classList.add('hidden');
}
function syncMusicVisibility(){
  ensureMusicControls();
  if(!document.documentElement.classList.contains('mb-music-active')){
    document.documentElement.classList.remove('mb-music-ui-hidden');
    $('#mbMusicReopen')?.classList.add('hidden');
  }
}

function wire(){
  window.addEventListener('mybody:tabchange',()=>requestAnimationFrame(scrollContentTop));
  document.addEventListener('click',e=>{
    if(e.target.closest('.tab[data-tab],[data-nav]')) setTimeout(scrollContentTop,0);
    if(e.target.closest('[data-music-hide]')){e.preventDefault();e.stopPropagation();hideMusicUi();}
    if(e.target.closest('#mbMusicReopen')){e.preventDefault();e.stopPropagation();showMusicUi();}
  },true);
  document.addEventListener('focusin',e=>{
    const input=e.target.closest?.('.food-name,#customFoodName');
    if(input){
      foodInput=input;
      scheduleFoodMenu();
      setTimeout(scheduleFoodMenu,160);
    }
  },true);
  document.addEventListener('focusout',e=>{
    if(e.target===foodInput) setTimeout(()=>{ if(document.activeElement!==foodInput) scheduleFoodMenu(); },0);
  },true);
  document.addEventListener('input',e=>{
    const input=e.target.closest?.('.food-name,#customFoodName');
    if(input){foodInput=input;scheduleFoodMenu();}
  },true);
  document.addEventListener('click',e=>{
    if(e.target.closest('.food-name,#customFoodName'))scheduleFoodMenu();
  },true);
  $('.app-shell')?.addEventListener('scroll',scheduleFoodMenu,{passive:true});
  window.addEventListener('resize',scheduleFoodMenu,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleFoodMenu,{passive:true});
  new MutationObserver(syncMusicVisibility).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  window.addEventListener('mybody:state',()=>{setTimeout(ensureMusicControls,80);setTimeout(scheduleFoodMenu,100)});
}

function init(){
  lockViewport();
  ensureMusicControls();
  wire();
  setTimeout(ensureMusicControls,300);
  setTimeout(ensureMusicControls,900);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
