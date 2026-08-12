/* Reliability + visual workout upgrade. Keeps existing localStorage format and app logic. */
(function(){
  const KEY='decemberTracker.v1';
  const muscleMap={
    'barbell bench press':'Chest','incline dumbbell press':'Upper chest','machine chest press':'Chest','cable fly':'Chest',
    'rope pushdown':'Triceps','overhead cable extension':'Triceps','overhead triceps extension':'Triceps',
    'lat pulldown':'Lats','single-arm lat pulldown':'Lats','pull-up / pulldown':'Lats','straight-arm pulldown':'Lats',
    'chest-supported row':'Mid back','seated cable row':'Mid back','t-bar row':'Mid back','face pull':'Rear delts',
    'ez-bar curl':'Biceps','hammer curl':'Biceps','incline dumbbell curl':'Biceps',
    'hack squat / squat':'Quads','romanian deadlift':'Hamstrings','leg press':'Quads','leg curl':'Hamstrings','leg extension':'Quads','calf raise':'Calves','cable crunch':'Abs',
    'incline bench press':'Upper chest','seated dumbbell shoulder press':'Shoulders','lateral raise':'Side delts','reverse pec deck':'Rear delts','low-to-high cable fly':'Upper chest','rear-delt fly':'Rear delts'
  };
  const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  const muscleFor=name=>muscleMap[norm(name)]||'Target muscle';
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function svgFor(muscle){
    const m=norm(muscle), hit={chest:false,shoulder:false,arm:false,back:false,abs:false,quad:false,ham:false,calf:false};
    if(m.includes('chest'))hit.chest=true;
    if(m.includes('delt')||m.includes('shoulder'))hit.shoulder=true;
    if(m.includes('biceps')||m.includes('triceps'))hit.arm=true;
    if(m.includes('back')||m.includes('lat'))hit.back=true;
    if(m.includes('abs'))hit.abs=true;
    if(m.includes('quad'))hit.quad=true;
    if(m.includes('ham'))hit.ham=true;
    if(m.includes('calf'))hit.calf=true;
    const a='var(--accent)', base='currentColor';
    return `<svg viewBox="0 0 72 94" role="img" aria-label="Primary muscle: ${esc(muscle)}">
      <circle cx="36" cy="10" r="7" fill="none" stroke="${base}" stroke-width="2" opacity=".45"/>
      <path d="M27 20 Q36 16 45 20 L50 46 Q44 54 43 63 L42 88 M45 21 L58 49 M27 21 L14 49 M29 47 Q36 52 43 47 L30 88" fill="none" stroke="${base}" stroke-width="3" stroke-linecap="round" opacity=".4"/>
      ${hit.shoulder?'<circle cx="27" cy="23" r="5" fill="'+a+'" opacity=".9"/><circle cx="45" cy="23" r="5" fill="'+a+'" opacity=".9"/>':''}
      ${hit.chest?'<path d="M28 25 Q36 21 44 25 L43 36 Q36 39 29 36Z" fill="'+a+'" opacity=".85"/>':''}
      ${hit.arm?'<path d="M22 27 L15 49" stroke="'+a+'" stroke-width="6" stroke-linecap="round"/><path d="M50 27 L57 49" stroke="'+a+'" stroke-width="6" stroke-linecap="round"/>':''}
      ${hit.back?'<path d="M27 25 Q36 20 45 25 L44 45 Q36 50 28 45Z" fill="'+a+'" opacity=".8"/>':''}
      ${hit.abs?'<rect x="31" y="35" width="10" height="16" rx="3" fill="'+a+'" opacity=".85"/>':''}
      ${hit.quad?'<path d="M30 53 L28 76" stroke="'+a+'" stroke-width="7" stroke-linecap="round"/><path d="M42 53 L44 76" stroke="'+a+'" stroke-width="7" stroke-linecap="round"/>':''}
      ${hit.ham?'<path d="M31 55 L29 75" stroke="'+a+'" stroke-width="6" stroke-linecap="round" opacity=".8"/><path d="M41 55 L43 75" stroke="'+a+'" stroke-width="6" stroke-linecap="round" opacity=".8"/>':''}
      ${hit.calf?'<path d="M29 76 L29 89" stroke="'+a+'" stroke-width="6" stroke-linecap="round"/><path d="M43 76 L43 89" stroke="'+a+'" stroke-width="6" stroke-linecap="round"/>':''}
    </svg>`;
  }

  function injectStyles(){
    if(document.getElementById('trackerUpgradeStyles'))return;
    const style=document.createElement('style');style.id='trackerUpgradeStyles';style.textContent=`
      .exercise-visual-strip{display:grid;grid-template-columns:72px 1fr auto;gap:12px;align-items:center;margin:12px 0;padding:10px;border:1px solid var(--line);border-radius:14px;background:color-mix(in srgb,var(--card) 88%,transparent)}
      .exercise-visual-strip svg{width:64px;height:82px;color:var(--muted)}
      .muscle-copy span{display:block;color:var(--muted);font-size:11px}.muscle-copy strong{display:block;margin-top:4px}.exercise-video-link{align-self:center;text-decoration:none;white-space:nowrap}
      .log-status{margin:10px 0 0;padding:9px 11px;border:1px solid var(--line);border-radius:12px;color:var(--muted);font-size:12px}.log-status.ok{color:var(--accent)}
      .meal-save{margin-top:10px;width:100%}.meal-card .meal-head{align-items:flex-start}
      @media(max-width:520px){.exercise-visual-strip{grid-template-columns:58px 1fr}.exercise-visual-strip svg{width:54px;height:72px}.exercise-video-link{grid-column:1/-1;width:100%;text-align:center}.muscle-copy strong{font-size:13px}}
    `;document.head.appendChild(style);
  }

  function decorateExercises(){
    document.querySelectorAll('#exerciseList article.exercise').forEach(card=>{
      if(card.querySelector('.exercise-visual-strip'))return;
      const name=card.querySelector('h4')?.textContent?.trim();if(!name)return;
      const muscle=muscleFor(name),strip=document.createElement('div');strip.className='exercise-visual-strip';
      const oldVideo=card.querySelector('.exercise-video-link');
      strip.innerHTML=`${svgFor(muscle)}<div class="muscle-copy"><span>PRIMARY MUSCLE</span><strong>${esc(muscle)}</strong></div>`;
      if(oldVideo)strip.appendChild(oldVideo);else if(window.workoutVideoReference?.urlFor){const a=document.createElement('a');a.className='secondary exercise-video-link';a.href=window.workoutVideoReference.urlFor(name);a.target='_blank';a.rel='noopener noreferrer';a.textContent='▶ Form video';strip.appendChild(a)}
      const top=card.querySelector('.exercise-top');top?.insertAdjacentElement('afterend',strip);
    });
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

  const observer=new MutationObserver(()=>{decorateExercises();ensureStatuses()});
  function init(){injectStyles();decorateExercises();ensureStatuses();const w=document.getElementById('workout'),f=document.getElementById('food');if(w)observer.observe(w,{childList:true,subtree:true});if(f)observer.observe(f,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();