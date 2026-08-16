/* Multi-user device-local accounts + first-login transformation onboarding.
   Account/data isolation works on this browser/device. Designed so cloud auth/storage can replace this adapter later. */
(function(){
  const DATA_KEY='decemberTracker.v1';
  const ACCOUNTS_KEY='tausifTracker.accounts.v1';
  const SESSION_KEY='tausifTracker.session.v1';
  const LEGACY_KEY='tausifTracker.legacyClaimed.v1';
  const nativeSet=Storage.prototype.setItem;

  const getJSON=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||'')||fallback}catch{return fallback}};
  const setJSON=(k,v)=>nativeSet.call(localStorage,k,JSON.stringify(v));
  const userDataKey=id=>`${DATA_KEY}.user.${id}`;
  const accounts=()=>getJSON(ACCOUNTS_KEY,[]);
  const sessionId=()=>localStorage.getItem(SESSION_KEY)||'';
  const activeAccount=()=>accounts().find(a=>a.id===sessionId())||null;

  // Restore signed-in user's isolated tracker state before app.js reads DATA_KEY.
  const sid=sessionId();
  if(sid){const saved=localStorage.getItem(userDataKey(sid));if(saved)nativeSet.call(localStorage,DATA_KEY,saved)}

  // Mirror every normal tracker save into the active user's isolated store.
  Storage.prototype.setItem=function(k,v){
    nativeSet.call(this,k,v);
    try{if(this===localStorage&&k===DATA_KEY){const id=sessionId();if(id)nativeSet.call(localStorage,userDataKey(id),v)}}catch{}
  };

  const uid=()=>`u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
  async function hash(text){
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  const gymPlans={
    3:[
      {name:'Full Body A',focus:'Squat • push • pull • core',exercises:[['Squat / leg press',3,10],['Bench press',3,10],['Lat pulldown',3,10],['Romanian deadlift',3,10],['Lateral raise',3,15],['Cable crunch',3,15]]},
      {name:'Full Body B',focus:'Legs • shoulders • back • arms',exercises:[['Hack squat',3,10],['Shoulder press',3,10],['Seated cable row',3,10],['Leg curl',3,12],['Biceps curl',3,12],['Triceps pushdown',3,12]]},
      {name:'Full Body C',focus:'Chest • back • legs • delts',exercises:[['Incline dumbbell press',3,10],['Lat pulldown',3,10],['Leg press',3,12],['Chest-supported row',3,10],['Lateral raise',3,15],['Calf raise',3,15]]}
    ],
    4:[
      {name:'Upper A',focus:'Chest • back • shoulders • arms',exercises:[['Bench press',4,8],['Lat pulldown',4,10],['Seated row',3,10],['Shoulder press',3,10],['Biceps curl',3,12],['Triceps pushdown',3,12]]},
      {name:'Lower A',focus:'Quads • hamstrings • glutes • core',exercises:[['Squat / hack squat',4,8],['Romanian deadlift',3,10],['Leg press',3,12],['Leg curl',3,12],['Calf raise',4,15],['Cable crunch',3,15]]},
      {name:'Upper B',focus:'Upper chest • lats • delts • arms',exercises:[['Incline dumbbell press',4,10],['Chest-supported row',4,10],['Single-arm pulldown',3,12],['Lateral raise',4,15],['Hammer curl',3,12],['Overhead triceps extension',3,12]]},
      {name:'Lower B',focus:'Legs • glutes • core',exercises:[['Leg press',4,10],['Romanian deadlift',3,10],['Leg extension',3,15],['Leg curl',3,12],['Walking lunge',3,12],['Hanging knee raise',3,15]]}
    ],
    5:[
      {name:'Chest + Triceps',focus:'Chest • upper chest • triceps',exercises:[['Bench press',4,8],['Incline dumbbell press',3,10],['Machine chest press',3,12],['Cable fly',3,15],['Rope pushdown',3,12],['Overhead triceps extension',3,12]]},
      {name:'Back + Biceps',focus:'Lats • mid back • biceps',exercises:[['Lat pulldown',4,10],['Chest-supported row',4,10],['Seated cable row',3,12],['Single-arm lat pulldown',3,12],['EZ-bar curl',3,10],['Hammer curl',3,12]]},
      {name:'Legs + Core',focus:'Quads • hamstrings • glutes • abs',exercises:[['Hack squat / squat',4,8],['Romanian deadlift',3,10],['Leg press',3,12],['Leg curl',3,12],['Leg extension',3,15],['Cable crunch',3,15]]},
      {name:'Shoulders + Upper Chest',focus:'Delts • upper chest • rear delts',exercises:[['Incline bench press',4,8],['Seated dumbbell shoulder press',3,10],['Lateral raise',4,15],['Reverse pec deck',4,15],['Low-to-high cable fly',3,15],['Face pull',3,15]]},
      {name:'Back + Arms',focus:'V-taper • biceps • triceps',exercises:[['Pull-up / pulldown',4,10],['T-bar row',3,10],['Straight-arm pulldown',3,15],['Rear-delt fly',3,15],['Incline dumbbell curl',3,12],['Rope pushdown',3,12]]}
    ]
  };
  const homePlans={
    3:[
      {name:'Home Full Body A',focus:'Push • legs • core',exercises:[['Bodyweight squat',4,15],['Push-up',4,12],['Reverse lunge',3,12],['Pike push-up',3,10],['Glute bridge',3,15],['Plank',3,30]]},
      {name:'Home Full Body B',focus:'Legs • back • arms • core',exercises:[['Split squat',3,12],['Backpack row',4,12],['Chair dip',3,10],['Hip hinge / backpack RDL',3,12],['Backpack curl',3,12],['Dead bug',3,12]]},
      {name:'Home Full Body C',focus:'Conditioning • full body',exercises:[['Goblet/backpack squat',4,12],['Incline push-up',4,12],['One-arm backpack row',3,12],['Step-up',3,12],['Lateral raise with bottles',3,15],['Mountain climber',3,30]]}
    ],
    4:[],5:[]
  };
  homePlans[4]=[homePlans[3][0],homePlans[3][1],homePlans[3][2],{name:'Home Mobility + Core',focus:'Core • mobility • recovery',exercises:[['Bird dog',3,12],['Side plank',3,30],['Glute bridge',3,15],['Bodyweight good morning',3,15],['Wall slide',3,15],['Brisk walk',1,30]]}];
  homePlans[5]=[...homePlans[4],{name:'Home Conditioning',focus:'Cardio • work capacity',exercises:[['Bodyweight squat',3,20],['Incline push-up',3,15],['Step-up',3,15],['Backpack row',3,15],['March / brisk walk',1,30]]}];

  function generatePlan(p,existing){
    const weight=Number(p.weight),height=Number(p.height),age=Number(p.age),sex=p.sex;
    const bmr=10*weight+6.25*height-5*age+(sex==='male'?5:-161);
    const activityFactor={low:1.35,moderate:1.5,high:1.65}[p.activity]||1.5;
    const maintenance=Math.round(bmr*activityFactor);
    let calories=maintenance;
    if(p.goal==='fat_loss')calories=maintenance-Math.min(650,Math.max(350,Math.round(maintenance*.18)));
    if(p.goal==='muscle_gain')calories=maintenance+Math.min(350,Math.max(180,Math.round(maintenance*.08)));
    if(p.goal==='recomp')calories=maintenance-Math.min(300,Math.max(150,Math.round(maintenance*.08)));
    calories=Math.round(calories/50)*50;
    const protein=Math.round((p.goal==='muscle_gain'?1.8:2.0)*weight);
    const fat=Math.round(.8*weight);
    const carbs=Math.max(80,Math.round((calories-protein*4-fat*9)/4));
    const days=Math.max(3,Math.min(5,Number(p.days)||4));
    const workouts=structuredClone((p.trainingType==='home'?homePlans:gymPlans)[days]);
    const goalDate=new Date();goalDate.setDate(goalDate.getDate()+Number(p.weeks||16)*7);
    const base=existing&&typeof existing==='object'?structuredClone(existing):{};
    const cfg={...(base.config||{}),age,height,sex,startWeight:weight,goalWeight:Number(p.targetWeight)||weight,goalDate:goalDate.toLocaleDateString('en-CA'),calories,protein,steps:Number(p.steps)||8000,water:Math.max(2.5,Math.round(weight*0.035*10)/10),maintenanceCalories:maintenance,carbs,fat,trainingType:p.trainingType,goal:p.goal,experience:p.experience,diet:p.diet,daysPerWeek:days,minutesPerWorkout:Number(p.minutes)||60};
    return {...base,config:cfg,weights:base.weights?.length?base.weights:[{date:new Date().toLocaleDateString('en-CA'),weight}],waist:base.waist||[],nutrition:base.nutrition||{},activity:base.activity||{},workoutLog:base.workoutLog||{},theme:base.theme||'dark',customFoods:base.customFoods||[],workouts,profile:{name:p.name,email:p.email,goal:p.goal,trainingType:p.trainingType,activity:p.activity,experience:p.experience,diet:p.diet,createdAt:new Date().toISOString()},planSummary:{maintenance,calories,protein,carbs,fat,days,trainingType:p.trainingType,goal:p.goal}};
  }

  function styles(){
    if(document.getElementById('authStyles'))return;
    const s=document.createElement('style');s.id='authStyles';s.textContent=`
      .auth-gate{--auth-accent:#a8f000;position:fixed;inset:0;z-index:99999;overflow:auto;background:#070a08;color:#f4f6f2;padding:calc(22px + env(safe-area-inset-top)) 18px calc(34px + env(safe-area-inset-bottom));font:17px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.auth-gate::before{content:"";position:fixed;z-index:2;inset:0 0 auto;height:max(env(safe-area-inset-top),1px);background:#050705}.auth-shell{width:min(100%,680px);min-height:calc(100dvh - 56px - env(safe-area-inset-top));margin:0 auto;display:grid;align-content:center}.auth-login{max-width:480px}.auth-brand{padding:8px 4px 28px}.auth-logo{display:block;font-size:30px;font-weight:950;letter-spacing:.025em;line-height:1}.auth-logo em{color:var(--auth-accent);font-style:normal}.auth-brand h1{max-width:420px;margin:34px 0 10px;font-size:clamp(36px,10vw,52px);line-height:1.04;letter-spacing:-.035em}.auth-brand b{font-size:30px}.auth-brand p{color:#a6aea6;margin:8px 0 0;font-size:17px}.auth-card{background:#111611;border:1px solid #2b332b;border-radius:22px;padding:24px;box-shadow:0 20px 60px #0007}.auth-form{display:grid;gap:18px}.auth-form label{font-size:15px;color:#b3bbb3;font-weight:700}.auth-field{position:relative}.auth-field svg{position:absolute;left:15px;top:50%;width:24px;height:24px;transform:translateY(-50%);fill:none;stroke:var(--auth-accent);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}.auth-form input,.auth-form select{width:100%;box-sizing:border-box;margin-top:7px;min-height:56px;border:1px solid #384038;background:#090c0a;color:#fff;border-radius:14px;padding:14px 15px;font-size:17px}.auth-field input{margin-top:0;padding-left:52px}.auth-form input:focus,.auth-form select:focus{outline:3px solid #a8f0004d;border-color:var(--auth-accent)}.auth-btn{display:flex;align-items:center;justify-content:center;gap:10px;min-height:54px;border:1px solid var(--auth-accent);border-radius:14px;padding:14px 18px;font-weight:900;font-size:17px;background:linear-gradient(100deg,#b7ff00,#8fd500);color:#0b1006}.auth-btn svg,.auth-switch svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.auth-switch{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;min-height:54px;margin-top:12px;border:1px solid #384038;border-radius:14px;background:transparent;color:#f4f6f2;font-size:17px;font-weight:800}.auth-divider{display:flex;align-items:center;gap:14px;margin:20px 0;color:#899189;font-size:14px}.auth-divider::before,.auth-divider::after{content:"";height:1px;flex:1;background:#303730}.auth-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.auth-note{font-size:14px;color:#919a91;line-height:1.55}.auth-error{color:#ff7277;font-size:14px;min-height:22px}.auth-step{color:var(--auth-accent);font-weight:850;font-size:14px;letter-spacing:.1em}.plan-preview{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:16px 0}.plan-preview div{background:#090c0a;border:1px solid #303830;border-radius:15px;padding:15px}.plan-preview small{color:#98a098}.plan-preview b{display:block;font-size:22px;margin-top:5px}.user-chip{display:flex;gap:8px;align-items:center}.user-chip button{border:1px solid var(--line);background:var(--card);color:inherit;border-radius:12px;padding:8px 10px}.profile-banner{margin-bottom:14px}.profile-banner strong{display:block}.profile-banner small{color:var(--muted)}@media(max-width:560px){.auth-grid,.plan-preview{grid-template-columns:1fr}.auth-card{padding:20px}.auth-brand h1{font-size:40px}}
    `;document.head.appendChild(s);
  }

  function gate(){let g=document.getElementById('authGate');if(!g){g=document.createElement('div');g.id='authGate';g.className='auth-gate';document.body.appendChild(g)}return g}
  function showLogin(mode='login'){
    const g=gate();g.style.display='block';
    g.innerHTML=`<div class="auth-shell auth-login"><div class="auth-brand"><span class="auth-logo">MYBODY <em>2.0</em></span><h1>${mode==='login'?'Welcome back.<br>Let’s get stronger together.':'Create your account.<br>Build your plan.'}</h1><p>${mode==='login'?'Log in to continue your journey.':'Your personalised targets stay editable.'}</p></div><div class="auth-card"><form id="authForm" class="auth-form"><label>Email<div class="auth-field"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg><input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com" required></div></label><label>Password<div class="auth-field"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input id="authPass" type="password" minlength="6" autocomplete="${mode==='login'?'current-password':'new-password'}" placeholder="Enter your password" required></div></label><div id="authError" class="auth-error" role="alert"></div><button class="auth-btn" type="submit">${mode==='login'?'Log in':'Create account'}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button></form><div class="auth-divider">or</div><button id="authSwitch" class="auth-switch" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="8" r="4"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m4-13v6m-3-3h6"/></svg>${mode==='login'?'Create account':'Back to log in'}</button><p class="auth-note">Accounts and tracker data are stored separately on this device.</p></div></div>`;
    document.getElementById('authSwitch').onclick=()=>showLogin(mode==='login'?'signup':'login');
    document.getElementById('authForm').onsubmit=async e=>{e.preventDefault();const email=document.getElementById('authEmail').value.trim().toLowerCase(),pass=document.getElementById('authPass').value,err=document.getElementById('authError');err.textContent='';const list=accounts(),h=await hash(pass);
      if(mode==='signup'){
        if(list.some(a=>a.email===email)){err.textContent='An account with this email already exists on this device.';return}
        const a={id:uid(),email,passHash:h,profileComplete:false,createdAt:new Date().toISOString()};list.push(a);setJSON(ACCOUNTS_KEY,list);nativeSet.call(localStorage,SESSION_KEY,a.id);showOnboarding(a);return;
      }
      const a=list.find(x=>x.email===email&&x.passHash===h);if(!a){err.textContent='Email or password is incorrect.';return}
      nativeSet.call(localStorage,SESSION_KEY,a.id);const data=localStorage.getItem(userDataKey(a.id));if(data)nativeSet.call(localStorage,DATA_KEY,data);if(!a.profileComplete){showOnboarding(a);return}location.reload();
    };
  }

  function showOnboarding(a){
    const g=gate();g.style.display='block';g.innerHTML=`<div class="auth-shell"><div class="auth-brand"><div class="auth-step">FIRST PROFILE</div><b>Build your transformation plan</b><p>We will calculate your starting calories, macros and workout structure from these answers. Everything stays editable later.</p></div><form id="profileForm" class="auth-card auth-form">
      <div class="auth-grid"><label>Name<input id="pName" required></label><label>Sex<select id="pSex"><option value="male">Male</option><option value="female">Female</option></select></label><label>Age<input id="pAge" type="number" min="16" max="90" required></label><label>Height (cm)<input id="pHeight" type="number" min="120" max="230" required></label><label>Current weight (kg)<input id="pWeight" type="number" step="0.1" min="35" max="300" required></label><label>Target weight (kg)<input id="pTarget" type="number" step="0.1" min="35" max="300" required></label></div>
      <label>Transformation goal<select id="pGoal"><option value="fat_loss">Lose fat / weight</option><option value="recomp">Body recomposition</option><option value="muscle_gain">Gain muscle / weight</option><option value="maintain">Maintain & improve fitness</option></select></label>
      <div class="auth-grid"><label>Exercise setup<select id="pTraining"><option value="gym">Gym</option><option value="home">Home</option></select></label><label>Training days / week<select id="pDays"><option>3</option><option selected>4</option><option>5</option></select></label><label>Workout time<select id="pMinutes"><option value="30">30 min</option><option value="45">45 min</option><option value="60" selected>60 min</option><option value="75">75 min</option></select></label><label>Experience<select id="pExperience"><option value="beginner">Beginner</option><option value="intermediate" selected>Intermediate</option><option value="advanced">Advanced</option></select></label><label>Daily activity<select id="pActivity"><option value="low">Mostly sitting</option><option value="moderate" selected>Moderately active</option><option value="high">Very active</option></select></label><label>Diet preference<select id="pDiet"><option value="mixed">Mixed / non-veg</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option></select></label><label>Daily step target<input id="pSteps" type="number" value="8000" step="500"></label><label>Plan length<select id="pWeeks"><option value="12">12 weeks</option><option value="16" selected>16 weeks</option><option value="20">20 weeks</option><option value="24">24 weeks</option></select></label></div>
      <div id="profileError" class="auth-error"></div><button class="auth-btn" type="submit">Create my personalised plan</button><p class="auth-note">Calculated targets are starting estimates, not medical advice. The app can adjust them later from actual weight and performance trends.</p></form></div>`;
    document.getElementById('profileForm').onsubmit=e=>{e.preventDefault();const p={email:a.email,name:document.getElementById('pName').value.trim(),sex:document.getElementById('pSex').value,age:+document.getElementById('pAge').value,height:+document.getElementById('pHeight').value,weight:+document.getElementById('pWeight').value,targetWeight:+document.getElementById('pTarget').value,goal:document.getElementById('pGoal').value,trainingType:document.getElementById('pTraining').value,days:+document.getElementById('pDays').value,minutes:+document.getElementById('pMinutes').value,experience:document.getElementById('pExperience').value,activity:document.getElementById('pActivity').value,diet:document.getElementById('pDiet').value,steps:+document.getElementById('pSteps').value,weeks:+document.getElementById('pWeeks').value};
      if(!p.name||!p.age||!p.height||!p.weight||!p.targetWeight){document.getElementById('profileError').textContent='Please complete all required profile fields.';return}
      let existing={};const legacy=localStorage.getItem(DATA_KEY);if(legacy&&!localStorage.getItem(LEGACY_KEY)&&accounts().length===1){try{existing=JSON.parse(legacy)||{}}catch{};nativeSet.call(localStorage,LEGACY_KEY,'1')}
      const plan=generatePlan(p,existing);nativeSet.call(localStorage,DATA_KEY,JSON.stringify(plan));nativeSet.call(localStorage,userDataKey(a.id),JSON.stringify(plan));const list=accounts(),i=list.findIndex(x=>x.id===a.id);list[i]={...list[i],name:p.name,profileComplete:true};setJSON(ACCOUNTS_KEY,list);showPlanReady(plan);
    };
  }

  function showPlanReady(plan){const g=gate(),s=plan.planSummary;g.innerHTML=`<div class="auth-shell"><div class="auth-brand"><div class="auth-step">PLAN READY</div><b>${esc(plan.profile?.name||'Your')} personalised starting plan</b></div><div class="auth-card"><div class="plan-preview"><div><small>Maintenance</small><b>${s.maintenance} kcal</b></div><div><small>Daily target</small><b>${s.calories} kcal</b></div><div><small>Protein</small><b>${s.protein} g</b></div><div><small>Carbs / Fat</small><b>${s.carbs}g / ${s.fat}g</b></div><div><small>Training</small><b>${s.days} days</b></div><div><small>Setup</small><b>${s.trainingType==='gym'?'Gym':'Home'}</b></div></div><p class="auth-note">Your targets and workout plan have been written into the tracker. You can edit individual foods, exercises, sets, reps and targets at any time.</p><button id="enterTracker" class="auth-btn" style="width:100%;margin-top:12px">Open my tracker</button></div></div>`;document.getElementById('enterTracker').onclick=()=>location.reload()}

  function enhanceSignedInUI(){const a=activeAccount();if(!a)return;const header=document.querySelector('.topbar');if(header&&!document.getElementById('userMenu')){const wrap=document.createElement('div');wrap.id='userMenu';wrap.className='user-chip';wrap.innerHTML=`<button id="profileBtn" type="button">👤 ${esc(a.name||'Profile')}</button><button id="logoutBtn" type="button">Log out</button>`;header.appendChild(wrap);document.getElementById('logoutBtn').onclick=()=>{const id=sessionId(),current=localStorage.getItem(DATA_KEY);if(id&&current)nativeSet.call(localStorage,userDataKey(id),current);localStorage.removeItem(SESSION_KEY);location.reload()};document.getElementById('profileBtn').onclick=()=>{const p=getJSON(DATA_KEY,{}).profile||{};alert(`${p.name||a.name||''}\n${p.goal?`Goal: ${p.goal.replaceAll('_',' ')}`:''}\n${p.trainingType?`Training: ${p.trainingType}`:''}`)}}
    const hero=document.querySelector('.hero');const data=getJSON(DATA_KEY,{});if(hero&&data.profile&&!document.getElementById('profileBanner')){const b=document.createElement('div');b.id='profileBanner';b.className='profile-banner';b.innerHTML=`<strong>${esc(data.profile.name)}'s plan</strong><small>${esc((data.profile.goal||'').replaceAll('_',' '))} • ${esc(data.profile.trainingType||'')} • ${data.config?.daysPerWeek||''} days/week</small>`;hero.prepend(b)}
  }

  function init(){styles();const a=activeAccount();if(!a){showLogin('login');return}if(!a.profileComplete){showOnboarding(a);return}const g=document.getElementById('authGate');if(g)g.style.display='none';enhanceSignedInUI()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
