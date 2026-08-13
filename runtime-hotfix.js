/* MYBODY 2.0 runtime hotfix v24: normalize saved plans before core app starts and guarantee navigation. */
(function(){
  var KEY='decemberTracker.v1';
  try{
    var raw=localStorage.getItem(KEY);
    if(raw){
      var s=JSON.parse(raw)||{};
      s.config=s.config||{};
      s.weights=Array.isArray(s.weights)?s.weights:[];
      s.waist=Array.isArray(s.waist)?s.waist:[];
      s.nutrition=s.nutrition&&typeof s.nutrition==='object'?s.nutrition:{};
      s.activity=s.activity&&typeof s.activity==='object'?s.activity:{};
      s.workoutLog=s.workoutLog&&typeof s.workoutLog==='object'?s.workoutLog:{};
      s.customFoods=Array.isArray(s.customFoods)?s.customFoods:[];
      if(Array.isArray(s.workouts)&&s.workouts.length){
        var original=s.workouts.slice();
        while(s.workouts.length<5){
          var src=original[s.workouts.length%original.length]||original[0];
          s.workouts.push({name:(src&&src.name?src.name:'Workout')+' • Alt',focus:src&&src.focus?src.focus:'Personalised training',exercises:Array.isArray(src&&src.exercises)?src.exercises:[]});
        }
      }
      localStorage.setItem(KEY,JSON.stringify(s));
    }
  }catch(e){console.warn('MYBODY normalization skipped',e)}

  function wireNav(){
    var tabs=[].slice.call(document.querySelectorAll('.tab[data-tab]'));
    if(!tabs.length)return;
    tabs.forEach(function(btn){
      if(btn.dataset.hotfixWired==='1')return;
      btn.dataset.hotfixWired='1';
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-tab');
        tabs.forEach(function(x){x.classList.toggle('active',x===btn)});
        [].slice.call(document.querySelectorAll('.panel')).forEach(function(p){p.classList.toggle('active',p.id===id)});
        try{window.scrollTo({top:0,behavior:'smooth'})}catch(e){window.scrollTo(0,0)}
      });
    });
  }
  wireNav();
  document.addEventListener('DOMContentLoaded',wireNav);
  window.addEventListener('load',wireNav);
})();