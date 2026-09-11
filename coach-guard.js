(function(){
  'use strict';
  const Base=window.MyBodyCoach;
  if(!Base)return;
  const clone=(x)=>typeof structuredClone==='function'?structuredClone(x):JSON.parse(JSON.stringify(x));
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));

  function dietMeals(profile,metrics){
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
      },
      proteinaholic:{
        Breakfast:['Oats + fruit + seeds','Besan/moong chilla + vegetables + fruit','Whole grain + fruit + nuts/seeds'],
        Lunch:['Dal/rajma/chana + mixed vegetables + whole grain','Mixed beans + salad + brown rice','Lentils + vegetables + millet/roti'],
        Snack:['Whole fruit + roasted chana','Nuts/seeds + fruit','Vegetables + hummus'],
        Dinner:['Dal + mixed vegetables + roti','Chana/rajma + vegetables + small rice portion','Tofu/beans + vegetables + whole grain']
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
    const plan=Base.buildPlan(profile);
    plan.meals=dietMeals(profile,plan.metrics);
    plan.timeline=timeline(profile);
    plan.profile.goalWeight=Number(profile.goalWeight)||plan.profile.weight;
    plan.profile.allergies=String(profile.allergies||'');
    plan.profile.dislikes=String(profile.dislikes||'');
    return plan;
  }

  function applyPlan(state,plan){
    const safePlan=clone(plan);
    safePlan.meals=dietMeals(safePlan.profile||{},safePlan.metrics);
    const result=Base.applyPlan(state,safePlan);
    if(result.ok){
      result.state.config.goalWeight=clamp(safePlan.profile.goalWeight||result.state.config.goalWeight,25,400);
      result.state.profile=result.state.profile||{};
      result.state.profile.coach=result.state.profile.coach||{};
      result.state.profile.coach.timeline=safePlan.timeline||null;
      if(result.state.profile.coach.plan){
        result.state.profile.coach.plan.meals=dietMeals(result.state.profile.coach.plan.profile||safePlan.profile||{},result.state.profile.coach.plan.metrics);
      }
    }
    return result;
  }

  window.MyBodyCoach=Object.freeze({...Base,buildPlan,applyPlan});
}());
