/* MYBODY 2.0: enforce the explicitly approved 115 g/day protein target across saved state and coach-generated plans. */
(function () {
  'use strict';

  const Store = window.MyBodyStore;
  const Coach = window.MyBodyCoach;
  if (!Store || !Coach) return;

  const APPROVED_PROTEIN = 115;

  function rebalanceCarbs(metrics) {
    const calories = Number(metrics?.calories || 0);
    const fat = Number(metrics?.fat || 0);
    if (!calories) return Number(metrics?.carbs || 0);
    return Math.max(80, Math.round((calories - APPROVED_PROTEIN * 4 - fat * 9) / 4));
  }

  function fixMetrics(metrics) {
    const next = { ...(metrics || {}) };
    next.protein = APPROVED_PROTEIN;
    next.carbs = rebalanceCarbs(next);
    return next;
  }

  function fixPlan(plan) {
    if (!plan || typeof plan !== 'object') return plan;
    const next = Store.clone(plan);
    next.metrics = fixMetrics(next.metrics);
    if (Array.isArray(next.meals)) {
      const shares = [0.23, 0.30, 0.17, 0.30];
      next.meals = next.meals.map((meal, index) => ({
        ...meal,
        protein: Math.round(APPROVED_PROTEIN * (shares[index] || 0.25))
      }));
    }
    return next;
  }

  function migrateSavedState() {
    const state = Store.read();
    let changed = false;

    if (Number(state.config?.protein) !== APPROVED_PROTEIN) {
      state.config = { ...state.config, protein: APPROVED_PROTEIN };
      changed = true;
    }

    const coachPlan = state.profile?.coach?.plan;
    if (coachPlan && Number(coachPlan.metrics?.protein) !== APPROVED_PROTEIN) {
      state.profile = Store.clone(state.profile || {});
      state.profile.coach = Store.clone(state.profile.coach || {});
      state.profile.coach.plan = fixPlan(coachPlan);
      changed = true;
    }

    if (changed) Store.write(state);
  }

  const wrapped = {
    ...Coach,
    calculate(profile) {
      return fixMetrics(Coach.calculate(profile));
    },
    buildPlan(profileInput) {
      return fixPlan(Coach.buildPlan(profileInput));
    },
    applyPlan(state, plan) {
      return Coach.applyPlan(state, fixPlan(plan));
    }
  };

  window.MyBodyCoach = Object.freeze(wrapped);
  migrateSavedState();

  window.addEventListener('mybody:state', (event) => {
    const state = event.detail;
    if (!state) return;
    if (Number(state.config?.protein) === APPROVED_PROTEIN && Number(state.profile?.coach?.plan?.metrics?.protein || APPROVED_PROTEIN) === APPROVED_PROTEIN) return;
    setTimeout(migrateSavedState, 0);
  });
}());
