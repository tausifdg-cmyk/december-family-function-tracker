/* MYBODY 2.0 startup-safe bootstrap. */
(function(){
  var KEY='decemberTracker.v1';
  window.FOOD_DB=window.FOOD_DB||[];
  try{
    var raw=localStorage.getItem(KEY);
    if(raw){
      var s=JSON.parse(raw)||{};
      s.weights=Array.isArray(s.weights)?s.weights:[];
      s.waist=Array.isArray(s.waist)?s.waist:[];
      s.nutrition=s.nutrition&&typeof s.nutrition==='object'?s.nutrition:{};
      s.activity=s.activity&&typeof s.activity==='object'?s.activity:{};
      s.workoutLog=s.workoutLog&&typeof s.workoutLog==='object'?s.workoutLog:{};
      s.customFoods=Array.isArray(s.customFoods)?s.customFoods:[];
      if(Array.isArray(s.workouts)&&s.workouts.length){
        var base=s.workouts.slice();
        while(s.workouts.length<5){
          var src=base[s.workouts.length%base.length]||base[0];
          s.workouts.push({name:(src.name||'Workout')+' Alt',focus:src.focus||'Training',exercises:Array.isArray(src.exercises)?src.exercises:[]});
        }
      }
      localStorage.setItem(KEY,JSON.stringify(s));
    }
  }catch(e){}
  function wire(){
    var tabs=[].slice.call(document.querySelectorAll('.tab[data-tab]'));
    tabs.forEach(function(btn){
      if(btn.dataset.safeNav)return;
      btn.dataset.safeNav='1';
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-tab');
        tabs.forEach(function(x){x.classList.toggle('active',x===btn)});
        [].slice.call(document.querySelectorAll('.panel')).forEach(function(p){p.classList.toggle('active',p.id===id)});
        window.scrollTo(0,0);
      });
    });
  }
  document.addEventListener('DOMContentLoaded',wire);
  window.addEventListener('load',wire);
})();