(function () {
  'use strict';

  const Store = window.MyBodyStore;
  if (!Store) throw new Error('MyBodyStore must load before coach-engine.js');

  const PAL = Object.freeze({ sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 });
  const HIGH_RISK = ['pregnancy', 'kidney', 'eating_disorder', 'recent_surgery', 'uncontrolled_hypertension', 'cardiac'];
  const nowIso = () => new Date().toISOString();
  const dateKey = Store.localDate;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const round = (value, places = 0) => Math.round(value * (10 ** places)) / (10 ** places);
  const clone = Store.clone;

  function currentWeight(state) {
    return Store.number(state.weights?.[0]?.weight, state.config.startWeight, 25, 400);
  }

  function profileFromState(state) {
    const coach = state.profile?.coach || {};
    return {
      sex: coach.sex || state.config.sex || 'male',
      age: Store.number(coach.age, state.config.age, 13, 120),
      height: Store.number(coach.height, state.config.height, 100, 250),
      weight: Store.number(coach.weight, currentWeight(state), 25, 400),
      bodyFat: coach.bodyFat ? clamp(coach.bodyFat, 3, 70) : '',
      goal: coach.goal || state.config.goal || 'fat_loss',
      goalDate: coach.goalDate || state.config.goalDate || '',
      days: clamp(coach.days || state.config.daysPerWeek || Math.min(5, Math.max(1, state.workouts?.length || 4)), 1, 7),
      location: coach.location || state.config.trainingType || 'gym',
      minutes: clamp(coach.minutes || state.config.minutesPerWorkout || 60, 20, 180),
      activity: coach.activity || 'moderate',
      steps: clamp(coach.steps || state.config.steps || 8000, 0, 50000),
      diet: coach.diet || state.config.diet || 'non_vegetarian',
      cuisine: coach.cuisine || 'indian_mixed',
      allergies: coach.allergies || '',
      dislikes: coach.dislikes || '',
      equipment: coach.equipment || '',
      limitations: coach.limitations || '',
      conditions: Array.isArray(coach.conditions) ? coach.conditions : [],
      sleepHours: clamp(coach.sleepHours || 7, 3, 12),
      experience: coach.experience || state.config.experience || 'intermediate'
    };
  }

  function bmr(profile) {
    const base = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
    return Math.round(base + (profile.sex === 'female' ? -161 : 5));
  }

  function targetRate(profile) {
    if (!profile.goalDate || !/^\d{4}-\d{2}-\d{2}$/.test(profile.goalDate)) return null;
    const days = Math.max(1, Math.round((new Date(profile.goalDate + 'T12:00:00') - new Date()) / 86400000));
    if (days <= 0) return null;
    const goalWeight = Number(profile.goalWeight || 0);
    if (!goalWeight) return null;
    return round((profile.weight - goalWeight) / (days / 7), 2);
  }

  function calorieAdjustment(profile) {
    if (profile.goal === 'fat_loss') return -0.18;
    if (profile.goal === 'recomp') return -0.08;
    if (profile.goal === 'muscle_gain') return 0.08;
    return 0;
  }

  function calculate(profile) {
    const basal = bmr(profile);
    const factor = PAL[profile.activity] || PAL.moderate;
    const maintenance = Math.round(basal * factor);
    const adjustment = calorieAdjustment(profile);
    let calories = Math.round((maintenance * (1 + adjustment)) / 50) * 50;
    calories = clamp(calories, profile.sex === 'female' ? 1200 : 1500, 6000);

    const proteinFactor = profile.goal === 'fat_loss' || profile.goal === 'recomp' ? 2.0 : profile.goal === 'muscle_gain' ? 1.8 : 1.6;
    const protein = Math.round(clamp(profile.weight * proteinFactor, 70, 300));
    const fat = Math.round(clamp(profile.weight * 0.8, 45, 160));
    const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));
    const water = round(clamp(profile.weight * 0.035, 2.0, 5.0), 1);
    const fiber = Math.round(clamp(calories / 1000 * 14, 22, 45));

    return {
      bmr: basal,
      pal: factor,
      tdee: maintenance,
      tdeeRange: [Math.round(maintenance * 0.95 / 50) * 50, Math.round(maintenance * 1.05 / 50) * 50],
      calories,
      protein,
      carbs,
      fat,
      fiber,
      water,
      adjustment: Math.round(adjustment * 100)
    };
  }

  function ex(name, sets, reps, scheme, rest, rir) {
    return { name, sets, reps, scheme: scheme || [], rest: rest || 90, rir: rir ?? 2 };
  }

  const gym = {
    fullA: [ex('Barbell Squat',3,8,[10,8,8],150),ex('Bench Press',3,8,[10,8,8],150),ex('Lat Pulldown',3,10,[12,10,10],120),ex('Romanian Deadlift',3,10,[10,10,8],150),ex('Lateral Raise',2,15,[15,12],75),ex('Cable Crunch',2,15,[15,12],75)],
    fullB: [ex('Leg Press',3,10,[12,10,10],150),ex('Incline DB Press',3,10,[12,10,8],120),ex('Seated Cable Row',3,10,[12,10,10],120),ex('Hamstring Curl',3,12,[15,12,12],90),ex('Seated Shoulder Press',2,10,[12,10],120),ex('Hammer Curl',2,12,[12,10],75)],
    fullC: [ex('Hack Squat / Smith Squat',3,10,[12,10,8],150),ex('Machine Chest Press',3,10,[12,10,10],120),ex('Chest-supported Row',3,10,[12,10,8],120),ex('Leg Extension',2,15,[15,12],75),ex('Cable Lateral Raise',2,15,[15,12],75),ex('Rope Overhead Extension',2,12,[12,10],75)],
    upperA: [ex('Bench Press',3,8,[10,8,8],150),ex('Lat Pulldown',3,10,[12,10,8],120),ex('Incline DB Press',3,10,[12,10,8],120),ex('Seated Cable Row',3,10,[12,10,10],120),ex('Lateral Raise',3,15,[15,15,12],75),ex('Cable Rope Pushdown',2,12,[12,10],75),ex('Barbell Curl',2,10,[12,10],75)],
    lowerA: [ex('Barbell Squat',3,8,[10,8,8],180),ex('Romanian Deadlift',3,10,[10,10,8],150),ex('Leg Press',3,12,[15,12,10],150),ex('Hamstring Curl',3,12,[15,12,12],90),ex('Standing Calf Raise',3,15,[15,12,10],75)],
    upperB: [ex('Seated Shoulder Press',3,10,[12,10,8],120),ex('Chest-supported Row',3,10,[12,10,8],120),ex('Machine Chest Press',3,10,[12,10,10],120),ex('Neutral Grip Pulldown',3,10,[12,10,8],120),ex('Reverse Pec Deck',3,15,[15,15,12],75),ex('Incline DB Curl',2,12,[12,10],75),ex('Rope Overhead Extension',2,12,[12,10],75)],
    lowerB: [ex('Hack Squat / Smith Squat',3,10,[12,10,8],180),ex('Bulgarian Split Squat',3,10,[12,10,10],120),ex('Leg Extension',3,15,[15,15,12],75),ex('Hamstring Curl',3,12,[15,12,12],90),ex('Standing Calf Raise',3,15,[15,12,10],75)]
  };

  const doubleSplit = [
    { name:'Monday • Chest + Triceps', focus:'Chest • upper chest • triceps', exercises:[ex('Bench Press',3,10,[12,10,8],150),ex('Incline DB Press',3,10,[12,10,8],120),ex('Machine Chest Press',3,10,[12,10,10],120),ex('Cable Chest Fly',3,15,[15,15,12],75),ex('Push-ups (Finisher)',2,18,[20,15],60),ex('Cable Rope Pushdown',3,12,[15,12,12],75),ex('Skull Crushers',3,10,[12,10,10],90),ex('Single-arm Overhead Extension',2,12,[15,12],75),ex('Dips',2,10,[12,10],90)] },
    { name:'Tuesday • Back + Biceps', focus:'Lats • mid back • biceps', exercises:[ex('Wide-grip Lat Pulldown',3,10,[12,10,8],120),ex('Single-arm Lat Pulldown',2,12,[12,12],90),ex('Seated Cable Row',3,10,[12,10,10],120),ex('Chest-supported Row',3,10,[12,10,8],120),ex('Straight-arm Pulldown',2,15,[15,15],75),ex('Barbell Curl',3,10,[12,10,8],90),ex('Alternating DB Curl',2,11,[12,10],75),ex('Machine Preacher Curl',2,14,[15,12],75),ex('Hammer Curl',2,12,[12,12],75)] },
    { name:'Wednesday • Shoulders + Legs', focus:'Delts • quads • hamstrings • calves', exercises:[ex('Seated Shoulder Press',3,10,[12,10,8],120),ex('Lateral Raises',3,14,[15,15,12],75),ex('Rear Delt Fly',2,15,[15,15],75),ex('Front Raises',2,12,[12,12],75),ex('Leg Press',3,12,[15,12,10],150),ex('Hack Squat / Smith Squat',3,10,[12,10,8],180),ex('Leg Extension',3,14,[15,15,12],75),ex('Hamstring Curl',3,13,[15,12,12],90),ex('Standing Calf Raise',3,12,[15,12,10],75)] },
    { name:'Thursday • Chest + Triceps', focus:'Chest variation • triceps variation', exercises:[ex('Incline Smith Press',3,10,[12,10,8],150),ex('Decline Machine Press',3,11,[12,10,10],120),ex('Cable Crossover (Lower Chest)',2,15,[15,15],75),ex('Pec Deck Fly',2,14,[15,12],75),ex('Push-ups (Finisher)',2,20,[20,20],60),ex('Rope Overhead Extension',3,13,[15,12,12],75),ex('Close-grip Bench Press / Smith',3,10,[12,10,8],120),ex('Tricep Kickback',2,14,[15,12],75),ex('Reverse Grip Pushdown',2,14,[15,12],75)] },
    { name:'Friday • Back + Biceps', focus:'Back variation • biceps variation', exercises:[ex('Neutral Grip Pulldown',3,10,[12,10,8],120),ex('T-Bar Row',3,10,[12,10,8],150),ex('Unilateral Cable Row',2,12,[12,12],90),ex('Machine Row (Wide Chest Supported)',2,11,[12,10],120),ex('Rope Pullovers',2,15,[15,15],75),ex('EZ Bar Curl',3,10,[12,10,8],90),ex('Incline DB Curl',2,11,[12,10],75),ex('Spider Curl',2,14,[15,12],75),ex('Reverse Curl',2,12,[12,12],75)] },
    { name:'Saturday • Shoulders + Legs', focus:'Shoulder variation • leg variation', exercises:[ex('Standing OHP',3,10,[12,10,8],150),ex('Cable Lateral Raise',3,14,[15,15,12],75),ex('Reverse Pec Deck',2,15,[15,15],75),ex('DB Upright Row',2,11,[12,10],90),ex('Barbell Squat / Smith Squat',3,10,[12,10,8],180),ex('Bulgarian Split Squat',2,12,[12,12],120),ex('Leg Extension (Slow Reps)',2,15,[15,15],75),ex('Romanian Deadlift',3,11,[12,10,10],150),ex('Standing Calf Raise',2,15,[15,15],75)] }
  ];

  function homeDay(name, focus, exercises) { return { name, focus, exercises }; }
  const home = [
    homeDay('Home Full Body A','Push • legs • core',[ex('Bodyweight Squat',4,15,[15,15,12,12],75),ex('Push-up',4,12,[15,12,10,10],75),ex('Backpack Row',4,12,[12,12,10,10],90),ex('Reverse Lunge',3,12,[12,12,10],75),ex('Pike Push-up',3,10,[12,10,8],90),ex('Plank',3,30,[30,30,30],60)]),
    homeDay('Home Full Body B','Posterior chain • push • pull',[ex('Backpack Romanian Deadlift',4,12,[12,12,10,10],90),ex('Incline Push-up',4,12,[15,12,12,10],75),ex('One-arm Backpack Row',3,12,[12,12,10],90),ex('Bulgarian Split Squat',3,10,[12,10,10],90),ex('Backpack Curl',3,12,[12,12,10],60),ex('Chair Dip',3,10,[12,10,8],75)]),
    homeDay('Home Full Body C','Legs • shoulders • conditioning',[ex('Goblet / Backpack Squat',4,12,[15,12,12,10],90),ex('Pike Push-up',3,10,[12,10,8],90),ex('Step-up',3,12,[12,12,10],75),ex('Backpack Row',3,12,[12,12,10],90),ex('Bottle Lateral Raise',3,15,[15,15,12],60),ex('Mountain Climber',3,30,[30,30,30],60)])
  ];

  function workoutPlan(profile) {
    const days = clamp(profile.days, 1, 7);
    if (profile.location === 'home') {
      const base = [home[0], home[1], home[2]];
      if (days <= 3) return base.slice(0, days);
      const extra = [
        homeDay('Home Strength A','Slow tempo • full body',clone(home[0].exercises)),
        homeDay('Home Strength B','Slow tempo • full body',clone(home[1].exercises)),
        homeDay('Home Conditioning','Work capacity • core',clone(home[2].exercises)),
        homeDay('Recovery + Mobility','Easy movement • mobility',[ex('Brisk Walk',1,30,[30],0,4),ex('Bird Dog',3,12,[12,12,12],45,4),ex('Glute Bridge',3,15,[15,15,15],45,4),ex('Side Plank',3,30,[30,30,30],45,4)])
      ];
      return [...base, ...extra].slice(0, days);
    }
    if (days === 1) return [{ name:'Full Body', focus:'Squat • push • pull • hinge • core', exercises:clone(gym.fullA) }];
    if (days === 2) return [{ name:'Full Body A', focus:'Strength • full body', exercises:clone(gym.fullA) },{ name:'Full Body B', focus:'Strength • full body', exercises:clone(gym.fullB) }];
    if (days === 3) return [{ name:'Full Body A', focus:'Strength • full body', exercises:clone(gym.fullA) },{ name:'Full Body B', focus:'Strength • full body', exercises:clone(gym.fullB) },{ name:'Full Body C', focus:'Strength • full body', exercises:clone(gym.fullC) }];
    if (days === 4) return [{ name:'Upper A', focus:'Chest • back • shoulders • arms', exercises:clone(gym.upperA) },{ name:'Lower A', focus:'Quads • hamstrings • glutes', exercises:clone(gym.lowerA) },{ name:'Upper B', focus:'Chest • back • shoulders • arms', exercises:clone(gym.upperB) },{ name:'Lower B', focus:'Quads • hamstrings • glutes', exercises:clone(gym.lowerB) }];
    if (days === 5) return [{ name:'Upper A', focus:'Chest • back • shoulders • arms', exercises:clone(gym.upperA) },{ name:'Lower A', focus:'Quads • hamstrings • glutes', exercises:clone(gym.lowerA) },{ name:'Push', focus:'Chest • shoulders • triceps', exercises:clone(doubleSplit[0].exercises.slice(0,7)) },{ name:'Pull', focus:'Back • biceps', exercises:clone(doubleSplit[1].exercises.slice(0,7)) },{ name:'Legs', focus:'Quads • hamstrings • calves', exercises:clone(doubleSplit[2].exercises.slice(4)) }];
    if (days === 6) return clone(doubleSplit);
    return [...clone(doubleSplit), { name:'Sunday • Recovery', focus:'Low intensity cardio • mobility • recovery', exercises:[ex('Brisk Walk',1,35,[35],0,4),ex('Bird Dog',3,12,[12,12,12],45,4),ex('Glute Bridge',3,15,[15,15,15],45,4),ex('Plank',3,30,[30,30,30],45,4)] }];
  }

  function toAppWorkouts(plan) {
    return plan.map((day) => ({
      name: day.name,
      focus: day.focus,
      exercises: day.exercises.map((item) => [item.name, item.sets, item.reps, item.scheme])
    }));
  }

  function mealFramework(profile, metrics) {
    const total = metrics.calories;
    const split = [0.24, 0.32, 0.12, 0.32];
    const proteinSplit = [0.23, 0.30, 0.17, 0.30];
    const labels = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
    const indian = {
      Breakfast:['Eggs + chapati + curd','Oats + milk + whey + fruit','Paneer/tofu bhurji + roti'],
      Lunch:['Chicken/fish + dal + roti + vegetables','Rajma/chana + rice + curd','Paneer/tofu + roti + salad'],
      Snack:['Fruit + Greek yogurt/curd','Milk + whey','Roasted chana + buttermilk'],
      Dinner:['Chicken/fish curry + vegetables + roti','Dal + paneer/tofu + vegetables','Lean mutton + salad + controlled rice portion']
    };
    return labels.map((label, index) => ({
      label,
      calories: Math.round(total * split[index] / 25) * 25,
      protein: Math.round(metrics.protein * proteinSplit[index]),
      options: indian[label]
    }));
  }

  function safety(profile) {
    const conditions = Array.isArray(profile.conditions) ? profile.conditions : [];
    const flags = conditions.filter((item) => HIGH_RISK.includes(item));
    return {
      level: flags.length ? 'review' : 'standard',
      flags,
      message: flags.length ? 'Automated calorie and training prescriptions should be reviewed with an appropriate clinician before you apply them.' : 'General fitness and nutrition guidance only. Stop exercise and seek medical advice for concerning symptoms.'
    };
  }

  function buildPlan(profileInput) {
    const profile = { ...profileInput, days: clamp(profileInput.days, 1, 7) };
    const metrics = calculate(profile);
    const training = workoutPlan(profile);
    const safe = safety(profile);
    return {
      version: 1,
      generatedAt: nowIso(),
      profile: clone(profile),
      metrics,
      training,
      workouts: toAppWorkouts(training),
      meals: mealFramework(profile, metrics),
      safety: safe,
      progression: {
        method: 'double_progression_rir',
        targetRir: 2,
        rule: 'Increase load only when all planned reps are completed with about 2 reps in reserve. Hold load when the final set reaches failure; reduce 5% after repeated large misses.'
      },
      recovery: { sleep: '7–9 h/night', hydration: `${metrics.water} L/day starting target`, offDays: 'Easy walking, mobility and normal daily activity.' }
    };
  }

  function dayTotals(state, key) {
    const meals = state.nutrition?.[key]?.meals || {};
    return Object.values(meals).flat().reduce((sum, food) => {
      sum.calories += Number(food?.calories || 0);
      sum.protein += Number(food?.protein || 0);
      return sum;
    }, { calories: 0, protein: 0 });
  }

  function datesBack(count) {
    const result = [];
    for (let i = 0; i < count; i += 1) {
      const d = new Date(); d.setDate(d.getDate() - i); result.push(dateKey(d));
    }
    return result;
  }

  function weeklyStats(state) {
    const dates = datesBack(7);
    let calories = 0, protein = 0, steps = 0, calorieDays = 0, stepDays = 0, workouts = 0;
    dates.forEach((key) => {
      const totals = dayTotals(state, key);
      if (totals.calories > 0) { calories += totals.calories; protein += totals.protein; calorieDays += 1; }
      const s = Number(state.activity?.[key]?.steps || 0);
      if (s > 0) { steps += s; stepDays += 1; }
      if (state.workoutLog?.[key] && Object.keys(state.workoutLog[key]).length) workouts += 1;
    });
    return {
      avgCalories: calorieDays ? Math.round(calories / calorieDays) : 0,
      avgProtein: calorieDays ? Math.round(protein / calorieDays) : 0,
      avgSteps: stepDays ? Math.round(steps / stepDays) : 0,
      workouts,
      calorieDays,
      stepDays
    };
  }

  function trendWeight(state) {
    const sorted = (state.weights || []).filter((x) => x?.date && x?.weight).slice().sort((a,b) => a.date.localeCompare(b.date));
    const recent = sorted.filter((x) => x.date >= datesBack(7).slice(-1)[0]);
    const priorStart = new Date(); priorStart.setDate(priorStart.getDate() - 13);
    const priorEnd = new Date(); priorEnd.setDate(priorEnd.getDate() - 7);
    const pStart = dateKey(priorStart), pEnd = dateKey(priorEnd);
    const prior = sorted.filter((x) => x.date >= pStart && x.date <= pEnd);
    const avg = (arr) => arr.length ? arr.reduce((a,x) => a + Number(x.weight), 0) / arr.length : null;
    const r = avg(recent), p = avg(prior);
    return { recent: r ? round(r,1) : null, previous: p ? round(p,1) : null, change: r && p ? round(r-p,2) : null };
  }

  function readiness(sleep, energy, soreness) {
    const s = clamp(sleep, 1, 5), e = clamp(energy, 1, 5), so = clamp(soreness, 1, 5);
    const score = Math.round(((s + e + (6 - so)) / 15) * 100);
    const recommendation = score >= 75 ? 'Train normally' : score >= 55 ? 'Train, but reduce load or sets if warm-ups feel unusually hard' : 'Recovery-focused day recommended';
    return { score, recommendation, sleep:s, energy:e, soreness:so, date:dateKey(), savedAt:nowIso() };
  }

  function insights(state) {
    const coach = state.profile?.coach || {};
    const plan = coach.plan;
    if (!plan) return [{ type:'setup', title:'Build your personalized plan', body:'Answer a few questions and MYBODY will set training, calories, macros and weekly targets.' }];
    const stats = weeklyStats(state);
    const out = [];
    const proteinTarget = Number(plan.metrics?.protein || state.config.protein || 0);
    const calorieTarget = Number(plan.metrics?.calories || state.config.calories || 0);
    const stepTarget = Number(coach.steps || state.config.steps || 0);
    if (stats.calorieDays >= 3) {
      if (stats.avgProtein < proteinTarget * 0.85) out.push({ type:'nutrition', title:'Protein is your clearest opportunity', body:`Your 7-day logged average is ${stats.avgProtein} g vs ${proteinTarget} g target. Add one protein-rich serving to the meal that is usually lowest.` });
      else if (Math.abs(stats.avgCalories - calorieTarget) <= calorieTarget * 0.08) out.push({ type:'nutrition', title:'Nutrition consistency is strong', body:`Average intake is ${stats.avgCalories} kcal, close to your ${calorieTarget} kcal target.` });
      else if (stats.avgCalories > calorieTarget * 1.1) out.push({ type:'nutrition', title:'Calories are running above target', body:`Your logged average is ${stats.avgCalories} kcal. Focus on portions and high-satiety foods before changing the target.` });
    }
    if (stats.stepDays >= 3 && stepTarget) {
      if (stats.avgSteps < stepTarget * 0.85) out.push({ type:'activity', title:'Daily movement can improve', body:`You average ${stats.avgSteps.toLocaleString()} steps vs ${stepTarget.toLocaleString()} target. Add a short walk after one or two meals.` });
      else out.push({ type:'activity', title:'Step target is on track', body:`Your 7-day average is ${stats.avgSteps.toLocaleString()} steps.` });
    }
    if (stats.workouts) out.push({ type:'training', title:`${stats.workouts} workouts logged this week`, body: stats.workouts >= Math.min(Number(coach.days || 4), 6) ? 'Training adherence is on target. Progress load only when reps and technique are controlled.' : 'Keep the next session simple and focus on completing the planned working sets.' });
    const trend = trendWeight(state);
    if (trend.change != null) out.push({ type:'progress', title:`Trend weight ${trend.change > 0 ? '+' : ''}${trend.change} kg`, body:`Recent average ${trend.recent} kg vs prior ${trend.previous} kg. Use the trend, not a single weigh-in, to judge progress.` });
    const ready = coach.readiness?.[dateKey()];
    if (ready) out.unshift({ type:'readiness', title:`Readiness ${ready.score}/100`, body:ready.recommendation });
    if (!out.length) out.push({ type:'start', title:'Start logging this week', body:'A few days of food, steps, workouts and weight data will unlock useful coaching feedback.' });
    return out;
  }

  function applyPlan(state, plan) {
    if (plan.safety?.level === 'review') return { ok:false, reason:plan.safety.message, state };
    const next = clone(state);
    next.profile = next.profile || {};
    next.profile.coach = { ...next.profile.coach, ...clone(plan.profile), plan, lastAppliedAt:nowIso() };
    next.config = { ...next.config,
      age: plan.profile.age,
      height: plan.profile.height,
      sex: plan.profile.sex,
      goalDate: plan.profile.goalDate || next.config.goalDate,
      calories: plan.metrics.calories,
      protein: plan.metrics.protein,
      steps: plan.profile.steps,
      water: plan.metrics.water,
      daysPerWeek: plan.profile.days,
      minutesPerWorkout: plan.profile.minutes,
      trainingType: plan.profile.location,
      goal: plan.profile.goal,
      diet: plan.profile.diet,
      experience: plan.profile.experience,
      maintenanceCalories: plan.metrics.tdee,
      carbs: plan.metrics.carbs,
      fat: plan.metrics.fat,
      fiber: plan.metrics.fiber
    };
    next.workouts = clone(plan.workouts);
    return { ok:true, state:next };
  }

  window.MyBodyCoach = Object.freeze({ PAL, profileFromState, bmr, calculate, buildPlan, weeklyStats, trendWeight, readiness, insights, applyPlan, workoutPlan, mealFramework, safety });
}());