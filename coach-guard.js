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
        Breakfast:['Eggs + roti/chapati + vegetables','Oats + protein-rich yogurt or milk + fruit','Egg bhurji + toast/roti + fruit'],
        Lunch:['Chicken/fish + dal + vegetables + rice/roti','Lean meat curry + vegetables + controlled rice portion','Egg curry + dal + vegetables + rice/roti'],
        Snack:['Curd/Greek yogurt + fruit','Milk or whey shake','Roasted chana + buttermilk'],
        Dinner:['Chicken/fish + vegetables + roti/rice','Lean mutton + vegetables + controlled rice portion','Eggs + dal + vegetables + roti']
      },
      vegetarian:{
        Breakfast:['Paneer bhurji + roti + fruit','Oats + milk/curd + fruit','Besan chilla + curd'],
        Lunch:['Dal + paneer/tofu + vegetables + rice/roti','Rajma/chana + rice + curd + salad','Soy chunks + vegetables + roti'],
        Snack:['Curd/Greek yogurt + fruit','Roasted chana + buttermilk','Paneer/tofu snack + fruit'],
        Dinner:['Paneer/tofu curry + vegetables + roti','Dal + soy chunks + vegetables + rice','Khichdi + curd + added paneer/tofu']
      },
      eggetarian:{
        Breakfast:['Eggs + roti + vegetables','Oats + milk/curd + fruit','Egg bhurji + chapati'],
        Lunch:['Egg curry + dal + vegetables + rice/roti','Paneer/tofu + dal + roti','Rajma/chana + rice + curd'],
        Snack:['Boiled eggs + fruit','Curd/Greek yogurt + fruit','Roasted chana + buttermilk'],
        Dinner:['Eggs + vegetables + roti','Paneer/tofu curry + dal + vegetables','Egg curry + controlled rice portion + salad']
      },
      vegan:{
        Breakfast:['Tofu bhurji + roti + fruit','Oats + fortified soy milk + fruit','Besan chilla + tofu filling'],
        Lunch:['Dal + tofu + vegetables + rice/roti','Rajma/chana + rice + salad','Soy chunks + vegetables + roti'],
        Snack:['Roasted chana + fruit','Unsweetened soy yogurt + fruit','Tofu/soy snack + fruit'],
        Dinner:['Tofu/soy curry + vegetables + roti','Dal + soy chunks + vegetables + rice','Khichdi + tofu + salad']
      }
    };
    let options=clone(base[diet]||base.non_vegetarian);
    if(dairyFree){
      Object.keys(options).forEach((meal)=>{options[meal]=options[meal].map((x)=>x.replace(/milk\/curd|milk or whey|Milk or whey|Curd\/Greek yogurt|curd\/Greek yogurt|buttermilk|curd/gi,'unsweetened fortified soy alternative'));});
    }
    if(glutenFree){
      Object.keys(options).forEach((meal)=>{options[meal]=options[meal].map((x)=>x.replace(/roti\/chapati|chapati|roti|toast/gi,'rice or certified gluten-free grain'));});
    }
    const split=[0.24,0.32,0.12,0.32],proteinSplit=[0.23,0.30,0.17,0.30],labels=['Breakfast','Lunch','Snack','Dinner'];
    return labels.map((label,i)=>({label,calories:Math.round(metrics.calories*split[i]/25)*25,protein:Math.round(metrics.protein*proteinSplit[i]),options:options[label]}));
  }

  function timeline(profile,metrics){
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
    plan.timeline=timeline(profile,plan.metrics);
    plan.profile.goalWeight=Number(profile.goalWeight)||plan.profile.weight;
    plan.profile.allergies=String(profile.allergies||'');
    plan.profile.dislikes=String(profile.dislikes||'');
    return plan;
  }

  function applyPlan(state,plan){
    const result=Base.applyPlan(state,plan);
    if(result.ok){
      result.state.config.goalWeight=clamp(plan.profile.goalWeight||result.state.config.goalWeight,25,400);
      result.state.profile=result.state.profile||{};
      result.state.profile.coach=result.state.profile.coach||{};
      result.state.profile.coach.timeline=plan.timeline||null;
    }
    return result;
  }

  window.MyBodyCoach=Object.freeze({...Base,buildPlan,applyPlan});
}());