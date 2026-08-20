/* MYBODY 2.0 - safe music player close/reopen controls. No observers, no layout mutation. */
(function(){
'use strict';
const KEY='mybody.music.uiHidden.v1';
const $=(s,r=document)=>r.querySelector(s);
function hiddenPref(){try{return localStorage.getItem(KEY)==='1'}catch(_){return false}}
function saveHidden(v){try{localStorage.setItem(KEY,v?'1':'0')}catch(_){}}
function ensureControls(){
  const mini=$('#mbMusicMini');
  if(!mini)return false;
  if(!mini.querySelector('[data-music-hide]')){
    const b=document.createElement('button');
    b.type='button';b.className='mb-music-hide';b.dataset.musicHide='1';b.setAttribute('aria-label','Close music player');b.title='Close player';b.textContent='×';
    (mini.querySelector('.mb-music-mini-controls')||mini).appendChild(b);
  }
  let reopen=$('#mbMusicReopen');
  if(!reopen){
    reopen=document.createElement('button');reopen.id='mbMusicReopen';reopen.type='button';reopen.className='mb-music-reopen hidden';
    reopen.setAttribute('aria-label','Open music player');reopen.innerHTML='<span>♪</span><b>Music</b><span>⌃</span>';document.body.appendChild(reopen);
  }
  sync();return true;
}
function isActive(){return document.documentElement.classList.contains('mb-music-active')}
function sync(){
  const active=isActive(),hidden=hiddenPref()&&active;
  document.documentElement.classList.toggle('mb-music-ui-hidden',hidden);
  const reopen=$('#mbMusicReopen');if(reopen)reopen.classList.toggle('hidden',!hidden);
}
function hide(){if(!isActive())return;saveHidden(true);sync()}
function show(){saveHidden(false);sync()}
function wireAudio(){const a=$('#mybodyMusicAudio');if(!a||a.dataset.visibilitySafe==='1')return;a.dataset.visibilitySafe='1';['play','pause','loadedmetadata','ended'].forEach(ev=>a.addEventListener(ev,()=>setTimeout(sync,0)))}
function refresh(){ensureControls();wireAudio();sync()}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-music-hide]')){e.preventDefault();e.stopPropagation();hide();return}
  if(e.target.closest('#mbMusicReopen')){e.preventDefault();e.stopPropagation();show();return}
  if(e.target.closest('#mbMusicLauncher,[data-open-music],[data-music-play],[data-play-track]'))setTimeout(refresh,80);
},true);
window.addEventListener('mybody:state',()=>setTimeout(refresh,100));
function init(){refresh();setTimeout(refresh,250);setTimeout(refresh,800);setTimeout(refresh,1600)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
