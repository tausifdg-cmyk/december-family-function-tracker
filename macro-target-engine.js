(function(){
'use strict';
const Base=window.MyBodyStore;
if(!Base)return;
const PAL=Object.freeze({sedentary:1.2,light:1.375,moderate:1.55,active:1.725});
const clone=Base.clone;
const number=Base.number;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
const safeRecord=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};

function nutritionTargets(source={}){
  const config=safeRecord(source.config);
  const coach=safeRecord(source.profile?.coach);
  const latestWeight=Array.isArray(source.weights)&&source.weights.length?source.weights[0]?.weight:null;
  const weight=number(source.weight??coach.weight??latestWeight??config.startWeight,70,25,400);
  const age=number(source.age??coach.age??config.age,40,13,120);
  const height=number(source.height??coach.height??config.height,175,100,250);
  const sex=String(source.sex??coach.sex??config.sex??'male')==='female'?'female':'male';
  const activity=String(source.activity??coach.activity??config.activity??'moderate');
  const goal=String(source.goal??coach.goal??config.goal??'fat_loss');
  const basal=Math.round(10*weight+6.25*height-5*age+(sex==='female'?-161:5));
  const pal=PAL[activity]||PAL.moderate;
  const tdee=Math.round(basal*pal);
  const adjustment=goal==='fat_loss'?-0.18:goal==='recomp'?-0.08:goal==='muscle_gain'?0.08:0;
  let calories=Math.round((tdee*(1+adjustment))/50)*50;
  calories=clamp(calories,sex==='female'?1200:1500,6000);

  // Proteinaholic-inspired general-adult target: RDA-style protein, not a bodybuilding multiplier.
  const protein=Math.round(clamp(weight*0.8,35,200));
  // Fat/carbohydrate split is an app allocation rule: 25% of calories from fat, carbs fill the remainder.
  const fat=Math.round(clamp((calories*0.25)/9,30,180));
  const carbs=Math.max(80,Math.round((calories-protein*4-fat*9)/4));
  const fiber=Math.round(clamp(calories/1000*14,22,45));
  const water=Math.round(clamp(weight*0.035,2,5)*10)/10;
  return {bmr:basal,pal,tdee,calories,protein,carbs,fat,fiber,water,adjustment:Math.round(adjustment*100)};
}

function applyTargets(input){
  const state=clone(input||{});
  state.config=safeRecord(state.config);
  const targets=nutritionTargets(state);
  state.config={...state.config,calories:targets.calories,protein:targets.protein,carbs:targets.carbs,fat:targets.fat};
  const plan=state.profile?.coach?.plan;
  if(plan&&typeof plan==='object'){
    state.profile=clone(state.profile||{});
    state.profile.coach=clone(state.profile.coach||{});
    state.profile.coach.plan=clone(state.profile.coach.plan||{});
    state.profile.coach.plan.metrics={...(state.profile.coach.plan.metrics||{}),...targets};
    if(Array.isArray(state.profile.coach.plan.meals)){
      const shares=[0.23,0.30,0.17,0.30];
      state.profile.coach.plan.meals=state.profile.coach.plan.meals.map((meal,i)=>({...safeRecord(meal),protein:Math.round(targets.protein*(shares[i]||0.25))}));
    }
  }
  return state;
}

function normalise(input){return applyTargets(Base.normalise(input));}
function read(){return applyTargets(Base.read());}
function scopedKey(){
  try{const session=localStorage.getItem(Base.SESSION_KEY);return session?`${Base.DATA_KEY}.user.${session}`:Base.DATA_KEY}catch(_){return Base.DATA_KEY}
}
function quotaError(error){return error&&(error.name==='QuotaExceededError'||error.name==='NS_ERROR_DOM_QUOTA_REACHED'||error.code===22||error.code===1014)}
function write(nextState){
  let state=normalise(nextState);
  const save=()=>{
    const payload=JSON.stringify(state);
    localStorage.setItem(Base.DATA_KEY,payload);
    const scoped=scopedKey();
    if(scoped!==Base.DATA_KEY)localStorage.setItem(scoped,payload);
  };
  try{save()}catch(error){
    if(!quotaError(error))throw error;
    state=applyTargets(Base.prune(state));
    try{save()}catch(retryError){window.dispatchEvent(new CustomEvent('mybody:storage-error',{detail:retryError}));return{ok:false,state,error:retryError}}
  }
  window.dispatchEvent(new CustomEvent('mybody:state',{detail:clone(state)}));
  return{ok:true,state};
}

window.MyBodyStore=Object.freeze({...Base,nutritionTargets,normalise,read,write});
})();
