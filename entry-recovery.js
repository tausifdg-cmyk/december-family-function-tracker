/* Recovery layer: guarantees food + workout entry controls are rendered and usable. */
(function(){
  function rerender(){
    try{ if(typeof renderWorkout==='function') renderWorkout(); }catch(e){ console.warn('Workout render recovery',e); }
    try{ if(typeof renderFood==='function') renderFood(); }catch(e){ console.warn('Food render recovery',e); }
    setTimeout(()=>{
      try{ window.workoutVideoReference?.decorate?.(); }catch{}
    },0);
  }

  function ensureWorkoutVisible(){
    const list=document.getElementById('exerciseList');
    if(!list) return;
    if(list.children.length===0 && typeof renderWorkout==='function'){
      try{renderWorkout()}catch(e){console.warn(e)}
    }
    const save=document.getElementById('saveWorkout');
    if(save) save.style.display='block';
  }

  function ensureFoodVisible(){
    const mount=document.getElementById('mealSections');
    if(!mount) return;
    if(mount.children.length===0 && typeof renderFood==='function'){
      try{renderFood()}catch(e){console.warn(e)}
    }
    document.querySelectorAll('.add-food').forEach(b=>b.style.display='inline-flex');
  }

  function init(){
    rerender();
    ensureWorkoutVisible();
    ensureFoodVisible();
    document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
      setTimeout(()=>{
        if(t.dataset.tab==='workout') ensureWorkoutVisible();
        if(t.dataset.tab==='food') ensureFoodVisible();
      },20);
    }));
    window.addEventListener('pageshow',()=>setTimeout(rerender,30));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();