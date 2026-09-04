(function(){
  'use strict';
  const Base=window.MyBodyCoach;
  if(!Base)return;
  const Store=window.MyBodyStore;
  const clone=(x)=>typeof structuredClone==='function'?structuredClone(x):JSON.parse(JSON.stringify(x));
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
  const APPROVED_PROTEIN=Number(Store?.APPROVED_PROTEIN)||115;

  function fixMetrics(metrics){
    const next={...(metrics||{})};
    next.protein=APPROVED_PROTEIN;
    if(Number(next.calories)>0&&Number(next.fat)>=0){
      next.carbs=Math.max(80,Math.round((Number(next.calories)-APPROVED_PROTEIN*4-Number(next.fat)*9)/4));
    }
    if(!Number(next.fiber)) next.fiber=Math.round(clamp((Number(next.calories)||2000)/1000*14,22,45));
    return next;
  }

  function dietMeals(profile,metrics){
    metrics=fixMetrics(metrics);
    const diet=profile.diet||'non_vegetarian';
    const allergy=String(profile.allergies||'').toLowerCase();
    const dairyFree=/lactose|dairy|milk/.test(allergy);
    const glutenFree=/celiac|coeliac|gluten/.test(allergy);
    const base={
      non_vegetarian:{
        Breakfast:['Oats + fruit + seeds + curd/soy yogurt','Besan chilla + vegetables + fruit','Eggs + roti/chapati + vegetables'],
        Lunch:['Dal/rajma/chana + vegetables + rice/roti','Mixed beans + salad + whole grain','Chicken/fish + dal + vegetables + rice/roti'],
        Snack:['Fruit + roasted chana','Curd/soy yogurt + fruit','Nuts/seeds + fruit'],
        Dinner:['Dal + vegetables + roti/rice','Chana/rajma + vegetables + small rice portion','Chicken/fish + vegetables + roti/rice']
      },
      vegetarian:{
        Breakfast:['Oats + fruit + seeds','Besan chilla + vegetables + fruit','Paneer/tofu bhurji + roti'],
        Lunch:['Dal + vegetables + rice/roti','Rajma/chana + rice + salad','Tofu/paneer + vegetables + roti'],
        Snack:['Fruit + roasted chana','Curd/soy yogurt + fruit','Nuts/seeds + fruit'],
        Dinner:['Dal + mixed vegetables + roti','Chana/rajma + vegetables + small rice portion','Tofu/paneer curry + vegetables + roti']
      },
      eggetarian:{
        Breakfast:['Oats + fruit + seeds','Besan chilla + vegetables + fruit','Eggs + roti + vegetables'],
        Lunch:['Dal/rajma/chana + vegetables + rice/roti','Paneer/tofu + dal + roti','Egg curry + dal + vegetables + rice/roti'],
        Snack:['Fruit + roasted chana','Curd/soy yogurt + fruit','Nuts/seeds + fruit'],
        Dinner:['Dal + mixed vegetables + roti','Chana/rajma + vegetables + rice','Eggs + vegetables + roti']
      },
      vegan:{
        Breakfast:['Oats + fortified soy milk + fruit + seeds','Tofu bhurji + roti + fruit','Besan chilla + vegetables + fruit'],
        Lunch:['Dal + vegetables + rice/roti','Rajma/chana + rice + salad','Tofu + vegetables + roti'],
        Snack:['Fruit + roasted chana','Unsweetened soy yogurt + fruit','Nuts/seeds + fruit'],
        Dinner:['Dal + mixed vegetables + roti','Chana/rajma + vegetables + rice','Tofu/soy curry + vegetables + roti']
      }
    };
    let options=clone(base[diet]||base.non_vegetarian);
    if(dairyFree){
      Object.keys(options).forEach((meal)=>{options[meal]=options[meal].map((x)=>x.replace(/curd\/soy yogurt|curd|milk/gi,'unsweetened fortified soy alternative'));});
    }
    if(glutenFree){
      Object.keys(options).forEach((meal)=>{options[meal]=options[meal].map((x)=>x.replace(/roti\/chapati|chapati|roti|whole grain/gi,'rice or certified gluten-free grain'));});
    }
    const split=[0.24,0.32,0.12,0.32],proteinSplit=[0.23,0.30,0.17,0.30],labels=['Breakfast','Lunch','Snack','Dinner'];
    return labels.map((label,i)=>({label,calories:Math.round(metrics.calories*split[i]/25)*25,protein:Math.round(APPROVED_PROTEIN*proteinSplit[i]),options:options[label]}));
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

  function calculate(profile){
    return fixMetrics(Base.calculate(profile));
  }

  function buildPlan(profile){
    const plan=Base.buildPlan(profile);
    plan.metrics=fixMetrics(plan.metrics);
    plan.meals=dietMeals(profile,plan.metrics);
    plan.timeline=timeline(profile);
    plan.profile.goalWeight=Number(profile.goalWeight)||plan.profile.weight;
    plan.profile.allergies=String(profile.allergies||'');
    plan.profile.dislikes=String(profile.dislikes||'');
    return plan;
  }

  function applyPlan(state,plan){
    const safePlan=clone(plan);
    safePlan.metrics=fixMetrics(safePlan.metrics);
    safePlan.meals=dietMeals(safePlan.profile||{},safePlan.metrics);
    const result=Base.applyPlan(state,safePlan);
    if(result.ok){
      result.state.config.goalWeight=clamp(safePlan.profile.goalWeight||result.state.config.goalWeight,25,400);
      result.state.config.protein=APPROVED_PROTEIN;
      result.state.profile=result.state.profile||{};
      result.state.profile.coach=result.state.profile.coach||{};
      result.state.profile.coach.timeline=safePlan.timeline||null;
      if(result.state.profile.coach.plan){
        result.state.profile.coach.plan.metrics=fixMetrics(result.state.profile.coach.plan.metrics);
        result.state.profile.coach.plan.meals=dietMeals(result.state.profile.coach.plan.profile||safePlan.profile||{},result.state.profile.coach.plan.metrics);
      }
    }
    return result;
  }

  function insights(state){
    const base=Array.isArray(Base.insights?.(state))?Base.insights(state):[];
    return base.map((item)=>{
      const title=String(item?.title||'');
      const body=String(item?.body||'');
      if(/protein is your clearest opportunity|add one protein-rich serving/i.test(title+' '+body)){
        return {
          ...item,
          type:'nutrition',
          title:'Improve food quality first',
          body:'Prioritize vegetables, beans/lentils, whole grains, fruit, nuts and seeds. Aim for the 115 g protein target across the day without trying to exceed it; protein powders are optional.'
        };
      }
      return item;
    });
  }

  function migrateSavedProtein(){
    if(!Store)return;
    const state=Store.read();
    let changed=false;
    if(Number(state.config?.protein)!==APPROVED_PROTEIN){state.config={...state.config,protein:APPROVED_PROTEIN};changed=true;}
    if(state.profile?.coach?.plan&&Number(state.profile.coach.plan.metrics?.protein)!==APPROVED_PROTEIN){
      state.profile=clone(state.profile||{});
      state.profile.coach=clone(state.profile.coach||{});
      state.profile.coach.plan=clone(state.profile.coach.plan||{});
      state.profile.coach.plan.metrics=fixMetrics(state.profile.coach.plan.metrics);
      state.profile.coach.plan.meals=dietMeals(state.profile.coach.plan.profile||state.profile.coach,state.profile.coach.plan.metrics);
      changed=true;
    }
    if(changed)Store.write(state);
  }

  window.MyBodyCoach=Object.freeze({...Base,calculate,buildPlan,applyPlan,insights});
  migrateSavedProtein();
}());
