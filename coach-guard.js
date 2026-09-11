(function(){
  'use strict';
  const Base=window.MyBodyCoach;
  const Store=window.MyBodyStore;
  if(!Base)return;
  const clone=(x)=>typeof structuredClone==='function'?structuredClone(x):JSON.parse(JSON.stringify(x));
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));

  function normalizeDiet(value){
    const d=String(value||'non_vegetarian').trim().toLowerCase().replace(/[\s-]+/g,'_');
    if(['non_vegetarian','nonvegetarian','non_veg','nonveg','omnivore','mixed','no_preference'].includes(d))return'non_vegetarian';
    if(['vegan','plant_based','plantbased'].includes(d))return'vegan';
    if(['eggetarian','eggitarian','ovo_vegetarian','egg_vegetarian'].includes(d)||d.includes('egg'))return'eggetarian';
    if(['vegetarian','veg','lacto_vegetarian'].includes(d))return'vegetarian';
    if(d==='proteinaholic')return'proteinaholic';
    if(d.includes('non')&&d.includes('veg'))return'non_vegetarian';
    return'non_vegetarian';
  }

  function latestDiet(state){
    return normalizeDiet(state?.config?.diet||state?.profile?.coach?.diet||state?.profile?.coach?.plan?.profile?.diet||'non_vegetarian');
  }

  function profileFromState(state){
    const profile=Base.profileFromState(state);
    return {...profile,diet:latestDiet(state)};
  }

  function dietMeals(profile,metrics){
    const diet=normalizeDiet(profile.diet||'non_vegetarian');
    const allergy=String(profile.allergies||'').toLowerCase();
    const dislikes=String(profile.dislikes||'').toLowerCase().split(/[,;]+/).map(x=>x.trim()).filter(Boolean);
    const dairyFree=/lactose|dairy|milk/.test(allergy);
    const glutenFree=/celiac|coeliac|gluten/.test(allergy);
    const base={
      non_vegetarian:{
        Breakfast:['Eggs + roti/chapati + vegetables + curd','Oats + fruit + seeds + curd/soy yogurt','Besan chilla + vegetables + fruit'],
        Lunch:['Chicken/fish + dal + vegetables + rice/roti','Dal/rajma/chana + vegetables + rice/roti','Mixed beans + salad + whole grain'],
        Snack:['Fruit + curd/Greek yogurt','1 scoop whey + water + fruit','Roasted chana + buttermilk'],
        Dinner:['Chicken/fish + vegetables + roti/rice','Dal + vegetables + roti/rice','Lean mutton + vegetables + controlled rice portion']
      },
      vegetarian:{
        Breakfast:['Paneer/tofu bhurji + roti + vegetables','Oats + fruit + seeds + curd/soy yogurt','Besan chilla + vegetables + fruit'],
        Lunch:['Tofu/paneer + dal + vegetables + roti','Dal + vegetables + rice/roti','Rajma/chana + rice + salad'],
        Snack:['Fruit + curd/Greek yogurt','Roasted chana + buttermilk','Nuts/seeds + fruit'],
        Dinner:['Tofu/paneer curry + vegetables + roti','Dal + mixed vegetables + roti','Chana/rajma + vegetables + small rice portion']
      },
      eggetarian:{
        Breakfast:['Eggs + roti + vegetables + curd','Oats + fruit + seeds + curd','Besan chilla + vegetables + fruit'],
        Lunch:['Egg curry + dal + vegetables + rice/roti','Paneer/tofu + dal + roti','Dal/rajma/chana + vegetables + rice/roti'],
        Snack:['2 boiled eggs + fruit','Fruit + curd/Greek yogurt','1 scoop whey + water'],
        Dinner:['Eggs + vegetables + roti','Dal + mixed vegetables + roti','Paneer/tofu + vegetables + controlled rice']
      },
      vegan:{
        Breakfast:['Tofu bhurji + roti + fruit','Oats + fortified soy milk + fruit + seeds','Besan chilla + vegetables + fruit'],
        Lunch:['Tofu + vegetables + roti','Dal + vegetables + rice/roti','Rajma/chana + rice + salad'],
        Snack:['Fruit + roasted chana','Unsweetened soy yogurt + fruit','Nuts/seeds + fruit'],
        Dinner:['Tofu/soy curry + vegetables + roti','Dal + mixed vegetables + roti','Chana/rajma + vegetables + rice']
      },
      proteinaholic:{
        Breakfast:['Besan/moong chilla + vegetables + fruit','Oats + fruit + seeds','Whole grain + fruit + nuts/seeds'],
        Lunch:['Dal/rajma/chana + mixed vegetables + whole grain','Mixed beans + salad + brown rice','Lentils + vegetables + millet/roti'],
        Snack:['Whole fruit + roasted chana','Nuts/seeds + fruit','Vegetables + hummus'],
        Dinner:['Dal + mixed vegetables + roti','Chana/rajma + vegetables + small rice portion','Tofu/beans + vegetables + whole grain']
      }
    };
    let options=clone(base[diet]||base.non_vegetarian);
    if(dairyFree){
      Object.keys(options).forEach((meal)=>{options[meal]=options[meal].map((x)=>x.replace(/curd\/Greek yogurt|curd\/soy yogurt|curd|Greek yogurt|buttermilk|milk/gi,'unsweetened fortified soy alternative'));});
    }
    if(glutenFree){
      Object.keys(options).forEach((meal)=>{options[meal]=options[meal].map((x)=>x.replace(/roti\/chapati|chapati|roti|whole grain/gi,'rice or certified gluten-free grain'));});
    }
    if(dislikes.length){
      Object.keys(options).forEach((meal)=>{
        const kept=options[meal].filter((item)=>!dislikes.some((word)=>word&&item.toLowerCase().includes(word)));
        if(kept.length)options[meal]=kept;
      });
    }
    const split=[0.24,0.32,0.12,0.32],proteinSplit=[0.23,0.30,0.17,0.30],labels=['Breakfast','Lunch','Snack','Dinner'];
    return labels.map((label,i)=>({label,calories:Math.round(metrics.calories*split[i]/25)*25,protein:Math.round(metrics.protein*proteinSplit[i]),options:options[label]}));
  }

  function timeline(profile){
    if(!profile.goalDate||!/^\d{4}-\d{2}-\d{2}$/.test(profile.goalDate)||!Number(profile.goalWeight))return null;
    const days=Math.ceil((new Date(profile.goalDate+'T12:00:00')-new Date())/86400000);
    if(days<=0)return {status:'past',message:'The selected target date has passed. Choose a new date.'};
    const weeks=days/7,delta=Number(profile.goalWeight)-Number(profile.weight),rate=delta/weeks;
    if(profile.goal==='fat_loss'&&delta<0){
      const pct=Math.abs(rate)/Number(profile.weight)*100;
      if(pct>1)return {status:'aggressive',rate:Math.round(rate*100)/100,message:'The requested pace is aggressive. MYBODY keeps the calorie deficit conservative and does not force the target date.'};
      return {status:'reasonable',rate:Math.round(rate*100)/100,message:'The requested timeline is within a generally manageable starting range, subject to real-world progress and recovery.'};
    }
    if(profile.goal==='muscle_gain'&&delta>0){
      const pct=rate/Number(profile.weight)*100;
      if(pct>0.5)return {status:'aggressive',rate:Math.round(rate*100)/100,message:'The requested gain rate is fast for mostly lean tissue. MYBODY uses a modest surplus and treats the date as an estimate.'};
    }
    return {status:'informational',rate:Math.round(rate*100)/100,message:'MYBODY treats the goal date as a planning target, not a guarantee.'};
  }

  function buildPlan(profile){
    const safeProfile={...profile,diet:normalizeDiet(profile?.diet)};
    const plan=Base.buildPlan(safeProfile);
    plan.meals=dietMeals(safeProfile,plan.metrics);
    plan.timeline=timeline(safeProfile);
    plan.profile={...plan.profile,diet:safeProfile.diet};
    plan.profile.goalWeight=Number(safeProfile.goalWeight)||plan.profile.weight;
    plan.profile.allergies=String(safeProfile.allergies||'');
    plan.profile.dislikes=String(safeProfile.dislikes||'');
    return plan;
  }

  function applyPlan(state,plan){
    const safePlan=clone(plan);
    safePlan.profile={...(safePlan.profile||{}),diet:normalizeDiet(safePlan.profile?.diet)};
    safePlan.meals=dietMeals(safePlan.profile||{},safePlan.metrics);
    const result=Base.applyPlan(state,safePlan);
    if(result.ok){
      result.state.config.goalWeight=clamp(safePlan.profile.goalWeight||result.state.config.goalWeight,25,400);
      result.state.config.diet=safePlan.profile.diet;
      result.state.profile=result.state.profile||{};
      result.state.profile.coach=result.state.profile.coach||{};
      result.state.profile.coach.diet=safePlan.profile.diet;
      result.state.profile.coach.timeline=safePlan.timeline||null;
      if(result.state.profile.coach.plan){
        result.state.profile.coach.plan.profile={...result.state.profile.coach.plan.profile,diet:safePlan.profile.diet};
        result.state.profile.coach.plan.meals=dietMeals(result.state.profile.coach.plan.profile||safePlan.profile||{},result.state.profile.coach.plan.metrics);
      }
    }
    return result;
  }

  window.MyBodyCoach=Object.freeze({...Base,profileFromState,buildPlan,applyPlan,mealFramework:dietMeals});

  function syncSavedFramework(){
    if(!Store)return;
    const state=Store.read(),coach=state?.profile?.coach,plan=coach?.plan;
    if(!plan)return;
    const diet=latestDiet(state);
    const profile={...(plan.profile||{}),...(coach||{}),diet};
    const signature=JSON.stringify({diet,allergies:String(profile.allergies||''),dislikes:String(profile.dislikes||''),calories:Number(plan.metrics?.calories||0),protein:Number(plan.metrics?.protein||0)});
    if(plan.mealPreferenceSignature===signature&&normalizeDiet(plan.profile?.diet)===diet)return;
    const next=clone(state),nextCoach=next.profile?.coach,nextPlan=nextCoach?.plan;
    if(!nextCoach||!nextPlan)return;
    next.config={...(next.config||{}),diet};
    nextCoach.diet=diet;
    nextPlan.profile={...(nextPlan.profile||{}),diet,allergies:String(profile.allergies||''),dislikes:String(profile.dislikes||'')};
    nextPlan.meals=dietMeals(nextPlan.profile,nextPlan.metrics||Base.calculate(nextPlan.profile));
    nextPlan.mealPreferenceSignature=signature;
    Store.write(next);
  }

  function mealKey(label){
    const value=String(label||'').toLowerCase();
    if(value.startsWith('break'))return'breakfast';
    if(value.startsWith('lunch'))return'lunch';
    if(value.startsWith('snack'))return'eveningSnacks';
    return'dinner';
  }

  function openQuickLog(label){
    const key=mealKey(label);
    window.dispatchEvent(new CustomEvent('mybody:navigate',{detail:{id:'today'}}));
    setTimeout(()=>{
      document.querySelector(`[data-action="quick-food-meal"][data-meal="${key}"]`)?.click();
      document.querySelector('#quickFoodLog')?.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(()=>document.querySelector('#quickFoodName')?.focus({preventScroll:true}),220);
    },100);
  }

  function decorateMealCards(){
    document.querySelectorAll('.coach-meal-list article').forEach((article)=>{
      if(article.dataset.mealActions==='1')return;
      const label=article.querySelector('strong')?.textContent?.trim()||'Meal';
      const copy=article.querySelector('p');
      if(!copy)return;
      const options=copy.textContent.split(' · ').map(x=>x.trim()).filter(Boolean);
      if(!options.length)return;
      article.dataset.mealActions='1';
      article.dataset.mealIndex='0';
      copy.textContent=options[0];
      const actions=document.createElement('div');
      actions.className='coach-meal-actions';
      actions.innerHTML='<button type="button" class="text-btn" data-coach-meal-swap>Swap meal</button><button type="button" class="secondary" data-coach-meal-log>Quick log</button>';
      article.appendChild(actions);
      actions.querySelector('[data-coach-meal-swap]')?.addEventListener('click',()=>{
        const i=(Number(article.dataset.mealIndex||0)+1)%options.length;
        article.dataset.mealIndex=String(i);
        copy.textContent=options[i];
      });
      actions.querySelector('[data-coach-meal-log]')?.addEventListener('click',()=>openQuickLog(label));
    });
  }

  function ensureStyles(){
    if(document.querySelector('#coachMealActionStyles'))return;
    const style=document.createElement('style');
    style.id='coachMealActionStyles';
    style.textContent='.coach-meal-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.coach-meal-actions button{min-height:36px;padding:7px 11px;border-radius:10px;font-size:12px}.coach-meal-list article>p{margin-bottom:0}';
    document.head.appendChild(style);
  }

  let syncing=false;
  function refresh(){
    ensureStyles();
    if(!syncing){
      syncing=true;
      try{syncSavedFramework();}finally{setTimeout(()=>{syncing=false;},0);}
    }
    decorateMealCards();
  }

  function boot(){
    refresh();
    if(document.body){
      const observer=new MutationObserver(()=>requestAnimationFrame(decorateMealCards));
      observer.observe(document.body,{childList:true,subtree:true});
    }
    window.addEventListener('mybody:state',()=>setTimeout(refresh,40));
    document.addEventListener('click',(event)=>{
      if(event.target.closest('[data-planner="generate"],[data-plan-action="apply"],[data-coach-action="plan"]'))setTimeout(refresh,80);
    },true);
  }

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  }
}());