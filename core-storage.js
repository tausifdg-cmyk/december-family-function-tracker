(function () {
  'use strict';

  const DATA_KEY = 'decemberTracker.v1';
  const SESSION_KEY = 'tausifTracker.session.v1';
  const ACCOUNTS_KEY = 'tausifTracker.accounts.v1';
  const SCHEMA_VERSION = 3;
  const RETENTION_DAYS = 730;
  const ADMIN_EMAIL = 'tausif.4946@gmail.com';
  const ADMIN_PLAN_VERSION = 'admin-6day-double-muscle-v2';

  const defaultWorkouts = [
    { name: 'Chest + Triceps', focus: 'Upper chest • chest • triceps', exercises: [['Barbell bench press', 4, 8], ['Incline dumbbell press', 3, 10], ['Machine chest press', 3, 12], ['Cable fly', 3, 15], ['Rope pushdown', 3, 12], ['Overhead cable extension', 3, 12]] },
    { name: 'Back + Biceps', focus: 'Lats • mid back • biceps', exercises: [['Lat pulldown', 4, 10], ['Chest-supported row', 4, 10], ['Seated cable row', 3, 12], ['Face pull', 3, 15], ['EZ-bar curl', 3, 10], ['Hammer curl', 3, 12]] },
    { name: 'Legs + Core', focus: 'Quads • hamstrings • glutes • abs', exercises: [['Squat / Hack squat', 4, 8], ['Romanian deadlift', 3, 10], ['Leg press', 3, 12], ['Leg curl', 3, 12], ['Leg extension', 3, 15], ['Calf raise', 4, 15], ['Cable crunch', 3, 15]] },
    { name: 'Shoulders + Upper Chest', focus: 'Delts • upper chest', exercises: [['Incline bench press', 4, 8], ['Seated dumbbell press', 3, 10], ['Lateral raise', 4, 15], ['Reverse pec deck', 4, 15], ['Low-to-high cable fly', 3, 15]] },
    { name: 'Back + Arms', focus: 'V-taper • biceps • triceps', exercises: [['Pulldown', 4, 10], ['T-bar row', 3, 10], ['Straight-arm pulldown', 3, 15], ['Incline curl', 3, 12], ['Rope pushdown', 3, 12]] }
  ];

  const adminWorkouts = [
    { name: 'Monday • Chest + Triceps', focus: 'Chest • upper chest • triceps', exercises: [['Bench Press',3,10,[12,10,8]],['Incline DB Press',3,10,[12,10,8]],['Machine Chest Press',3,10,[12,10,10]],['Cable Chest Fly',3,15,[15,15,12]],['Push-ups (Finisher)',2,18,[20,15]],['Cable Rope Pushdown',3,12,[15,12,12]],['Skull Crushers',3,10,[12,10,10]],['Single-arm Overhead Extension',2,12,[15,12]],['Dips',2,10,[12,10]]] },
    { name: 'Tuesday • Back + Biceps', focus: 'Lats • mid back • biceps', exercises: [['Wide-grip Lat Pulldown',3,10,[12,10,8]],['Single-arm Lat Pulldown',2,12,[12,12]],['Seated Cable Row',3,10,[12,10,10]],['Chest-supported Row',3,10,[12,10,8]],['Straight-arm Pulldown',2,15,[15,15]],['Barbell Curl',3,10,[12,10,8]],['Alternating DB Curl',2,11,[12,10]],['Machine Preacher Curl',2,14,[15,12]],['Hammer Curl',2,12,[12,12]]] },
    { name: 'Wednesday • Shoulders + Legs', focus: 'Delts • quads • hamstrings • calves', exercises: [['Seated Shoulder Press',3,10,[12,10,8]],['Lateral Raises',3,14,[15,15,12]],['Rear Delt Fly',2,15,[15,15]],['Front Raises',2,12,[12,12]],['Leg Press',3,12,[15,12,10]],['Hack Squat / Smith Squat',3,10,[12,10,8]],['Leg Extension',3,14,[15,15,12]],['Hamstring Curl',3,13,[15,12,12]],['Standing Calf Raise',3,12,[15,12,10]]] },
    { name: 'Thursday • Chest + Triceps', focus: 'Chest variation • triceps variation', exercises: [['Incline Smith Press',3,10,[12,10,8]],['Decline Machine Press',3,11,[12,10,10]],['Cable Crossover (Lower Chest)',2,15,[15,15]],['Pec Deck Fly',2,14,[15,12]],['Push-ups (Finisher)',2,20,[20,20]],['Rope Overhead Extension',3,13,[15,12,12]],['Close-grip Bench Press / Smith',3,10,[12,10,8]],['Tricep Kickback',2,14,[15,12]],['Reverse Grip Pushdown',2,14,[15,12]]] },
    { name: 'Friday • Back + Biceps', focus: 'Back variation • biceps variation', exercises: [['Neutral Grip Pulldown',3,10,[12,10,8]],['T-Bar Row',3,10,[12,10,8]],['Unilateral Cable Row',2,12,[12,12]],['Machine Row (Wide Chest Supported)',2,11,[12,10]],['Rope Pullovers',2,15,[15,15]],['EZ Bar Curl',3,10,[12,10,8]],['Incline DB Curl',2,11,[12,10]],['Spider Curl',2,14,[15,12]],['Reverse Curl',2,12,[12,12]]] },
    { name: 'Saturday • Shoulders + Legs', focus: 'Shoulder variation • leg variation', exercises: [['Standing OHP',3,10,[12,10,8]],['Cable Lateral Raise',3,14,[15,15,12]],['Reverse Pec Deck',2,15,[15,15]],['DB Upright Row',2,11,[12,10]],['Barbell Squat / Smith Squat',3,10,[12,10,8]],['Bulgarian Split Squat',2,12,[12,12]],['Leg Extension (Slow Reps)',2,15,[15,15]],['Romanian Deadlift',3,11,[12,10,10]],['Standing Calf Raise',2,15,[15,15]]] }
  ];

  const defaults = {
    schemaVersion: SCHEMA_VERSION,
    config: { age: 40, height: 175, sex: 'male', startWeight: 89, goalWeight: 80, goalDate: '2026-12-15', calories: 2100, protein: 170, steps: 8000, water: 3.5 },
    weights: [], abdomen: [], pantWaist: [], nutrition: {}, activity: {}, workoutLog: {},
    theme: 'dark', customFoods: [], workouts: defaultWorkouts
  };

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function number(value, fallback = 0, min = -Infinity, max = Infinity) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function validDate(value, fallback) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : fallback;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function safeRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function activeEmail(source) {
    const profileEmail = String(source?.profile?.email || '').trim().toLowerCase();
    if (profileEmail) return profileEmail;
    try {
      const sid = localStorage.getItem(SESSION_KEY) || '';
      const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
      const account = Array.isArray(accounts) ? accounts.find((item) => item && item.id === sid) : null;
      return String(account?.email || '').trim().toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function normalise(input) {
    const source = safeRecord(input);
    const state = clone(defaults);
    const config = safeRecord(source.config);
    state.config = {
      ...state.config,
      age: number(config.age, state.config.age, 13, 120),
      height: number(config.height, state.config.height, 100, 250),
      sex: config.sex === 'female' ? 'female' : 'male',
      startWeight: number(config.startWeight, state.config.startWeight, 25, 400),
      goalWeight: number(config.goalWeight, state.config.goalWeight, 25, 400),
      goalDate: validDate(config.goalDate, state.config.goalDate),
      calories: number(config.calories, state.config.calories, 800, 10000),
      protein: number(config.protein, state.config.protein, 0, 1000),
      steps: number(config.steps, state.config.steps, 0, 200000),
      water: number(config.water, state.config.water, 0, 20)
    };
    Object.keys(config).forEach((key) => {
      if (!(key in state.config)) state.config[key] = config[key];
    });
    state.weights = safeArray(source.weights).map((entry) => ({ date: validDate(entry.date, localDate()), weight: number(entry.weight, 0, 25, 400) })).filter((entry) => entry.weight > 0);
    state.abdomen = safeArray(source.abdomen);
    state.pantWaist = safeArray(source.pantWaist);
    state.customFoods = safeArray(source.customFoods);
    state.nutrition = safeRecord(source.nutrition);
    state.activity = safeRecord(source.activity);
    state.workoutLog = safeRecord(source.workoutLog);
    state.workouts = safeArray(source.workouts).map((workout) => ({
      name: String(workout.name || 'Workout'),
      focus: String(workout.focus || ''),
      exercises: safeArray(workout.exercises).map((exercise) => {
        const scheme = safeArray(exercise[3]).map((rep) => number(rep, 10, 1, 100));
        return [String(exercise[0] || 'Exercise'), number(exercise[1], 3, 1, 20), number(exercise[2], 10, 1, 100), scheme];
      })
    })).filter((workout) => workout.exercises.length) || clone(defaultWorkouts);
    if (!state.workouts.length) state.workouts = clone(defaultWorkouts);
    state.theme = source.theme === 'light' ? 'light' : 'dark';
    state.schemaVersion = SCHEMA_VERSION;
    if (source.profile) state.profile = safeRecord(source.profile);
    if (source.planSummary) state.planSummary = safeRecord(source.planSummary);
    if (activeEmail(source) === ADMIN_EMAIL && source.adminWorkoutPlanVersion !== ADMIN_PLAN_VERSION) {
      state.workouts = clone(adminWorkouts);
      state.adminWorkoutPlanVersion = ADMIN_PLAN_VERSION;
    } else if (source.adminWorkoutPlanVersion) {
      state.adminWorkoutPlanVersion = String(source.adminWorkoutPlanVersion);
    }
    return state;
  }

  function scopedKey() {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? `${DATA_KEY}.user.${session}` : DATA_KEY;
    } catch (_) {
      return DATA_KEY;
    }
  }

  function parse(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  function read() {
    try {
      const scoped = scopedKey();
      const raw = localStorage.getItem(scoped) || localStorage.getItem(DATA_KEY);
      const parsed = parse(raw);
      if (raw && !parsed) {
        try { localStorage.setItem(`${DATA_KEY}.corrupt.${Date.now()}`, raw.slice(0, 250000)); } catch (_) {}
      }
      const state = normalise(parsed);
      if (activeEmail(parsed || {}) === ADMIN_EMAIL && parsed?.adminWorkoutPlanVersion !== ADMIN_PLAN_VERSION) {
        try {
          const payload = JSON.stringify(state);
          localStorage.setItem(DATA_KEY, payload);
          if (scoped !== DATA_KEY) localStorage.setItem(scoped, payload);
        } catch (_) {}
      }
      return state;
    } catch (_) {
      return normalise(null);
    }
  }

  function prune(state) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffKey = localDate(cutoff);
    ['nutrition', 'activity', 'workoutLog'].forEach((collection) => {
      Object.keys(state[collection]).forEach((date) => { if (date < cutoffKey) delete state[collection][date]; });
    });
    ['weights', 'abdomen', 'pantWaist'].forEach((collection) => { state[collection] = state[collection].slice(0, 1000); });
    return state;
  }

  function quotaError(error) {
    return error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22 || error.code === 1014);
  }

  function write(nextState) {
    let state = normalise(nextState);
    const payload = () => JSON.stringify(state);
    try {
      localStorage.setItem(DATA_KEY, payload());
      const scoped = scopedKey();
      if (scoped !== DATA_KEY) localStorage.setItem(scoped, payload());
    } catch (error) {
      if (!quotaError(error)) throw error;
      state = prune(state);
      try {
        localStorage.setItem(DATA_KEY, payload());
        const scoped = scopedKey();
        if (scoped !== DATA_KEY) localStorage.setItem(scoped, payload());
      } catch (retryError) {
        window.dispatchEvent(new CustomEvent('mybody:storage-error', { detail: retryError }));
        return { ok: false, state, error: retryError };
      }
    }
    window.dispatchEvent(new CustomEvent('mybody:state', { detail: clone(state) }));
    return { ok: true, state };
  }

  window.MyBodyStore = Object.freeze({ DATA_KEY, SESSION_KEY, defaults: clone(defaults), clone, number, localDate, normalise, read, write, prune });
})();
