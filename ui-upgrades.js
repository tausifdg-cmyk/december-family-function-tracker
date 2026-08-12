/* Reliability helpers for workout and meal logging. */
(function(){
  const KEY='decemberTracker.v1';
  const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');

  function injectStyles(){
    if(document.getElementById('trackerUpgradeStyles'))return;
    const style=document.createElement('style');style.id='trackerUpgradeStyles';style.textContent=`
      .log-status{margin:10px 0 0;padding:9px 11px;border:1px solid var(--line);border-radius:12px;color:var(--muted);font-size:12px}.log-status.ok{color:var(--accent)}
      .meal-save{margin-top:10px;width:100%}.meal-card .meal-head{align-items:flex-start}
      .exercise-video-link{display:inline-block;margin-top:10px;text-decoration:none;white-space:nowrap}
      @media(max-width:520px){.exercise-video-link{width:100%;text-align:center}}
    `;document.head.appendChild(style);
  }

  function ensureStatuses(){
    const workout=document.getElementById('saveWorkout');
    if(workout&&!document.getElementById('workoutLogStatus')){const s=document.createElement('div');s.id='workoutLogStatus';s.className='log-status';s.textContent='Changes are saved as you type. Tap Save workout to confirm the session.';workout.insertAdjacentElement('afterend',s)}
    document.querySelectorAll('#mealSections .meal-card').forEach(card=>{if(card.querySelector('.meal-save'))return;const meal=card.dataset.meal;const b=document.createElement('button');b.type='button';b.className='secondary meal-save';b.dataset.meal=meal;b.textContent='Save '+(meal?meal[0].toUpperCase()+meal.slice(1):'meal');card.appendChild(b)});
  }

  function saveWorkoutDraft(){
    try{
      if(typeof state==='undefined'||typeof selectedDay==='undefined'||typeof today!=='function')return;
      const p=state.workouts[selectedDay];if(!p)return;const k=today();
      const minutes=Number(document.getElementById('workoutMinutes')?.value)||0,met=Number(document.getElementById('workoutIntensity')?.value)||5.5;
      const exercises=p.exercises.map((e,i)=>({sets:Number(document.querySelector(`.ex-set[data-i="${i}"]`)?.value)||0,reps:Number(document.querySelector(`.ex-reps[data-i="${i}"]`)?.value)||0,weight:Number(document.querySelector(`.ex-weight[data-i="${i}"]`)?.value)||0}));
      state.workoutLog[k]??={};state.workoutLog[k][selectedDay]={minutes,met,exercises};state.activity[k]={...(state.activity[k]||{}),minutes,met,workoutDay:selectedDay};
      localStorage.setItem(KEY,JSON.stringify(state));
      const s=document.getElementById('workoutLogStatus');if(s){s.textContent='Draft saved ✓';s.classList.add('ok')}
    }catch(e){console.warn('Workout draft save failed',e)}
  }

  function lookupFood(name){
    const q=norm(name),foods=[...(window.FOOD_DB||[]),...((typeof state!=='undefined'&&state.customFoods)||[])];
    return foods.find(f=>norm(f.name)===q)||foods.find(f=>norm(f.name).includes(q)||f.aliases?.some(a=>norm(a).includes(q)));
  }

  function commitMeal(meal,rerender=true){
    try{
      if(typeof state==='undefined'||typeof today!=='function')return false;const card=document.querySelector(`#mealSections .meal-card[data-meal="${meal}"]`);if(!card)return false;
      const items=[...card.querySelectorAll('.food-row')].map(row=>{const name=row.querySelector('.food-name')?.value||'',food=lookupFood(name),grams=Number(row.querySelector('.food-grams')?.value)||Number(food?.defaultGrams)||0;if(!food||!grams)return null;const calc=k=>Math.round(((Number(food[k])||0)*grams/100)*10)/10;return{name:food.name,grams,calories:calc('calories'),protein:calc('protein'),carbs:calc('carbs'),fat:calc('fat')}}).filter(Boolean);
      const k=today();state.nutrition[k]??={};state.nutrition[k].meals??={breakfast:[],lunch:[],dinner:[]};state.nutrition[k].meals[meal]=items;localStorage.setItem(KEY,JSON.stringify(state));
      if(rerender&&typeof renderAll==='function')renderAll();return true;
    }catch(e){console.warn('Meal save failed',e);return false}
  }

  let mealTimer;
  document.addEventListener('input',e=>{
    if(e.target.matches('#exerciseList .ex-set,#exerciseList .ex-reps,#exerciseList .ex-weight,#workoutMinutes,#workoutIntensity'))saveWorkoutDraft();
    if(e.target.matches('#mealSections .food-name,#mealSections .food-grams')){clearTimeout(mealTimer);const meal=e.target.closest('.meal-card')?.dataset.meal;mealTimer=setTimeout(()=>{if(meal)commitMeal(meal,false)},500)}
  });

  document.addEventListener('click',e=>{
    const saveMeal=e.target.closest('.meal-save');if(saveMeal){const ok=commitMeal(saveMeal.dataset.meal,true);setTimeout(()=>{const card=document.querySelector(`#mealSections .meal-card[data-meal="${saveMeal.dataset.meal}"]`),b=card?.querySelector('.meal-save');if(b){b.textContent=ok?'Saved ✓':'Check food name';setTimeout(()=>{if(b)b.textContent='Save '+saveMeal.dataset.meal[0].toUpperCase()+saveMeal.dataset.meal.slice(1)},1200)}},30)}
    if(e.target.closest('#saveWorkout'))setTimeout(()=>{const s=document.getElementById('workoutLogStatus');if(s){s.textContent='Workout saved ✓';s.classList.add('ok')}},40);
  });

  const observer=new MutationObserver(()=>ensureStatuses());
  function init(){injectStyles();ensureStatuses();document.querySelectorAll('.exercise-visual-strip').forEach(x=>x.remove());const w=document.getElementById('workout'),f=document.getElementById('food');if(w)observer.observe(w,{childList:true,subtree:true});if(f)observer.observe(f,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();