/* Data-driven 12-week plan engine. Kept dependency-free for offline PWA use. */
const PLAN_CONFIG={
  startWeightKg:89,
  goalWeightKg:78,
  goalDate:'2026-12-03',
  weeks:12,
  calories:{min:2250,max:2400},
  proteinGrams:{min:170,max:180},
  waterLitres:3.5,
  workoutsPerWeek:5
};

function planStartDate(goalDate=PLAN_CONFIG.goalDate,weeks=PLAN_CONFIG.weeks){
  const end=new Date(`${goalDate}T00:00:00`);
  end.setDate(end.getDate()-(weeks*7-1));
  return end;
}

function clampWeek(week){return Math.max(1,Math.min(PLAN_CONFIG.weeks,week));}

function getCurrentPlanWeek(date=new Date()){
  const start=planStartDate();
  const diff=Math.floor((new Date(date).setHours(0,0,0,0)-start.getTime())/86400000);
  return clampWeek(Math.floor(diff/7)+1);
}

function buildWeeklyPlan(){
  const start=planStartDate();
  const totalLoss=PLAN_CONFIG.startWeightKg-PLAN_CONFIG.goalWeightKg;
  return Array.from({length:PLAN_CONFIG.weeks},(_,i)=>{
    const week=i+1;
    const weekStart=new Date(start);weekStart.setDate(start.getDate()+i*7);
    const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+6);
    const targetWeight=PLAN_CONFIG.startWeightKg-(totalLoss*(week/PLAN_CONFIG.weeks));
    const phase=week<=3?'Foundation':week<=6?'Build':week<=9?'Lean Out':'Function Ready';
    return {week,phase,start:isoDate(weekStart),end:isoDate(weekEnd),targetWeightKg:round(targetWeight,1),expectedLossKg:round(totalLoss/PLAN_CONFIG.weeks,2),calories:PLAN_CONFIG.calories,proteinGrams:PLAN_CONFIG.proteinGrams,waterLitres:PLAN_CONFIG.waterLitres,workoutsPerWeek:PLAN_CONFIG.workoutsPerWeek};
  });
}

function getPlanStatus(actualWeight,currentWeek=getCurrentPlanWeek()){
  const weeks=buildWeeklyPlan();
  const week=weeks[clampWeek(currentWeek)-1];
  const delta=round(actualWeight-week.targetWeightKg,1);
  return {week:week.week,phase:week.phase,targetWeightKg:week.targetWeightKg,actualWeightKg:actualWeight,deltaKg:delta,status:Math.abs(delta)<=0.5?'on-track':delta<0?'ahead':'behind'};
}

function isoDate(date){return new Date(date).toISOString().slice(0,10);}
function round(value,places=1){const p=10**places;return Math.round(value*p)/p;}

if(typeof window!=='undefined'){
  window.DecemberPlan={config:PLAN_CONFIG,buildWeeklyPlan,getCurrentPlanWeek,getPlanStatus,planStartDate};
}
