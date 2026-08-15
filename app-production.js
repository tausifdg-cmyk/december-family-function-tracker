(function () {
  'use strict';

  const Store = window.MyBodyStore;
  if (!Store) throw new Error('MyBodyStore must load before app-production.js');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const num = Store.number;
  const round = (value, places = 0) => Math.round(value * (10 ** places)) / (10 ** places);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const today = Store.localDate;
  let state = Store.read();
  let selectedDay = Math.min(state.workouts.length - 1, Math.max(0, (new Date().getDay() + 6) % 7));
  let resizeObserver;
  let chartFrame;

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
    text('#todayLabel', new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }));
    text('#dashIntake', Math.round(totals.calories));
    text('#dashBurn', Math.round(burn.total));
    text('#dashBalance', `${balance >= 0 ? '-' : '+'}${Math.abs(Math.round(balance))}`);
    text('#dashBalanceLabel', balance >= 0 ? 'kcal estimated deficit' : 'kcal estimated surplus');
    text('#dashProtein', `${round(totals.protein, 1)}g`);
    text('#dashProteinTarget', `of ${config.protein}g target`);
    text('#baseBurn', `${Math.round(burn.base)} kcal`);
    text('#stepBurn', `${Math.round(burn.steps)} kcal`);
    text('#exerciseBurn', `${Math.round(burn.exercise)} kcal`);
    text('#totalBurn', `${Math.round(burn.total)} kcal`);
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
    const ringPercent = Math.round(percent(totals.calories, config.calories));
    text('#balanceRingText', `${ringPercent}%`);
    const ring = $('#balanceRing');
    if (ring) ring.style.setProperty('--progress', `${ringPercent * 3.6}deg`);
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
      return `<article class="card exercise"><div class="exercise-top"><span class="exercise-num">${index + 1}</span><div><h4>${escapeHtml(exercise[0])}</h4><p>${exercise[1]} sets × ${exercise[2]} reps</p></div></div><div class="exercise-inputs"><label>Sets<input class="ex-set" data-index="${index}" inputmode="numeric" type="number" min="0" max="20" value="${num(result.sets, exercise[1], 0, 20)}"></label><label>Reps<input class="ex-reps" data-index="${index}" inputmode="numeric" type="number" min="0" max="100" value="${num(result.reps, exercise[2], 0, 100)}"></label><label>Weight kg<input class="ex-weight" data-index="${index}" inputmode="decimal" type="number" min="0" max="1000" step="0.5" value="${result.weight || ''}"></label></div></article>`;
    }).join('');
    renderWorkoutEditor();
    renderWorkoutHistory();
  }

  function renderWorkoutEditor() {
    const plan = state.workouts[selectedDay];
    value('#editSessionName', plan?.name || '');
    value('#editSessionFocus', plan?.focus || '');
    const list = $('#editExerciseList');
    if (list) list.innerHTML = (plan?.exercises || []).map((exercise, index) => `<div class="editor-row" data-index="${index}"><input class="edit-ex-name" aria-label="Exercise name" value="${escapeHtml(exercise[0])}"><input class="edit-ex-sets" aria-label="Sets" type="number" min="1" max="20" value="${exercise[1]}"><input class="edit-ex-reps" aria-label="Reps" type="number" min="1" max="100" value="${exercise[2]}"><button type="button" class="danger-icon" data-action="remove-exercise" data-index="${index}" aria-label="Remove exercise">×</button></div>`).join('');
  }

  function allFoods() {
    return [...(Array.isArray(window.FOOD_DB) ? window.FOOD_DB : []), ...state.customFoods];
  }

  function findFood(query) {
    const needle = String(query || '').trim().toLowerCase();
    if (!needle) return null;
    return allFoods().find((food) => String(food.name || '').toLowerCase() === needle || (food.aliases || []).some((alias) => String(alias).toLowerCase() === needle)) || allFoods().find((food) => String(food.name || '').toLowerCase().includes(needle));
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
    if (container) container.innerHTML = Object.entries(labels).map(([key, label]) => `<section class="card meal-card"><div class="meal-head"><div><small>${label[1]}</small><h3>${label[0]}</h3></div><button type="button" class="secondary" data-action="add-food" data-meal="${key}">+ Add food</button></div><div class="meal-items">${dayMeals[key].length ? dayMeals[key].map((food, index) => `<div class="food-row" data-meal="${key}" data-index="${index}"><input class="food-name" list="foodSuggestions" aria-label="Food" value="${escapeHtml(food.name || '')}" placeholder="Search food"><input class="food-grams" type="number" inputmode="decimal" min="0" max="10000" aria-label="Grams" value="${food.grams || ''}" placeholder="g"><span class="food-macro">${Math.round(num(food.calories))} kcal<small>${round(num(food.protein), 1)}g P</small></span><button type="button" class="danger-icon" data-action="remove-food" aria-label="Remove food">×</button></div>`).join('') : '<p class="empty">Nothing logged yet.</p>'}</div></section>`).join('');
    renderFoodManager();
    renderFoodHistory();
  }

  function renderFoodManager() {
    const list = $('#customFoodList');
    if (!list) return;
    list.innerHTML = state.customFoods.length ? state.customFoods.map((food, index) => `<div class="list-row"><div><b>${escapeHtml(food.name)}</b><small>${food.calories} kcal • ${food.protein}g protein / 100g</small></div><button type="button" class="danger-icon" data-action="delete-custom-food" data-index="${index}" aria-label="Delete ${escapeHtml(food.name)}">×</button></div>`).join('') : '<p class="empty">No custom foods yet.</p>';
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
    const list = $('#progressList');
    if (list) list.innerHTML = state.weights.slice(0, 30).map((entry) => `<div class="list-row"><span>${escapeHtml(entry.date)}</span><b>${round(entry.weight, 1)} kg</b></div>`).join('') || '<p class="empty">Save a weight on Today to begin the trend.</p>';
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
    state.workoutLog[date][selectedDay] = {
      minutes, met,
      exercises: plan.exercises.map((exercise, index) => ({ sets: num($(`.ex-set[data-index="${index}"]`)?.value, exercise[1], 0, 20), reps: num($(`.ex-reps[data-index="${index}"]`)?.value, exercise[2], 0, 100), weight: num($(`.ex-weight[data-index="${index}"]`)?.value, 0, 0, 1000) }))
    };
    state.activity[date] = { ...activity(date), minutes, met, workoutDay: selectedDay };
    persist('Workout saved');
  }

  function saveWorkoutPlan() {
    const rows = $$('.editor-row', $('#editExerciseList'));
    const exercises = rows.map((row) => [$('.edit-ex-name', row)?.value.trim() || 'Exercise', num($('.edit-ex-sets', row)?.value, 3, 1, 20), num($('.edit-ex-reps', row)?.value, 10, 1, 100)]);
    if (!exercises.length) return toast('A workout needs at least one exercise.', 'error');
    state.workouts[selectedDay] = { name: $('#editSessionName')?.value.trim() || 'Workout', focus: $('#editSessionFocus')?.value.trim() || '', exercises };
    $('#workoutEditor')?.classList.add('hidden');
    persist('Workout plan updated');
  }

  function addExerciseEditorRow() {
    const list = $('#editExerciseList');
    if (!list) return;
    const index = list.children.length;
    list.insertAdjacentHTML('beforeend', `<div class="editor-row" data-index="${index}"><input class="edit-ex-name" aria-label="Exercise name" value="New exercise"><input class="edit-ex-sets" aria-label="Sets" type="number" min="1" max="20" value="3"><input class="edit-ex-reps" aria-label="Reps" type="number" min="1" max="100" value="10"><button type="button" class="danger-icon" data-action="remove-exercise" aria-label="Remove exercise">×</button></div>`);
  }

  function syncFoodRow(row) {
    const mealKey = row.dataset.meal;
    const index = num(row.dataset.index);
    const selected = findFood($('.food-name', row)?.value);
    if (!selected) return toast('Choose a food from the database or add it as a custom food.', 'error');
    const grams = num($('.food-grams', row)?.value, num(selected.defaultGrams, 100), 0, 10000);
    const calculate = (key) => round(num(selected[key]) * grams / 100, 1);
    ensureMeals()[mealKey][index] = { name: selected.name, grams, calories: calculate('calories'), protein: calculate('protein'), carbs: calculate('carbs'), fat: calculate('fat') };
    persist('Food updated');
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
    const button = event.target.closest('button,[data-action]');
    if (!button) return;
    const action = button.dataset.action || button.id;
    if (action === 'themeBtn') { state.theme = state.theme === 'light' ? 'dark' : 'light'; persist('Theme updated'); }
    if (action === 'saveDaily') saveDaily();
    if (action === 'select-day') { selectedDay = num(button.dataset.day, 0, 0, state.workouts.length - 1); renderWorkout(); }
    if (action === 'saveWorkout') saveWorkout();
    if (action === 'editWorkoutBtn') $('#workoutEditor')?.classList.remove('hidden');
    if (action === 'closeWorkoutEditor') $('#workoutEditor')?.classList.add('hidden');
    if (action === 'addExercise') addExerciseEditorRow();
    if (action === 'remove-exercise') {
      const rows = $$('.editor-row', $('#editExerciseList'));
      if (rows.length > 1) button.closest('.editor-row')?.remove(); else toast('A workout needs at least one exercise.', 'error');
    }
    if (action === 'saveWorkoutPlan') saveWorkoutPlan();
    if (action === 'manageFoodsBtn') $('#foodManager')?.classList.remove('hidden');
    if (action === 'closeFoodManager') $('#foodManager')?.classList.add('hidden');
    if (action === 'add-food') { ensureMeals()[button.dataset.meal].push({ name: '', grams: '', calories: 0, protein: 0, carbs: 0, fat: 0 }); persist('Food row added'); }
    if (action === 'remove-food') { const row = button.closest('.food-row'); ensureMeals()[row.dataset.meal].splice(num(row.dataset.index), 1); persist('Food removed'); }
    if (action === 'saveCustomFood') saveCustomFood();
    if (action === 'delete-custom-food') { state.customFoods.splice(num(button.dataset.index), 1); persist('Custom food deleted'); }
    if (action === 'saveSettings') saveSettings();
  }

  function handleChange(event) {
    const row = event.target.closest('.food-row');
    if (row && (event.target.matches('.food-name') || event.target.matches('.food-grams'))) syncFoodRow(row);
    if (event.target.matches('#workoutMinutes,#workoutIntensity')) {
      const minutes = num($('#workoutMinutes')?.value, 60, 1, 300);
      const met = num($('#workoutIntensity')?.value, 5.5, 1, 20);
      text('#sessionMinutes', minutes);
      text('#sessionBurn', `${Math.round(minutes * met * 3.5 * latestWeight() / 200)} kcal`);
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
    window.addEventListener('mybody:state', (event) => { state = Store.normalise(event.detail); });
    window.addEventListener('mybody:storage-error', () => toast('Storage is full. Export or remove old entries.', 'error'));
    window.addEventListener('storage', (event) => { if (event.key === Store.DATA_KEY || event.key?.startsWith(`${Store.DATA_KEY}.user.`)) { state = Store.read(); renderAll(); } });
    resizeObserver = new ResizeObserver(scheduleChart);
    const chart = $('#weightChart');
    if (chart) resizeObserver.observe(chart);
    renderAll();
    registerServiceWorker();
  }

  window.MyBodyApp = Object.freeze({ getState: () => Store.clone(state), render: renderAll, totals: nutritionTotals, burn: energyBurn });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
