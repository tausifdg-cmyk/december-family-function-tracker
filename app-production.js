(function () {
  'use strict';

  const Store = window.MyBodyStore;
  if (!Store) throw new Error('MyBodyStore must load before app-production.js');
  const ExerciseLibrary = window.MyBodyExerciseLibrary;
  if (!ExerciseLibrary) throw new Error('MyBodyExerciseLibrary must load before app-production.js');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const num = Store.number;
  const round = (value, places = 0) => Math.round(value * (10 ** places)) / (10 ** places);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const removeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const today = Store.localDate;
  let state = Store.read();
  let selectedDay = Math.min(state.workouts.length - 1, Math.max(0, (new Date().getDay() + 6) % 7));
  let resizeObserver;
  let chartFrame;
  let modalReturnFocus;
  let exerciseCategory = 'All';
  let selectedExerciseIndex = 0;

  function muscleGroup(name) {
    const value = String(name || '').toLowerCase();
    if (/squat|leg|lunge|deadlift|calf|glute/.test(value)) return 'legs';
    if (/pulldown|pull-up|row|back|lat/.test(value)) return 'back';
    if (/curl|biceps/.test(value)) return 'biceps';
    if (/triceps|pushdown|dip|extension/.test(value)) return 'triceps';
    if (/shoulder|lateral|delt|face pull/.test(value)) return 'shoulders';
    if (/crunch|plank|core|knee raise|dead bug/.test(value)) return 'core';
    return 'chest';
  }

  function exerciseMedia(name) {
    const exercise = ExerciseLibrary.find(name);
    return { ...exercise, group: exercise.muscle || muscleGroup(name) };
  }

  function muscleMapSvg(active) {
    const zone = (name) => name === active ? ' active' : '';
    return `<svg class="muscle-map" viewBox="0 0 72 112" role="img" aria-label="${escapeHtml(active)} muscles highlighted"><circle class="body-shape" cx="36" cy="11" r="8"/><path class="body-shape" d="M27 22h18l6 31-7 22H28l-7-22Z"/><path class="body-shape" d="m24 27-9 9-6 29 8 2 9-26m22-14 9 9 6 29-8 2-9-26M30 74l-5 32h9l4-25m4-7 5 32h-9l-4-25"/><path class="muscle-zone${zone('chest')}" d="M27 29c3-4 7-5 9-2 2-3 6-2 9 2l-2 12H29Z"/><path class="muscle-zone${zone('shoulders')}" d="M21 29c1-5 4-8 8-8l2 8-6 9Zm30 0c-1-5-4-8-8-8l-2 8 6 9Z"/><path class="muscle-zone${zone('back')}" d="M27 30h18l-3 24-6 7-6-7Z"/><path class="muscle-zone${zone('biceps')}" d="m18 38 6 2-4 17-7-2Zm36 2 6-2 5 17-7 2Z"/><path class="muscle-zone${zone('triceps')}" d="m16 37 5-4 4 9-5 16-6-2Zm40-4 5 4 2 19-6 2-5-16Z"/><path class="muscle-zone${zone('core')}" d="M31 43h10l2 24H29Z"/><path class="muscle-zone${zone('legs')}" d="M28 74h8l-3 31h-8Zm8 0h8l4 31h-9Z"/></svg>`;
  }

  function openSheet(id, trigger) {
    const sheet = document.getElementById(id);
    if (!sheet) return;
    modalReturnFocus = trigger || document.activeElement;
    sheet.classList.remove('hidden');
    document.body.classList.add('modal-open');
    sheet.querySelector('.sheet-panel')?.focus({ preventScroll: true });
  }

  function closeSheet(sheet) {
    const target = typeof sheet === 'string' ? document.getElementById(sheet) : sheet?.closest?.('.sheet-backdrop');
    if (!target) return;
    target.classList.add('hidden');
    if (!document.querySelector('.sheet-backdrop:not(.hidden),.media-lightbox:not(.hidden)')) document.body.classList.remove('modal-open');
    modalReturnFocus?.focus?.({ preventScroll: true });
  }

  function openExerciseMedia(button) {
    const lightbox = $('#exerciseLightbox');
    const stage = $('#exerciseMotion');
    if (!lightbox || !stage) return;
    modalReturnFocus = button;
    const name = button.dataset.name || 'Exercise demo';
    const media = exerciseMedia(name);
    text('#exerciseLightboxTitle', media.name);
    const variation = media.media?.kind === 'real-video' && media.media.sourceName !== media.name ? `Demo: ${media.media.sourceName}` : '';
    text('#exerciseLightboxMeta', [button.dataset.sets, media.category, media.equipment, variation].filter(Boolean).join(' • '));
    stage.innerHTML = ExerciseLibrary.renderMedia(media, { animated: true, full: true, priority: true });
    const cues = $('#exerciseCues');
    if (cues) cues.innerHTML = media.cues.map((cue) => `<span>${escapeHtml(cue)}</span>`).join('');
    const map = $('#lightboxMuscleMap');
    if (map) map.innerHTML = muscleMapSvg(media.group);
    lightbox.classList.remove('hidden');
    document.body.classList.add('modal-open');
    lightbox.querySelector('.sheet-close')?.focus({ preventScroll: true });
  }

  function closeExerciseMedia() {
    const lightbox = $('#exerciseLightbox');
    if (!lightbox || lightbox.classList.contains('hidden')) return;
    lightbox.classList.add('hidden');
    const stage = $('#exerciseMotion');
    if (stage) stage.replaceChildren();
    if (!document.querySelector('.sheet-backdrop:not(.hidden)')) document.body.classList.remove('modal-open');
    modalReturnFocus?.focus?.({ preventScroll: true });
  }

  function text(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value;
  }

  function value(selector, nextValue) {
    const node = $(selector);
    if (node && document.activeElement !== node) node.value = nextValue ?? '';
  }

  function latestWeight() {
    return num(state.weights[0]?.weight, state.config.startWeight, 25, 400);
  }

  function bmr() {
    const config = state.config;
    return Math.max(800, 10 * latestWeight() + 6.25 * num(config.height, 175, 100, 250) - 5 * num(config.age, 40, 13, 120) + (config.sex === 'female' ? -161 : 5));
  }

  function activity(date = today()) {
    const source = state.activity[date] || {};
    return { steps: num(source.steps, 0, 0, 200000), water: num(source.water, 0, 0, 20), minutes: num(source.minutes, 0, 0, 1440), met: num(source.met, 5.5, 1, 20), workoutDay: source.workoutDay };
  }

  function ensureMeals(date = today()) {
    state.nutrition[date] = state.nutrition[date] && typeof state.nutrition[date] === 'object' ? state.nutrition[date] : {};
    const record = state.nutrition[date];
    record.meals = record.meals && typeof record.meals === 'object' ? record.meals : {};
    ['breakfast', 'lunch', 'eveningSnacks', 'dinner'].forEach((meal) => {
      if (!Array.isArray(record.meals[meal])) record.meals[meal] = [];
    });
    return record.meals;
  }

  function meals(date = today()) {
    const source = state.nutrition[date]?.meals || {};
    return Object.fromEntries(['breakfast', 'lunch', 'eveningSnacks', 'dinner'].map((key) => [key, Array.isArray(source[key]) ? source[key] : []]));
  }

  function nutritionTotals(date = today()) {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    Object.values(meals(date)).flat().forEach((food) => {
      Object.keys(totals).forEach((key) => { totals[key] += num(food[key]); });
    });
    return totals;
  }

  function energyBurn(date = today()) {
    const day = activity(date);
    const weight = latestWeight();
    const base = bmr() * 1.2;
    const steps = day.steps * weight * 0.0005;
    const exercise = day.minutes * day.met * 3.5 * weight / 200;
    return { base, steps, exercise, total: base + steps + exercise };
  }

  function persist(message = 'Saved') {
    const result = Store.write(state);
    state = result.state;
    if (!result.ok) {
      toast('Storage is full. Older data was pruned, but this change could not be saved.', 'error');
      return false;
    }
    renderAll();
    toast(message);
    return true;
  }

  function toast(message, type = 'success') {
    const node = $('#appToast');
    if (!node) return;
    node.textContent = message;
    node.dataset.type = type;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 2200);
  }

  function percent(valueNow, target) {
    return Math.min(100, Math.max(0, target > 0 ? valueNow / target * 100 : 0));
  }

  function renderDashboard() {
    const config = state.config;
    const totals = nutritionTotals();
    const day = activity();
    const burn = energyBurn();
    const balance = burn.total - totals.calories;
    text('#todayLabel', new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }));
    text('#dashBurn', Math.round(burn.total));
    text('#dashBalance', `${balance >= 0 ? '-' : '+'}${Math.abs(Math.round(balance))}`);
    text('#dashBalanceLabel', balance >= 0 ? 'kcal estimated deficit' : 'kcal estimated surplus');
    const todayWorkout = state.workouts[selectedDay] || state.workouts[0];
    text('#todayWorkoutName', todayWorkout?.name || 'Workout');
    text('#todayWorkoutFocus', todayWorkout?.focus || 'Your current training plan');
    text('#baseBurn', `${Math.round(burn.base)} kcal`);
    text('#stepBurn', `${Math.round(burn.steps)} kcal`);
    text('#exerciseBurn', `${Math.round(burn.exercise)} kcal`);
    text('#budgetHeadline', `${Math.round(totals.calories)} / ${config.calories} kcal`);
    text('#scoreCalories', `${Math.round(totals.calories)} / ${config.calories}`);
    text('#scoreProtein', `${round(totals.protein, 1)} / ${config.protein}g`);
    text('#scoreSteps', `${day.steps} / ${config.steps}`);
    text('#scoreWater', `${round(day.water, 1)} / ${config.water}L`);
    text('#todayStatus', totals.calories || day.steps || day.water ? 'In progress' : 'Start logging');
    value('#stepsInput', day.steps || '');
    value('#waterInput', day.water || '');
    const latest = state.weights.find((entry) => entry.date === today());
    value('#weightInput', latest?.weight || '');
    const waist = state.abdomen.find((entry) => entry.date === today());
    value('#waistInput', waist?.value || (waist?.inches ? round(waist.inches * 2.54, 1) : ''));
    [['#scoreCaloriesBar', percent(totals.calories, config.calories)], ['#scoreProteinBar', percent(totals.protein, config.protein)], ['#scoreStepsBar', percent(day.steps, config.steps)], ['#scoreWaterBar', percent(day.water, config.water)]].forEach(([selector, width]) => {
      const bar = $(selector);
      if (bar) bar.style.width = `${width}%`;
    });
    renderWeeklySummary();
  }

  function renderWeeklySummary() {
    let intake = 0;
    let balance = 0;
    let workouts = 0;
    let loggedDays = 0;
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = today(date);
      const totals = nutritionTotals(key);
      if (totals.calories > 0) {
        intake += totals.calories;
        balance += energyBurn(key).total - totals.calories;
        loggedDays += 1;
      }
      if (state.workoutLog[key] && Object.keys(state.workoutLog[key]).length) workouts += 1;
    }
    text('#weekIntake', loggedDays ? Math.round(intake / loggedDays) : 0);
    text('#weekBalance', loggedDays ? Math.round(balance / loggedDays) : 0);
    text('#weekWorkouts', workouts);
  }

  function currentWorkoutLog() {
    return state.workoutLog[today()]?.[selectedDay] || {};
  }

  function ensureWorkoutLog() {
    const date = today();
    state.workoutLog[date] = state.workoutLog[date] || {};
    state.workoutLog[date][selectedDay] = state.workoutLog[date][selectedDay] || { minutes: 0, met: 5.5, exercises: [] };
    const log = state.workoutLog[date][selectedDay];
    log.exercises = Array.isArray(log.exercises) ? log.exercises : [];
    return log;
  }

  function previousExerciseResult(index) {
    const dates = Object.keys(state.workoutLog).filter((date) => date < today()).sort().reverse();
    for (const date of dates) {
      const result = state.workoutLog[date]?.[selectedDay]?.exercises?.[index];
      if (result) return result;
    }
    return null;
  }

  function nextTargetWeight(previous, plannedReps) {
    const weight = num(previous?.weight, 0, 0, 1000);
    if (!weight) return 0;
    const completed = Array.isArray(previous?.setsDetail)
      ? previous.setsDetail.every((set) => set.done && num(set.actualReps) >= num(set.targetReps, plannedReps))
      : num(previous?.reps) >= plannedReps;
    if (!completed) return weight;
    const increase = weight < 10 ? 0.5 : weight < 20 ? 1 : 2.5;
    return round(weight + increase, 1);
  }

  function detailSetsFor(index) {
    const exercise = state.workouts[selectedDay]?.exercises?.[index];
    if (!exercise) return [];
    const result = currentWorkoutLog().exercises?.[index] || {};
    const previous = previousExerciseResult(index);
    const previousSets = previous?.setsDetail || previous?.advancedSets || [];
    const currentSets = result.setsDetail || result.advancedSets || [];
    const setCount = num(result.sets, exercise[1], 1, 20);
    const suggestedWeight = nextTargetWeight(previous, exercise[2]);
    return Array.from({ length: setCount }, (_, setIndex) => {
      const saved = currentSets[setIndex] || {};
      const prior = previousSets[setIndex] || {};
      return {
        targetWeight: num(saved.targetWeight, num(prior.actualWeight, suggestedWeight, 0, 1000), 0, 1000),
        targetReps: num(saved.targetReps, num(prior.actualReps, exercise[2], 0, 100), 0, 100),
        actualWeight: num(saved.actualWeight, num(result.weight, 0, 0, 1000), 0, 1000),
        actualReps: num(saved.actualReps, num(result.reps, exercise[2], 0, 100), 0, 100),
        done: Boolean(saved.done)
      };
    });
  }

  function renderExerciseDetail() {
    const exercise = state.workouts[selectedDay]?.exercises?.[selectedExerciseIndex];
    if (!exercise) return;
    text('#exerciseDetailTitle', exercise[0]);
    text('#exerciseDetailMeta', `${exercise[1]} sets × ${exercise[2]} reps • target from your last workout`);
    const rows = $('#exerciseSetRows');
    if (rows) rows.innerHTML = detailSetsFor(selectedExerciseIndex).map((set, index) => `<div class="exercise-set-row" data-set-index="${index}"><b>${index + 1}</b><span>${set.targetWeight || '—'}</span><span>${set.targetReps}</span><input class="detail-actual-kg" type="number" inputmode="decimal" min="0" max="1000" step="0.5" aria-label="Set ${index + 1} actual weight in kilograms" value="${set.actualWeight || ''}"><input class="detail-actual-reps" type="number" inputmode="numeric" min="0" max="100" aria-label="Set ${index + 1} actual reps" value="${set.actualReps || ''}"><button type="button" class="set-done ${set.done ? 'saved' : ''}" data-action="toggle-set-done" aria-pressed="${set.done}" aria-label="Mark set ${index + 1} complete">${set.done ? '✓' : '○'}</button></div>`).join('');
  }

  function openExerciseDetail(button) {
    selectedExerciseIndex = num(button.dataset.index, 0, 0, state.workouts[selectedDay].exercises.length - 1);
    renderExerciseDetail();
    openSheet('exerciseDetailSheet', button);
  }

  function renderWorkout() {
    selectedDay = Math.min(Math.max(0, selectedDay), state.workouts.length - 1);
    const plan = state.workouts[selectedDay];
    const log = currentWorkoutLog();
    const picker = $('#dayPicker');
    if (picker) picker.innerHTML = state.workouts.map((workout, index) => `<button type="button" class="day-btn ${index === selectedDay ? 'active' : ''}" data-action="select-day" data-day="${index}" aria-pressed="${index === selectedDay}"><b>D${index + 1}</b><span>${escapeHtml(workout.name)}</span></button>`).join('');
    if (!plan) return;
    text('#sessionName', plan.name);
    text('#sessionFocus', plan.focus);
    const minutes = num(log.minutes, num(state.config.minutesPerWorkout, 60, 1, 300), 1, 300);
    const met = num(log.met, 5.5, 1, 20);
    value('#workoutMinutes', minutes);
    value('#workoutIntensity', String(met));
    text('#sessionMinutes', minutes);
    text('#sessionBurn', `${Math.round(minutes * met * 3.5 * latestWeight() / 200)} kcal`);
    const list = $('#exerciseList');
    if (list) list.innerHTML = plan.exercises.map((exercise, index) => {
      const result = log.exercises?.[index] || {};
      const media = exerciseMedia(exercise[0]);
      return `<article class="card exercise ${result.savedAt ? 'is-saved' : ''}" data-exercise-index="${index}"><button type="button" class="exercise-media" data-action="open-exercise-media" data-name="${escapeHtml(exercise[0])}" data-sets="${exercise[1]} sets × ${exercise[2]} reps" aria-label="Open ${escapeHtml(exercise[0])} demonstration"><span class="exercise-motion-thumb">${ExerciseLibrary.renderMedia(media, { decorative: true })}</span><span class="exercise-muscle">${muscleMapSvg(media.group)}</span><span class="media-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6Z"/></svg></span></button><div class="exercise-main"><button type="button" class="exercise-top" data-action="open-exercise-detail" data-index="${index}" aria-label="Open Target and Actual details for ${escapeHtml(exercise[0])}"><span class="exercise-num">${index + 1}</span><span class="exercise-title"><h4>${escapeHtml(exercise[0])}</h4><p>${exercise[1]} sets × ${exercise[2]} reps • Target & Actual</p></span><svg class="exercise-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button><div class="exercise-inputs"><label>Sets<input class="ex-set" data-index="${index}" inputmode="numeric" type="number" min="0" max="20" value="${num(result.sets, exercise[1], 0, 20)}"></label><label>Reps<input class="ex-reps" data-index="${index}" inputmode="numeric" type="number" min="0" max="100" value="${num(result.reps, exercise[2], 0, 100)}"></label><label>Weight kg<input class="ex-weight" data-index="${index}" inputmode="decimal" type="number" min="0" max="1000" step="0.5" value="${result.weight || ''}"></label></div><div class="entry-confirm"><span class="save-status">${result.savedAt ? '✓ Saved' : 'Not saved'}</span><button type="button" class="entry-save ${result.savedAt ? 'saved' : ''}" data-action="save-exercise" data-index="${index}">${result.savedAt ? '✓ Saved' : 'Save exercise'}</button></div></div></article>`;
    }).join('');
    renderWorkoutEditor();
    renderWorkoutHistory();
  }

  function renderWorkoutEditor() {
    const plan = state.workouts[selectedDay];
    value('#editSessionName', plan?.name || '');
    value('#editSessionFocus', plan?.focus || '');
    const list = $('#editExerciseList');
    if (list) list.innerHTML = (plan?.exercises || []).map((exercise, index) => `<div class="editor-row" data-index="${index}"><input class="edit-ex-name" aria-label="Exercise name" value="${escapeHtml(exercise[0])}"><input class="edit-ex-sets" aria-label="Sets" type="number" min="1" max="20" value="${exercise[1]}"><input class="edit-ex-reps" aria-label="Reps" type="number" min="1" max="100" value="${exercise[2]}"><button type="button" class="danger-icon" data-action="remove-exercise" data-index="${index}" aria-label="Remove exercise">${removeIcon}</button></div>`).join('');
  }

  function renderExerciseLibrary() {
    const filters = $('#exerciseCategoryFilters');
    if (filters) filters.innerHTML = ExerciseLibrary.categories.map((category) => `<button type="button" class="category-chip ${category === exerciseCategory ? 'active' : ''}" data-action="filter-exercises" data-category="${escapeHtml(category)}" aria-pressed="${category === exerciseCategory}">${escapeHtml(category)}</button>`).join('');
    const query = ExerciseLibrary.normalise($('#exerciseLibrarySearch')?.value);
    const matches = ExerciseLibrary.exercises.filter((exercise) => {
      const inCategory = exerciseCategory === 'All' || exercise.category === exerciseCategory;
      const searchable = ExerciseLibrary.normalise([exercise.name, exercise.category, exercise.equipment, ...exercise.aliases].join(' '));
      return inCategory && (!query || searchable.includes(query));
    });
    text('#exerciseLibraryCount', `${matches.length} animated offline demonstrations`);
    const list = $('#exerciseCatalogList');
    if (list) list.innerHTML = matches.map((exercise) => `<button type="button" class="exercise-catalog-card" data-action="open-library-exercise" data-name="${escapeHtml(exercise.name)}"><span class="catalog-visual">${ExerciseLibrary.renderMedia(exercise, { decorative: true })}</span><span class="catalog-copy"><b>${escapeHtml(exercise.name)}</b><small>${escapeHtml(exercise.category)} • ${escapeHtml(exercise.equipment)}</small><em>${exercise.cues.map(escapeHtml).join(' • ')}</em></span><svg class="catalog-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>`).join('') || '<p class="empty">No exercises match this search.</p>';
  }

  async function keepExercisesOffline() {
    const status = $('#exerciseOfflineStatus');
    if (status) status.textContent = 'Checking storage…';
    try {
      if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
      let persistent = false;
      if (navigator.storage?.persisted) persistent = await navigator.storage.persisted();
      if (!persistent && navigator.storage?.persist) persistent = await navigator.storage.persist();
      if (status) status.textContent = persistent ? 'Stored persistently' : 'Offline ready';
      toast(persistent ? 'Exercise library will be kept offline.' : 'Exercise library is cached offline. iPhone may clear it if storage is low.');
    } catch (_) {
      if (status) status.textContent = 'Offline ready';
      toast('Exercise library is bundled with the app for offline use.');
    }
  }

  function allFoods() {
    return [...(Array.isArray(window.FOOD_DB) ? window.FOOD_DB : []), ...state.customFoods];
  }

  function findFood(query) {
    const needle = String(query || '').trim().toLowerCase();
    if (!needle) return null;
    return allFoods().find((food) => String(food.name || '').toLowerCase() === needle || (food.aliases || []).some((alias) => String(alias).toLowerCase() === needle)) || allFoods().find((food) => String(food.name || '').toLowerCase().includes(needle));
  }

  function preferredFoodUnit(food) {
    const name = String(food?.name || '').toLowerCase();
    if (/milk|buttermilk|lassi|tea|coffee|water|juice|rasam|soup|shake/.test(name)) return 'ml';
    if (/egg|banana|apple|orange|mango|guava|chapati|roti|phulka|paratha|puri|naan|idli|dosa|vada|samosa|kachori|pav|laddu|gulab jamun|rasgulla/.test(name)) return 'each';
    return 'g';
  }

  function unitGrams(food, unit) {
    return unit === 'each' ? num(food?.defaultGrams, 100, 1, 10000) : 1;
  }

  function foodDisplayAmount(entry, food, unit) {
    if (entry.amount !== undefined && entry.amount !== '') return entry.amount;
    const grams = num(entry.grams, num(food?.defaultGrams, 100, 0, 10000), 0, 10000);
    return unit === 'each' ? round(grams / unitGrams(food, unit), 2) : grams;
  }

  function renderFood() {
    const totals = nutritionTotals();
    const config = state.config;
    text('#foodCalories', Math.round(totals.calories));
    text('#foodProtein', `${round(totals.protein, 1)}g`);
    text('#foodCarbs', `${round(totals.carbs, 1)}g`);
    text('#foodFat', `${round(totals.fat, 1)}g`);
    text('#foodCalTarget', `target ${config.calories}`);
    text('#foodProteinTarget', `target ${config.protein}g`);
    const suggestions = $('#foodSuggestions');
    if (suggestions) suggestions.innerHTML = allFoods().map((food) => `<option value="${escapeHtml(food.name)}"></option>`).join('');
    const labels = { breakfast: ['Breakfast', 'Morning'], lunch: ['Lunch', 'Midday'], eveningSnacks: ['Evening snacks', 'Snack'], dinner: ['Dinner', 'Evening'] };
    const dayMeals = meals();
    const container = $('#mealSections');
    if (container) container.innerHTML = Object.entries(labels).map(([key, label]) => `<section class="card meal-card"><div class="meal-head"><div><small>${label[1]}</small><h3>${label[0]}</h3></div><button type="button" class="secondary" data-action="add-food" data-meal="${key}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Add food</button></div><div class="meal-items">${dayMeals[key].length ? dayMeals[key].map((food, index) => { const selected = findFood(food.name); const unit = ['g', 'ml', 'each'].includes(food.unit) ? food.unit : preferredFoodUnit(selected || food); const amount = foodDisplayAmount(food, selected, unit); return `<div class="food-row ${food.savedAt ? 'is-saved' : ''}" data-meal="${key}" data-index="${index}"><input class="food-name" list="foodSuggestions" aria-label="Food" value="${escapeHtml(food.name || '')}" placeholder="Search food"><div class="food-amount-control"><input class="food-amount" type="number" inputmode="decimal" min="0" max="10000" step="0.1" aria-label="Food amount" value="${amount || ''}" placeholder="Amount"><select class="food-unit" aria-label="Food unit"><option value="g" ${unit === 'g' ? 'selected' : ''}>g</option><option value="each" ${unit === 'each' ? 'selected' : ''}>each</option><option value="ml" ${unit === 'ml' ? 'selected' : ''}>ml</option></select></div><span class="food-macro">${Math.round(num(food.calories))} kcal<small>${round(num(food.protein), 1)}g P</small></span><button type="button" class="entry-save food-save ${food.savedAt ? 'saved' : ''}" data-action="save-food" aria-label="Save ${escapeHtml(food.name || 'food')}">${food.savedAt ? '✓ Saved' : 'Save'}</button><button type="button" class="danger-icon food-cancel" data-action="remove-food" aria-label="Cancel or remove food">${removeIcon}</button></div>`; }).join('') : '<p class="empty">Nothing logged yet.</p>'}</div></section>`).join('');
    renderFoodManager();
    renderFoodHistory();
  }

  function renderFoodManager() {
    const list = $('#customFoodList');
    if (!list) return;
    list.innerHTML = state.customFoods.length ? state.customFoods.map((food, index) => `<div class="list-row"><div><b>${escapeHtml(food.name)}</b><small>${food.calories} kcal • ${food.protein}g protein / 100g</small></div><button type="button" class="danger-icon" data-action="delete-custom-food" data-index="${index}" aria-label="Delete ${escapeHtml(food.name)}">${removeIcon}</button></div>`).join('') : '<p class="empty">No custom foods yet.</p>';
  }

  function renderProgress() {
    const config = state.config;
    const current = latestWeight();
    const start = num(config.startWeight, current, 25, 400);
    const goal = num(config.goalWeight, current, 25, 400);
    const latestWaist = state.abdomen[0];
    const denominator = start - goal;
    const progress = Math.abs(denominator) < 0.01 ? 100 : Math.min(100, Math.max(0, (start - current) / denominator * 100));
    text('#currentWeight', `${round(current, 1)} kg`);
    text('#goalWeight', `${round(goal, 1)} kg`);
    text('#weightChange', `${round(current - start, 1)} kg from start`);
    text('#weightRemaining', `${round(Math.abs(current - goal), 1)} kg remaining`);
    text('#latestWaist', latestWaist ? `${round(num(latestWaist.value, num(latestWaist.inches) * 2.54), 1)} cm` : '—');
    text('#waistChange', latestWaist ? `Recorded ${latestWaist.date}` : 'No waist entry');
    text('#progressPct', `${Math.round(progress)}%`);
    const cutoffDate = new Date();
    cutoffDate.setHours(0, 0, 0, 0);
    cutoffDate.setDate(cutoffDate.getDate() - 6);
    const cutoff = today(cutoffDate);
    const recentWeights = state.weights.filter((entry) => entry.date >= cutoff && entry.date <= today());
    const recentWaist = state.abdomen.filter((entry) => entry.date >= cutoff && entry.date <= today());
    const average = (entries, key) => entries.length ? round(entries.reduce((sum, entry) => sum + num(entry[key]), 0) / entries.length, 1) : null;
    const avgWeight = average(recentWeights, 'weight');
    const avgWaist = recentWaist.length ? round(recentWaist.reduce((sum, entry) => sum + num(entry.value, num(entry.inches) * 2.54), 0) / recentWaist.length, 1) : null;
    text('#avg7Weight', avgWeight === null ? '—' : `${avgWeight} kg`);
    text('#avg7WeightCount', `${recentWeights.length} ${recentWeights.length === 1 ? 'entry' : 'entries'}`);
    text('#avg7Waist', avgWaist === null ? '—' : `${avgWaist} cm`);
    text('#avg7WaistCount', `${recentWaist.length} ${recentWaist.length === 1 ? 'entry' : 'entries'}`);
    const list = $('#progressList');
    if (list) {
      const dates = [...new Set([...state.weights.map((entry) => entry.date), ...state.abdomen.map((entry) => entry.date)])].sort().reverse().slice(0, 30);
      list.innerHTML = dates.map((date) => { const weight = state.weights.find((entry) => entry.date === date); const waist = state.abdomen.find((entry) => entry.date === date); return `<div class="list-row"><span>${escapeHtml(date)}</span><b>${weight ? `${round(weight.weight, 1)} kg` : ''}${weight && waist ? ' • ' : ''}${waist ? `${round(num(waist.value, num(waist.inches) * 2.54), 1)} cm waist` : ''}</b></div>`; }).join('') || '<p class="empty">Save a measurement on Today to begin the trend.</p>';
    }
    scheduleChart();
  }

  function scheduleChart() {
    cancelAnimationFrame(chartFrame);
    chartFrame = requestAnimationFrame(drawChart);
  }

  function drawChart() {
    const canvas = $('#weightChart');
    if (!canvas || !canvas.isConnected) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(260, Math.floor(rect.width));
    const height = Math.max(200, Math.floor(rect.height || 220));
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const pixelWidth = Math.floor(width * dpr);
    const pixelHeight = Math.floor(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
    const context = canvas.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const css = getComputedStyle(document.documentElement);
    context.strokeStyle = css.getPropertyValue('--line').trim() || '#2a3446';
    context.fillStyle = css.getPropertyValue('--muted').trim() || '#8f9aae';
    context.font = '12px system-ui';
    const points = state.weights.slice(0, 60).reverse();
    if (!points.length) { context.textAlign = 'center'; context.fillText('Weight entries will appear here', width / 2, height / 2); return; }
    const values = points.map((point) => num(point.weight));
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (max - min < 2) { min -= 1; max += 1; }
    const padding = { top: 24, right: 18, bottom: 30, left: 44 };
    const x = (index) => padding.left + (points.length === 1 ? (width - padding.left - padding.right) / 2 : index / (points.length - 1) * (width - padding.left - padding.right));
    const y = (weight) => padding.top + (max - weight) / (max - min) * (height - padding.top - padding.bottom);
    context.beginPath();
    context.moveTo(padding.left, padding.top);
    context.lineTo(padding.left, height - padding.bottom);
    context.lineTo(width - padding.right, height - padding.bottom);
    context.stroke();
    context.strokeStyle = css.getPropertyValue('--accent').trim() || '#8ea2ff';
    context.lineWidth = 3;
    context.lineJoin = 'round';
    context.beginPath();
    points.forEach((point, index) => { if (index) context.lineTo(x(index), y(point.weight)); else context.moveTo(x(index), y(point.weight)); });
    context.stroke();
    context.fillStyle = css.getPropertyValue('--accent').trim() || '#8ea2ff';
    points.forEach((point, index) => { context.beginPath(); context.arc(x(index), y(point.weight), 4, 0, Math.PI * 2); context.fill(); });
    context.textAlign = 'left';
    context.fillStyle = css.getPropertyValue('--muted').trim() || '#8f9aae';
    context.fillText(`${round(max, 1)} kg`, 4, padding.top + 4);
    context.fillText(`${round(min, 1)} kg`, 4, height - padding.bottom + 4);
  }

  function renderSettings() {
    const map = { setAge: 'age', setHeight: 'height', setStartWeight: 'startWeight', setGoalWeight: 'goalWeight', setGoalDate: 'goalDate', setCalories: 'calories', setProtein: 'protein', setSteps: 'steps', setWater: 'water', setSex: 'sex' };
    Object.entries(map).forEach(([id, key]) => value(`#${id}`, state.config[key]));
    text('#bmrExplanation', `Estimated resting energy: ${Math.round(bmr())} kcal/day. Daily burn adds normal activity, steps and logged exercise.`);
  }

  function renderWorkoutHistory() {
    const node = $('#workoutHistory');
    if (!node) return;
    const rows = Object.entries(state.workoutLog).sort(([a], [b]) => b.localeCompare(a)).flatMap(([date, sessions]) => Object.entries(sessions || {}).map(([day, log]) => ({ date, day, log })));
    node.innerHTML = rows.slice(0, 30).map(({ date, day, log }) => `<div class="list-row"><div><b>${escapeHtml(state.workouts[num(day)]?.name || 'Workout')}</b><small>${escapeHtml(date)}</small></div><span>${num(log.minutes)} min</span></div>`).join('') || '<p class="empty">No workouts saved yet.</p>';
  }

  function renderFoodHistory() {
    const node = $('#foodHistory');
    if (!node) return;
    const rows = Object.keys(state.nutrition).sort().reverse().map((date) => ({ date, totals: nutritionTotals(date) })).filter((row) => row.totals.calories > 0);
    node.innerHTML = rows.slice(0, 30).map(({ date, totals }) => `<div class="list-row"><div><b>${escapeHtml(date)}</b><small>${round(totals.protein, 1)}g protein</small></div><span>${Math.round(totals.calories)} kcal</span></div>`).join('') || '<p class="empty">No meals saved yet.</p>';
  }

  function renderAll() {
    document.documentElement.dataset.theme = state.theme;
    document.body.classList.toggle('light', state.theme === 'light');
    renderDashboard();
    renderWorkout();
    renderFood();
    renderProgress();
    renderSettings();
  }

  function saveDaily() {
    const date = today();
    const weight = num($('#weightInput')?.value, 0, 0, 400);
    const waistCm = num($('#waistInput')?.value, 0, 0, 400);
    if (weight && (weight < 25 || weight > 400)) return toast('Enter a weight between 25 and 400 kg.', 'error');
    if (waistCm && (waistCm < 20 || waistCm > 400)) return toast('Enter a valid waist measurement.', 'error');
    if (weight) { state.weights = state.weights.filter((entry) => entry.date !== date); state.weights.unshift({ date, weight }); }
    if (waistCm) { state.abdomen = state.abdomen.filter((entry) => entry.date !== date); state.abdomen.unshift({ date, value: waistCm, inches: round(waistCm / 2.54, 1) }); }
    state.activity[date] = { ...activity(date), steps: num($('#stepsInput')?.value, 0, 0, 200000), water: num($('#waterInput')?.value, 0, 0, 20) };
    persist("Today's numbers saved");
  }

  function saveWorkout() {
    const date = today();
    const plan = state.workouts[selectedDay];
    const minutes = num($('#workoutMinutes')?.value, 60, 1, 300);
    const met = num($('#workoutIntensity')?.value, 5.5, 1, 20);
    state.workoutLog[date] = state.workoutLog[date] || {};
    const existing = state.workoutLog[date][selectedDay] || {};
    state.workoutLog[date][selectedDay] = {
      ...existing,
      minutes, met,
      exercises: plan.exercises.map((exercise, index) => ({ ...(existing.exercises?.[index] || {}), sets: num($(`.ex-set[data-index="${index}"]`)?.value, exercise[1], 0, 20), reps: num($(`.ex-reps[data-index="${index}"]`)?.value, exercise[2], 0, 100), weight: num($(`.ex-weight[data-index="${index}"]`)?.value, 0, 0, 1000) }))
    };
    state.activity[date] = { ...activity(date), minutes, met, workoutDay: selectedDay };
    persist('Workout saved');
  }

  function saveExerciseCard(index) {
    const exercise = state.workouts[selectedDay]?.exercises?.[index];
    if (!exercise) return;
    const log = ensureWorkoutLog();
    const previous = log.exercises[index] || {};
    log.exercises[index] = {
      ...previous,
      sets: num($(`.ex-set[data-index="${index}"]`)?.value, exercise[1], 0, 20),
      reps: num($(`.ex-reps[data-index="${index}"]`)?.value, exercise[2], 0, 100),
      weight: num($(`.ex-weight[data-index="${index}"]`)?.value, 0, 0, 1000),
      savedAt: new Date().toISOString()
    };
    persist(`${exercise[0]} saved`);
  }

  function saveExerciseDetail() {
    const exercise = state.workouts[selectedDay]?.exercises?.[selectedExerciseIndex];
    if (!exercise) return;
    const baseline = detailSetsFor(selectedExerciseIndex);
    const setsDetail = $$('.exercise-set-row', $('#exerciseSetRows')).map((row, index) => ({
      targetWeight: baseline[index]?.targetWeight || 0,
      targetReps: baseline[index]?.targetReps || exercise[2],
      actualWeight: num($('.detail-actual-kg', row)?.value, 0, 0, 1000),
      actualReps: num($('.detail-actual-reps', row)?.value, 0, 0, 100),
      done: $('.set-done', row)?.getAttribute('aria-pressed') === 'true'
    }));
    const log = ensureWorkoutLog();
    const previous = log.exercises[selectedExerciseIndex] || {};
    const completed = setsDetail.filter((set) => set.done);
    const summary = completed.length ? completed[completed.length - 1] : setsDetail[setsDetail.length - 1];
    log.exercises[selectedExerciseIndex] = {
      ...previous,
      sets: setsDetail.length,
      reps: summary?.actualReps || exercise[2],
      weight: summary?.actualWeight || 0,
      setsDetail,
      advancedSets: setsDetail,
      savedAt: new Date().toISOString()
    };
    closeSheet('exerciseDetailSheet');
    persist(`${exercise[0]} details saved`);
  }

  function saveWorkoutPlan() {
    const rows = $$('.editor-row', $('#editExerciseList'));
    const exercises = rows.map((row) => [$('.edit-ex-name', row)?.value.trim() || 'Exercise', num($('.edit-ex-sets', row)?.value, 3, 1, 20), num($('.edit-ex-reps', row)?.value, 10, 1, 100)]);
    if (!exercises.length) return toast('A workout needs at least one exercise.', 'error');
    state.workouts[selectedDay] = { name: $('#editSessionName')?.value.trim() || 'Workout', focus: $('#editSessionFocus')?.value.trim() || '', exercises };
    closeSheet('workoutEditor');
    persist('Workout plan updated');
  }

  function addExerciseEditorRow() {
    const list = $('#editExerciseList');
    if (!list) return;
    const index = list.children.length;
    list.insertAdjacentHTML('beforeend', `<div class="editor-row" data-index="${index}"><input class="edit-ex-name" aria-label="Exercise name" value="New exercise"><input class="edit-ex-sets" aria-label="Sets" type="number" min="1" max="20" value="3"><input class="edit-ex-reps" aria-label="Reps" type="number" min="1" max="100" value="10"><button type="button" class="danger-icon" data-action="remove-exercise" aria-label="Remove exercise">${removeIcon}</button></div>`);
  }

  function syncFoodRow(row) {
    const mealKey = row.dataset.meal;
    const index = num(row.dataset.index);
    const selected = findFood($('.food-name', row)?.value);
    if (!selected) return toast('Choose a food from the database or add it as a custom food.', 'error');
    const unit = $('.food-unit', row)?.value || preferredFoodUnit(selected);
    const amount = num($('.food-amount', row)?.value, unit === 'each' ? 1 : num(selected.defaultGrams, 100), 0, 10000);
    const grams = round(amount * unitGrams(selected, unit), 1);
    const calculate = (key) => round(num(selected[key]) * grams / 100, 1);
    ensureMeals()[mealKey][index] = { name: selected.name, amount, unit, grams, calories: calculate('calories'), protein: calculate('protein'), carbs: calculate('carbs'), fat: calculate('fat'), savedAt: new Date().toISOString() };
    persist(`${selected.name} saved`);
  }

  function saveCustomFood() {
    const food = {
      name: $('#customFoodName')?.value.trim(),
      defaultGrams: num($('#customFoodServing')?.value, 100, 1, 10000),
      calories: num($('#customFoodCalories')?.value, 0, 0, 2000),
      protein: num($('#customFoodProtein')?.value, 0, 0, 1000),
      carbs: num($('#customFoodCarbs')?.value, 0, 0, 1000),
      fat: num($('#customFoodFat')?.value, 0, 0, 1000),
      aliases: []
    };
    if (!food.name) return toast('Enter a food name.', 'error');
    const existing = state.customFoods.findIndex((entry) => entry.name.toLowerCase() === food.name.toLowerCase());
    if (existing >= 0) state.customFoods[existing] = food; else state.customFoods.push(food);
    ['#customFoodName', '#customFoodCalories', '#customFoodProtein', '#customFoodCarbs', '#customFoodFat'].forEach((selector) => value(selector, ''));
    persist('Food database updated');
  }

  function saveSettings() {
    const definitions = {
      age: ['#setAge', 13, 120], height: ['#setHeight', 100, 250], startWeight: ['#setStartWeight', 25, 400], goalWeight: ['#setGoalWeight', 25, 400], calories: ['#setCalories', 800, 10000], protein: ['#setProtein', 0, 1000], steps: ['#setSteps', 0, 200000], water: ['#setWater', 0, 20]
    };
    Object.entries(definitions).forEach(([key, [selector, min, max]]) => { state.config[key] = num($(selector)?.value, state.config[key], min, max); });
    const goalDate = $('#setGoalDate')?.value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(goalDate || '')) state.config.goalDate = goalDate;
    state.config.sex = $('#setSex')?.value === 'female' ? 'female' : 'male';
    persist('Targets updated');
  }

  function handleClick(event) {
    if (event.target.matches('.sheet-backdrop')) {
      closeSheet(event.target);
      return;
    }
    const button = event.target.closest('button,[data-action]');
    if (!button) return;
    const action = button.dataset.action || button.id;
    if (button.dataset.sheetOpen) {
      openSheet(button.dataset.sheetOpen, button);
      return;
    }
    if (button.hasAttribute('data-sheet-close')) {
      closeSheet(button);
      return;
    }
    if (action === 'open-exercise-media') {
      openExerciseMedia(button);
      return;
    }
    if (action === 'open-library-exercise') {
      openExerciseMedia(button);
      return;
    }
    if (action === 'close-exercise-media') {
      closeExerciseMedia();
      return;
    }
    if (action === 'close-exercise-detail') { closeSheet('exerciseDetailSheet'); return; }
    if (action === 'open-exercise-detail') { openExerciseDetail(button); return; }
    if (action === 'toggle-set-done') {
      const done = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(done));
      button.classList.toggle('saved', done);
      button.textContent = done ? '✓' : '○';
      return;
    }
    if (action === 'save-exercise-detail') { saveExerciseDetail(); return; }
    if (action === 'save-exercise') { saveExerciseCard(num(button.dataset.index)); return; }
    if (button.dataset.nav) {
      window.dispatchEvent(new CustomEvent('mybody:navigate', { detail: { id: button.dataset.nav } }));
      return;
    }
    if (button.dataset.focus) {
      window.dispatchEvent(new CustomEvent('mybody:navigate', { detail: { id: 'today' } }));
      window.setTimeout(() => {
        const field = document.getElementById(button.dataset.focus);
        field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        field?.focus({ preventScroll: true });
      }, 80);
      return;
    }
    if (action === 'themeBtn') { state.theme = state.theme === 'light' ? 'dark' : 'light'; persist('Theme updated'); }
    if (action === 'saveDaily') saveDaily();
    if (action === 'select-day') { selectedDay = num(button.dataset.day, 0, 0, state.workouts.length - 1); renderWorkout(); }
    if (action === 'saveWorkout') saveWorkout();
    if (action === 'exerciseLibraryBtn') { renderExerciseLibrary(); openSheet('exerciseLibrarySheet', button); }
    if (action === 'filter-exercises') { exerciseCategory = button.dataset.category || 'All'; renderExerciseLibrary(); }
    if (action === 'keepExercisesOffline') keepExercisesOffline();
    if (action === 'editWorkoutBtn') openSheet('workoutEditor', button);
    if (action === 'closeWorkoutEditor') closeSheet('workoutEditor');
    if (action === 'addExercise') addExerciseEditorRow();
    if (action === 'remove-exercise') {
      const rows = $$('.editor-row', $('#editExerciseList'));
      if (rows.length > 1) button.closest('.editor-row')?.remove(); else toast('A workout needs at least one exercise.', 'error');
    }
    if (action === 'saveWorkoutPlan') saveWorkoutPlan();
    if (action === 'manageFoodsBtn') openSheet('foodManager', button);
    if (action === 'closeFoodManager') closeSheet('foodManager');
    if (action === 'add-food') { ensureMeals()[button.dataset.meal].push({ name: '', amount: '', unit: 'g', grams: '', calories: 0, protein: 0, carbs: 0, fat: 0, savedAt: '' }); persist('Food row added'); }
    if (action === 'save-food') syncFoodRow(button.closest('.food-row'));
    if (action === 'remove-food') { const row = button.closest('.food-row'); ensureMeals()[row.dataset.meal].splice(num(row.dataset.index), 1); persist('Food removed'); }
    if (action === 'saveCustomFood') saveCustomFood();
    if (action === 'delete-custom-food') { state.customFoods.splice(num(button.dataset.index), 1); persist('Custom food deleted'); }
    if (action === 'saveSettings') saveSettings();
  }

  function handleChange(event) {
    const row = event.target.closest('.food-row');
    if (row && event.target.matches('.food-name')) {
      const selected = findFood(event.target.value);
      if (selected) {
        const unit = preferredFoodUnit(selected);
        $('.food-unit', row).value = unit;
        $('.food-amount', row).value = unit === 'each' ? 1 : num(selected.defaultGrams, 100);
      }
      row.classList.add('is-dirty');
      $('.food-save', row)?.classList.remove('saved');
      if ($('.food-save', row)) $('.food-save', row).textContent = 'Save';
    }
    if (row && event.target.matches('.food-unit')) {
      row.classList.add('is-dirty');
      const save = $('.food-save', row);
      save?.classList.remove('saved');
      if (save) save.textContent = 'Save';
    }
    if (event.target.matches('#workoutMinutes,#workoutIntensity')) {
      const minutes = num($('#workoutMinutes')?.value, 60, 1, 300);
      const met = num($('#workoutIntensity')?.value, 5.5, 1, 20);
      text('#sessionMinutes', minutes);
      text('#sessionBurn', `${Math.round(minutes * met * 3.5 * latestWeight() / 200)} kcal`);
    }
  }

  function handleInput(event) {
    if (event.target.matches('#exerciseLibrarySearch')) renderExerciseLibrary();
    const exercise = event.target.closest('.exercise');
    if (exercise && event.target.matches('.ex-set,.ex-reps,.ex-weight')) {
      exercise.classList.add('is-dirty');
      const save = $('.entry-save', exercise);
      const status = $('.save-status', exercise);
      save?.classList.remove('saved');
      if (save) save.textContent = 'Save exercise';
      if (status) status.textContent = 'Unsaved changes';
    }
    const food = event.target.closest('.food-row');
    if (food && event.target.matches('.food-name,.food-amount,.food-unit')) {
      food.classList.add('is-dirty');
      const save = $('.food-save', food);
      save?.classList.remove('saved');
      if (save) save.textContent = 'Save';
    }
    if (food && event.target.matches('.food-name')) {
      const query = event.target.value.trim().toLowerCase();
      const selected = findFood(query);
      const exactMatch = selected && (selected.name.toLowerCase() === query || (selected.aliases || []).some((alias) => String(alias).toLowerCase() === query));
      if (exactMatch) {
        const unit = preferredFoodUnit(selected);
        $('.food-unit', food).value = unit;
        $('.food-amount', food).value = unit === 'each' ? 1 : num(selected.defaultGrams, 100);
      }
    }
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js?v=__BUILD__', { scope: './', updateViaCache: 'none' });
      registration.update().catch(() => {});
    } catch (error) {
      console.warn('Offline support unavailable:', error);
    }
  }

  function init() {
    if (document.documentElement.dataset.appReady === '1') return;
    document.documentElement.dataset.appReady = '1';
    document.addEventListener('click', handleClick);
    document.addEventListener('change', handleChange);
    document.addEventListener('input', handleInput);
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const lightbox = $('#exerciseLightbox:not(.hidden)');
      if (lightbox) { closeExerciseMedia(); return; }
      const sheet = $('.sheet-backdrop:not(.hidden)');
      if (sheet) closeSheet(sheet);
    });
    window.addEventListener('mybody:state', (event) => { state = Store.normalise(event.detail); });
    window.addEventListener('mybody:storage-error', () => toast('Storage is full. Export or remove old entries.', 'error'));
    window.addEventListener('storage', (event) => { if (event.key === Store.DATA_KEY || event.key?.startsWith(`${Store.DATA_KEY}.user.`)) { state = Store.read(); renderAll(); } });
    window.addEventListener('mybody:tabchange', () => {
      $$('.sheet-backdrop:not(.hidden)').forEach((sheet) => sheet.classList.add('hidden'));
      if (!$('#exerciseLightbox')?.classList.contains('hidden')) closeExerciseMedia();
      document.body.classList.remove('modal-open');
    });
    resizeObserver = new ResizeObserver(scheduleChart);
    const chart = $('#weightChart');
    if (chart) resizeObserver.observe(chart);
    renderAll();
    registerServiceWorker();
  }

  window.MyBodyApp = Object.freeze({ getState: () => Store.clone(state), render: renderAll, totals: nutritionTotals, burn: energyBurn });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
