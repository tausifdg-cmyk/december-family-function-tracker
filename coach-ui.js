(function () {
  'use strict';

  const Store = window.MyBodyStore;
  const Coach = window.MyBodyCoach;
  if (!Store || !Coach) throw new Error('MYBODY Coach dependencies missing');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  let state = Store.read();
  let draftPlan = null;
  let step = 1;

  function write(next, message) {
    const result = Store.write(next);
    state = result.state;
    render();
    if (message) toast(message);
    return result.ok;
  }

  function toast(message) {
    const node = $('#appToast');
    if (!node) return;
    node.textContent = message;
    node.dataset.type = 'success';
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 2200);
  }

  function coachState() {
    return state.profile?.coach || {};
  }

  function goalLabel(goal) {
    return ({ fat_loss:'Fat loss', muscle_gain:'Muscle gain', recomp:'Recomposition', general:'General health' })[goal] || 'Personal plan';
  }

  function primaryInsight() {
    return Coach.insights(state)[0];
  }

  function ensureCard() {
    const today = $('#today');
    if (!today || $('#mybodyCoachCard')) return;
    const anchor = $('#today > .section-head');
    if (!anchor) return;
    const section = document.createElement('section');
    section.id = 'mybodyCoachCard';
    section.className = 'coach-card';
    anchor.insertAdjacentElement('afterend', section);
  }

  function renderCard() {
    ensureCard();
    const card = $('#mybodyCoachCard');
    if (!card) return;
    const coach = coachState();
    const plan = coach.plan;
    const insight = primaryInsight();
    const ready = coach.readiness?.[Store.localDate()];
    if (!plan) {
      card.innerHTML = `<div class="coach-card-head"><div><span class="coach-brand">MYBODY Coach</span><h2>Your plan should adapt to you.</h2><p>Build a personalized training and nutrition plan from your goal, schedule, lifestyle and health context.</p></div><span class="coach-orb" aria-hidden="true">✦</span></div><div class="coach-benefits"><span>Training 1–7 days</span><span>Calories + macros</span><span>Weekly guidance</span></div><button class="primary coach-main-action" type="button" data-coach-action="build">Build my plan</button>`;
      return;
    }
    const metrics = plan.metrics;
    card.innerHTML = `<div class="coach-card-head"><div><span class="coach-brand">MYBODY Coach</span><h2>${esc(goalLabel(plan.profile.goal))} • ${esc(plan.profile.days)} day plan</h2><p>${esc(insight.body)}</p></div><button class="coach-readiness ${ready ? 'has-score' : ''}" type="button" data-coach-action="readiness"><small>Readiness</small><strong>${ready ? ready.score : '—'}</strong><span>${ready ? '/100' : 'Check in'}</span></button></div><div class="coach-metric-strip"><div><small>Calories</small><b>${metrics.calories}</b><span>kcal</span></div><div><small>Protein</small><b>${metrics.protein}</b><span>g</span></div><div><small>Steps</small><b>${Number(plan.profile.steps || state.config.steps || 0).toLocaleString()}</b><span>/ day</span></div><div><small>Training</small><b>${plan.profile.days}</b><span>days</span></div></div><div class="coach-insight"><span>${esc(insight.title)}</span><p>${esc(insight.body)}</p></div><div class="coach-actions"><button type="button" class="primary" data-coach-action="plan">View plan</button><button type="button" class="secondary" data-coach-action="review">Weekly review</button><button type="button" class="text-btn" data-coach-action="build">Rebuild</button></div>`;
  }

  function modalShell(id, title, subtitle) {
    let modal = document.getElementById(id);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = id;
      modal.className = 'coach-modal hidden';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `<div class="coach-modal-panel" role="dialog" aria-modal="true"><header class="coach-modal-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle || '')}</p></div><button class="coach-close" type="button" aria-label="Close">×</button></header><div class="coach-modal-body"></div></div>`;
    modal.querySelector('.coach-close').onclick = () => closeModal(modal);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal); });
    return modal;
  }

  function openModal(modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function closeModal(modal) {
    modal.classList.add('hidden');
    if (!document.querySelector('.coach-modal:not(.hidden),.sheet-backdrop:not(.hidden),.media-lightbox:not(.hidden)')) document.body.classList.remove('modal-open');
  }

  function defaultDraft() {
    const p = Coach.profileFromState(state);
    return { ...p, goalWeight: state.config.goalWeight || p.weight, conditions: Array.isArray(p.conditions) ? p.conditions : [] };
  }

  function selectOptions(options, current) {
    return options.map(([value,label]) => `<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`).join('');
  }

  function buildPlanner() {
    draftPlan = null;
    step = 1;
    const modal = modalShell('coachPlannerModal','Build your MYBODY plan','Evidence-informed guidance tailored to your real schedule.');
    openModal(modal);
    renderPlannerStep(modal, defaultDraft());
  }

  function plannerProgress(current) {
    return `<div class="coach-stepper">${[1,2,3,4].map((n) => `<span class="${n<=current?'active':''}">${n}</span>`).join('')}</div>`;
  }

  function renderPlannerStep(modal, data) {
    const body = $('.coach-modal-body', modal);
    body.dataset.profile = JSON.stringify(data);
    if (step === 1) {
      body.innerHTML = `${plannerProgress(step)}<div class="coach-step-copy"><h3>Goal & body</h3><p>We use these details to estimate energy needs and set an appropriate starting target.</p></div><div class="coach-form-grid"><label>Sex<select name="sex">${selectOptions([['male','Male'],['female','Female']],data.sex)}</select></label><label>Age<input name="age" type="number" min="13" max="120" value="${esc(data.age)}"></label><label>Height (cm)<input name="height" type="number" min="100" max="250" value="${esc(data.height)}"></label><label>Current weight (kg)<input name="weight" type="number" min="25" max="400" step="0.1" value="${esc(data.weight)}"></label><label>Body fat % <span>optional</span><input name="bodyFat" type="number" min="3" max="70" step="0.1" value="${esc(data.bodyFat)}"></label><label>Goal<select name="goal">${selectOptions([['fat_loss','Fat loss'],['muscle_gain','Muscle gain'],['recomp','Recomposition'],['general','General health']],data.goal)}</select></label><label>Goal weight (kg)<input name="goalWeight" type="number" min="25" max="400" step="0.1" value="${esc(data.goalWeight)}"></label><label>Target date<input name="goalDate" type="date" value="${esc(data.goalDate)}"></label></div>${plannerActions(false)}`;
    } else if (step === 2) {
      body.innerHTML = `${plannerProgress(step)}<div class="coach-step-copy"><h3>Schedule & training</h3><p>The best plan is one you can actually complete consistently.</p></div><div class="coach-form-grid"><label>Training days / week<select name="days">${[1,2,3,4,5,6,7].map((n)=>`<option value="${n}" ${Number(data.days)===n?'selected':''}>${n} day${n>1?'s':''}</option>`).join('')}</select></label><label>Workout location<select name="location">${selectOptions([['gym','Gym'],['home','Home']],data.location)}</select></label><label>Minutes / workout<select name="minutes">${selectOptions([[30,'30 min'],[45,'45 min'],[60,'60 min'],[75,'75 min'],[90,'90 min']],data.minutes)}</select></label><label>Experience<select name="experience">${selectOptions([['beginner','Beginner'],['intermediate','Intermediate'],['advanced','Advanced']],data.experience)}</select></label><label>Activity outside training<select name="activity">${selectOptions([['sedentary','Mostly sedentary'],['light','Lightly active'],['moderate','Moderately active'],['active','Very active']],data.activity)}</select></label><label>Daily step target<input name="steps" type="number" min="0" max="50000" step="500" value="${esc(data.steps)}"></label><label class="wide">Equipment available <span>optional</span><input name="equipment" placeholder="e.g. dumbbells, bench, bands" value="${esc(data.equipment)}"></label></div>${plannerActions(true)}`;
    } else if (step === 3) {
      body.innerHTML = `${plannerProgress(step)}<div class="coach-step-copy"><h3>Food preferences</h3><p>Nutrition should fit your culture, routine and preferences instead of forcing a rigid meal plan.</p></div><div class="coach-form-grid"><label>Diet<select name="diet">${selectOptions([['non_vegetarian','Non-vegetarian'],['vegetarian','Vegetarian'],['eggetarian','Eggetarian'],['vegan','Vegan'],['no_preference','No preference']],data.diet)}</select></label><label>Cuisine<select name="cuisine">${selectOptions([['indian_mixed','Indian / mixed'],['international','International'],['no_preference','No preference']],data.cuisine)}</select></label><label class="wide">Allergies / intolerances <span>optional</span><input name="allergies" placeholder="e.g. lactose, peanuts, gluten" value="${esc(data.allergies)}"></label><label class="wide">Foods you avoid or dislike <span>optional</span><input name="dislikes" placeholder="e.g. fish, mushrooms" value="${esc(data.dislikes)}"></label></div>${plannerActions(true)}`;
    } else {
      const conditions = [
        ['none','None of these'],['hypertension','Controlled hypertension'],['uncontrolled_hypertension','Uncontrolled high blood pressure'],['diabetes','Diabetes / glucose-lowering medication'],['kidney','Kidney disease'],['cardiac','Heart / cardiovascular condition'],['pregnancy','Pregnancy'],['recent_surgery','Recent surgery'],['eating_disorder','Current or previous eating disorder']
      ];
      body.innerHTML = `${plannerProgress(step)}<div class="coach-step-copy"><h3>Health & recovery</h3><p>This helps MYBODY know when a normal automated plan is inappropriate and clinician input is safer.</p></div><div class="coach-condition-grid">${conditions.map(([value,label])=>`<label><input type="checkbox" name="condition" value="${value}" ${data.conditions.includes(value)?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div><div class="coach-form-grid"><label class="wide">Injuries or physical limitations <span>optional</span><input name="limitations" placeholder="e.g. right shoulder pain, knee limitation" value="${esc(data.limitations)}"></label><label>Typical sleep<select name="sleepHours">${selectOptions([[5,'≤5 h'],[6,'~6 h'],[7,'~7 h'],[8,'~8 h'],[9,'9+ h']],Math.round(data.sleepHours||7))}</select></label></div><div class="coach-safety-note">MYBODY provides general fitness and nutrition guidance. It does not diagnose or treat medical conditions.</div>${plannerActions(true,true)}`;
    }
    wirePlanner(modal);
  }

  function plannerActions(back, finish) {
    return `<div class="coach-planner-actions">${back?'<button type="button" class="secondary" data-planner="back">Back</button>':''}<button type="button" class="primary" data-planner="${finish?'generate':'next'}">${finish?'Generate my plan':'Continue'}</button></div>`;
  }

  function collectPlanner(modal) {
    const body = $('.coach-modal-body', modal);
    let data = {};
    try { data = JSON.parse(body.dataset.profile || '{}'); } catch (_) {}
    $$('input[name],select[name]', body).forEach((field) => {
      if (field.name === 'condition') return;
      data[field.name] = field.type === 'number' ? num(field.value, '') : field.value;
    });
    if ($$('input[name="condition"]',body).length) {
      data.conditions = $$('input[name="condition"]:checked',body).map((x)=>x.value).filter((x)=>x!=='none');
    }
    data.days = num(data.days,4);
    data.minutes = num(data.minutes,60);
    data.steps = num(data.steps,8000);
    data.age = num(data.age,state.config.age);
    data.height = num(data.height,state.config.height);
    data.weight = num(data.weight,state.config.startWeight);
    data.goalWeight = num(data.goalWeight,state.config.goalWeight);
    data.sleepHours = num(data.sleepHours,7);
    return data;
  }

  function wirePlanner(modal) {
    $$('[data-planner]',modal).forEach((button) => button.onclick = () => {
      const data = collectPlanner(modal);
      if (button.dataset.planner === 'back') { step -= 1; renderPlannerStep(modal,data); return; }
      if (button.dataset.planner === 'next') { step += 1; renderPlannerStep(modal,data); return; }
      draftPlan = Coach.buildPlan(data);
      renderPlanResult(modal,draftPlan,true);
    });
  }

  function renderPlanResult(modal, plan, fromPlanner) {
    const body = $('.coach-modal-body',modal);
    const m = plan.metrics;
    const risk = plan.safety.level === 'review';
    body.innerHTML = `<div class="coach-plan-hero ${risk?'risk':''}"><span>${risk?'Clinician review recommended':'Your MYBODY plan is ready'}</span><h3>${esc(goalLabel(plan.profile.goal))} • ${plan.profile.days} training day${plan.profile.days>1?'s':''}</h3><p>${esc(plan.safety.message)}</p></div><div class="coach-plan-metrics"><div><small>BMR estimate</small><strong>${m.bmr}</strong><span>kcal/day</span></div><div><small>Maintenance estimate</small><strong>${m.tdeeRange[0]}–${m.tdeeRange[1]}</strong><span>kcal/day</span></div><div class="accent"><small>Starting target</small><strong>${m.calories}</strong><span>kcal/day</span></div></div><div class="coach-macro-row"><span><b>${m.protein}g</b> Protein</span><span><b>${m.carbs}g</b> Carbs</span><span><b>${m.fat}g</b> Fat</span><span><b>${m.fiber}g+</b> Fiber</span></div><section class="coach-plan-section"><div class="coach-section-title"><h3>Weekly training</h3><span>${plan.profile.minutes} min/session</span></div><div class="coach-day-list">${plan.training.map((day,index)=>`<article><div><b>D${index+1}</b><span><strong>${esc(day.name)}</strong><small>${esc(day.focus)}</small></span></div><em>${day.exercises.length} exercises</em></article>`).join('')}</div></section><section class="coach-plan-section"><div class="coach-section-title"><h3>Daily meal framework</h3><span>Flexible, not rigid</span></div><div class="coach-meal-list">${plan.meals.map((meal)=>`<article><span><strong>${meal.label}</strong><small>~${meal.calories} kcal • ~${meal.protein}g protein</small></span><p>${meal.options.map(esc).join(' · ')}</p></article>`).join('')}</div></section><section class="coach-plan-section compact"><h3>Progression & recovery</h3><p>${esc(plan.progression.rule)}</p><p><b>Hydration:</b> ${esc(plan.recovery.hydration)} · <b>Sleep:</b> ${esc(plan.recovery.sleep)}</p></section><div class="coach-safety-note">Energy expenditure and food values are estimates. MYBODY should be adjusted using real progress over time, not treated as a medical prescription.</div><div class="coach-planner-actions">${fromPlanner?'<button class="secondary" type="button" data-plan-action="edit">Edit answers</button>':''}<button class="primary" type="button" data-plan-action="apply" ${risk?'disabled':''}>${risk?'Clinician review required':'Apply to MYBODY'}</button></div>`;
    $('[data-plan-action="edit"]',body)?.addEventListener('click',()=>{step=1;renderPlannerStep(modal,plan.profile)});
    $('[data-plan-action="apply"]',body)?.addEventListener('click',()=>{
      const applied = Coach.applyPlan(state,plan);
      if (!applied.ok) { toast(applied.reason); return; }
      write(applied.state,'Personal plan applied');
      closeModal(modal);
      setTimeout(()=>location.reload(),250);
    });
  }

  function viewPlan() {
    const plan = coachState().plan;
    if (!plan) { buildPlanner(); return; }
    const modal = modalShell('coachPlanModal','Your MYBODY plan','Training, nutrition and recovery targets in one place.');
    openModal(modal);
    renderPlanResult(modal,plan,false);
  }

  function readinessModal() {
    const modal = modalShell('coachReadinessModal','Daily readiness','A 20-second check-in helps you decide how hard to train today.');
    const current = coachState().readiness?.[Store.localDate()] || { sleep:3, energy:3, soreness:2 };
    const body = $('.coach-modal-body',modal);
    body.innerHTML = `<div class="readiness-question"><label>Sleep quality <strong id="sleepVal">${current.sleep}</strong>/5</label><input id="readinessSleep" type="range" min="1" max="5" value="${current.sleep}"></div><div class="readiness-question"><label>Energy <strong id="energyVal">${current.energy}</strong>/5</label><input id="readinessEnergy" type="range" min="1" max="5" value="${current.energy}"></div><div class="readiness-question"><label>Muscle soreness <strong id="sorenessVal">${current.soreness}</strong>/5</label><input id="readinessSoreness" type="range" min="1" max="5" value="${current.soreness}"></div><div id="readinessPreview" class="readiness-preview"></div><button class="primary full" id="saveReadiness" type="button">Save readiness</button>`;
    const update = () => {
      const r = Coach.readiness($('#readinessSleep').value,$('#readinessEnergy').value,$('#readinessSoreness').value);
      $('#sleepVal').textContent=r.sleep;$('#energyVal').textContent=r.energy;$('#sorenessVal').textContent=r.soreness;
      $('#readinessPreview').innerHTML=`<strong>${r.score}/100</strong><span>${esc(r.recommendation)}</span>`;
      return r;
    };
    ['#readinessSleep','#readinessEnergy','#readinessSoreness'].forEach((s)=>$(s).addEventListener('input',update));
    $('#saveReadiness').onclick=()=>{
      const r=update(),next=Store.clone(state);next.profile=next.profile||{};next.profile.coach=next.profile.coach||{};next.profile.coach.readiness={...(next.profile.coach.readiness||{}),[Store.localDate()]:r};write(next,'Readiness saved');closeModal(modal);
    };
    update();openModal(modal);
  }

  function weeklyReview() {
    const modal = modalShell('coachReviewModal','Weekly review','Use trends and adherence, not one perfect or imperfect day.');
    const stats = Coach.weeklyStats(state), trend = Coach.trendWeight(state), plan=coachState().plan;
    const body = $('.coach-modal-body',modal);
    body.innerHTML = `<div class="review-grid"><div><small>Avg calories</small><strong>${stats.avgCalories||'—'}</strong><span>${stats.calorieDays} logged days</span></div><div><small>Avg protein</small><strong>${stats.avgProtein?stats.avgProtein+'g':'—'}</strong><span>Target ${plan?.metrics?.protein||state.config.protein}g</span></div><div><small>Avg steps</small><strong>${stats.avgSteps?stats.avgSteps.toLocaleString():'—'}</strong><span>${stats.stepDays} logged days</span></div><div><small>Workouts</small><strong>${stats.workouts}</strong><span>last 7 days</span></div></div><div class="trend-card"><span>Weight trend</span><strong>${trend.recent?trend.recent+' kg':'Not enough data'}</strong><small>${trend.change!=null?`${trend.change>0?'+':''}${trend.change} kg vs prior 7 days`:'Log several weigh-ins each week for a useful trend.'}</small></div><div class="review-checkin"><h3>How did the week feel?</h3><label>Hunger<select id="reviewHunger"><option value="1">Low</option><option value="2">Manageable</option><option value="3" selected>Moderate</option><option value="4">High</option><option value="5">Very high</option></select></label><label>Energy<select id="reviewEnergy"><option value="1">Very low</option><option value="2">Low</option><option value="3" selected>Normal</option><option value="4">Good</option><option value="5">Excellent</option></select></label><label>Training performance<select id="reviewPerformance"><option value="improving">Improving</option><option value="same" selected>About the same</option><option value="worse">Worse</option></select></label></div><div id="reviewRecommendation" class="coach-insight"></div><button class="primary full" id="saveReview" type="button">Save weekly review</button>`;
    function rec(){
      const hunger=num($('#reviewHunger').value,3),energy=num($('#reviewEnergy').value,3),performance=$('#reviewPerformance').value;
      let title='Continue the current plan',text='Consistency matters more than frequent target changes. Keep the plan for another week and review the trend again.';
      if (energy<=2 || performance==='worse') {title='Prioritize recovery before cutting harder';text='Low energy or falling performance can be a sign to hold calories and reduce training stress temporarily rather than making the plan more aggressive.';}
      else if (plan && stats.calorieDays>=5 && plan.profile.goal==='fat_loss' && trend.change!=null && trend.change>-0.15 && Math.abs(stats.avgCalories-plan.metrics.calories)<=plan.metrics.calories*0.08) {title='Small adjustment may be reasonable';text='Adherence looks good but the weight trend is slow. Consider a modest 100 kcal reduction or a little more daily movement, then reassess after 1–2 weeks.';}
      else if (plan && plan.profile.goal==='fat_loss' && trend.change!=null && trend.change < -(currentWeight()*0.01)) {title='Weight is dropping quickly';text='Avoid making the deficit more aggressive. If hunger, energy or training performance worsen, consider increasing intake modestly.';}
      $('#reviewRecommendation').innerHTML=`<span>${esc(title)}</span><p>${esc(text)}</p>`;
      return {title,text,hunger,energy,performance,stats,trend,date:Store.localDate(),savedAt:new Date().toISOString()};
    }
    function currentWeight(){return Number(state.weights?.[0]?.weight||state.config.startWeight||0)}
    ['#reviewHunger','#reviewEnergy','#reviewPerformance'].forEach((s)=>$(s).addEventListener('change',rec));
    $('#saveReview').onclick=()=>{const review=rec(),next=Store.clone(state);next.profile=next.profile||{};next.profile.coach=next.profile.coach||{};next.profile.coach.reviews=[...(next.profile.coach.reviews||[]),review].slice(-52);write(next,'Weekly review saved');closeModal(modal);};
    rec();openModal(modal);
  }

  function schemeEnhancement() {
    const active = $('.day-btn.active');
    if (!active) return;
    const day = num(active.dataset.day,0), plan = state.workouts?.[day];
    $$('#exerciseList .exercise').forEach((card,index)=>{
      const exercise=plan?.exercises?.[index],scheme=Array.isArray(exercise?.[3])?exercise[3]:[];
      const p=$('.exercise-title p',card) || $('.exercise-top p',card);
      if (p && scheme.length) p.textContent=`${exercise[1]} sets • ${scheme.join(' / ')} reps • Target & Actual`;
    });
    const detail=$('#exerciseDetailSheet:not(.hidden)'),rows=$$('#exerciseSetRows .exercise-set-row');
    if (detail && rows.length) {
      const title=$('#exerciseDetailTitle')?.textContent||'';
      const exercise=plan?.exercises?.find((x)=>x[0]===title),scheme=Array.isArray(exercise?.[3])?exercise[3]:[];
      rows.forEach((row,index)=>{const spans=$$('span',row);if(scheme[index]&&spans[1])spans[1].textContent=scheme[index];});
      if (scheme.length) $('#exerciseDetailMeta').textContent=`${exercise[1]} sets • ${scheme.join(' / ')} reps • target from your plan and history`;
    }
  }

  function handleClick(event) {
    const action=event.target.closest('[data-coach-action]')?.dataset.coachAction;
    if (!action) return;
    if (action==='build') buildPlanner();
    if (action==='plan') viewPlan();
    if (action==='readiness') readinessModal();
    if (action==='review') weeklyReview();
  }

  function render() { state=Store.read(); renderCard(); setTimeout(schemeEnhancement,20); }
  document.addEventListener('click',handleClick);
  window.addEventListener('mybody:state',(event)=>{state=event.detail||Store.read();render();});
  document.addEventListener('click',(event)=>{if(event.target.closest('[data-action="select-day"],[data-action="open-exercise-detail"],[data-tab="workout"]'))setTimeout(schemeEnhancement,60);},true);
  const observer=new MutationObserver(()=>setTimeout(schemeEnhancement,20));
  document.addEventListener('DOMContentLoaded',()=>{render();const list=$('#exerciseList'),rows=$('#exerciseSetRows');if(list)observer.observe(list,{childList:true,subtree:true});if(rows)observer.observe(rows,{childList:true,subtree:true});});
  if (document.readyState!=='loading') { render(); const list=$('#exerciseList'),rows=$('#exerciseSetRows');if(list)observer.observe(list,{childList:true,subtree:true});if(rows)observer.observe(rows,{childList:true,subtree:true}); }
}());