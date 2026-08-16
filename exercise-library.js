(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : self;

  const realVideos = Object.freeze({
    'dumbbell-bench-press': 'Barbell Bench Press',
    'incline-dumbbell-press': 'Incline Machine Press',
    'dumbbell-chest-fly': 'Pec Deck Fly',
    'one-arm-dumbbell-row': 'Single Arm Dumbbell Row - Legs apart',
    'lat-pulldown': 'Lat Pulldown with V-Grip',
    'seated-cable-row': 'Seated Cable Row Neutral Grip',
    'lateral-raise': 'Dumbbell Lateral Raise',
    'rear-delt-fly': 'Machine Reverse Fly',
    'dumbbell-biceps-curl': 'Machine Bicep Curl',
    'hammer-curl': 'Hammer Curls',
    'rope-pushdown': 'Cable Tricep Pushdown',
    'overhead-triceps-extension': 'Overhead Cable Rope Extension',
    'romanian-deadlift': 'Kettlebell Romanian Deadlift',
    'back-squat': 'Barbell Back Squat',
    'leg-curl': 'Lying Leg Curl',
    'leg-extension': 'Leg Extension'
  });

  const exercises = [
    ['dumbbell-bench-press', 'Dumbbell Bench Press', ['bench press', 'machine chest press', 'barbell bench press', 'chest press'], 'Chest', 'Dumbbells • bench', 'chest', 'press', ['Keep shoulder blades set', 'Lower with control', 'Press without bouncing']],
    ['incline-dumbbell-press', 'Incline Dumbbell Press', ['incline press', 'incline bench press', 'incline hammer press', 'low-to-high cable fly'], 'Chest', 'Dumbbells • incline bench', 'chest', 'press', ['Use a moderate bench angle', 'Keep wrists stacked', 'Finish above upper chest']],
    ['dumbbell-chest-fly', 'Dumbbell Chest Fly', ['chest fly', 'cable fly', 'pec deck fly', 'lever pec deck fly', 'incline fly', 'incline dumbbell fly', 'decline twist fly'], 'Chest', 'Dumbbells • bench', 'chest', 'fly', ['Keep a soft elbow bend', 'Open only to a comfortable depth', 'Bring arms together with control']],
    ['squeeze-press', 'Dumbbell Squeeze Press', ['squeeze press'], 'Chest', 'Dumbbells • bench', 'chest', 'press', ['Keep dumbbells together', 'Maintain inward pressure', 'Move through a controlled range']],
    ['dumbbell-pullover', 'Dumbbell Pullover', ['pullover'], 'Chest & Back', 'Dumbbell • bench', 'back', 'pullover', ['Keep ribs down', 'Move from the shoulders', 'Stop before the lower back arches']],
    ['one-arm-dumbbell-row', 'One-arm Dumbbell Row', ['single arm dumbbell row', 'dumbbell row', 'chest-supported row', 't-bar row'], 'Back', 'Dumbbell • bench', 'back', 'row', ['Brace a neutral spine', 'Drive elbow toward the hip', 'Avoid twisting the torso']],
    ['lat-pulldown', 'Lat Pulldown', ['pulldown', 'straight-arm pulldown'], 'Back', 'Cable machine', 'back', 'pull', ['Keep chest tall', 'Pull elbows toward ribs', 'Control the return']],
    ['seated-cable-row', 'Seated Cable Row', ['cable row'], 'Back', 'Cable machine', 'back', 'row', ['Sit tall', 'Lead with the elbows', 'Do not rock backward']],
    ['front-press', 'Dumbbell Front Press', ['front press', 'seated dumbbell press', 'shoulder press'], 'Shoulders', 'Dumbbells', 'shoulders', 'press', ['Stack wrists over elbows', 'Brace the torso', 'Press without shrugging']],
    ['upright-row', 'Dumbbell Upright Row', ['upright row'], 'Shoulders', 'Dumbbells', 'shoulders', 'row', ['Use a comfortable grip', 'Lead with elbows', 'Stop at a pain-free height']],
    ['arnold-press', 'Arnold Press', ['arnold press'], 'Shoulders', 'Dumbbells', 'shoulders', 'press', ['Rotate smoothly', 'Keep ribs stacked', 'Avoid locking the elbows hard']],
    ['lateral-raise', 'Dumbbell Lateral Raise', ['lateral raise', 'cable lateral raise'], 'Shoulders', 'Dumbbells', 'shoulders', 'raise', ['Use light control', 'Keep shoulders down', 'Raise to a comfortable height']],
    ['rear-delt-fly', 'Rear-delt Fly', ['rear delt fly', 'reverse pec deck', 'face pull'], 'Shoulders', 'Dumbbells or machine', 'shoulders', 'fly', ['Hinge with a neutral spine', 'Open arms wide', 'Avoid swinging']],
    ['decline-shrug', 'Decline Dumbbell Shrug', ['decline shrug', 'shrug'], 'Shoulders', 'Dumbbells • bench', 'shoulders', 'shrug', ['Let shoulder blades move', 'Lift without rolling', 'Pause briefly at the top']],
    ['dumbbell-biceps-curl', 'Dumbbell Biceps Curl', ['biceps curl', 'ez-bar curl'], 'Arms', 'Dumbbells', 'biceps', 'curl', ['Keep elbows near the torso', 'Avoid body swing', 'Lower fully with control']],
    ['hammer-curl', 'Hammer Curl', ['hammer curl'], 'Arms', 'Dumbbells', 'biceps', 'curl', ['Keep palms facing inward', 'Keep wrists neutral', 'Control the lowering phase']],
    ['incline-curl', 'Incline Dumbbell Curl', ['incline curl'], 'Arms', 'Dumbbells • incline bench', 'biceps', 'curl', ['Keep shoulders against bench', 'Let arms hang naturally', 'Do not move elbows forward']],
    ['rope-pushdown', 'Rope Triceps Pushdown', ['rope pushdown', 'triceps pushdown'], 'Arms', 'Cable machine', 'triceps', 'pushdown', ['Pin elbows to sides', 'Separate rope at the bottom', 'Return without shoulder movement']],
    ['overhead-triceps-extension', 'Overhead Triceps Extension', ['overhead cable extension', 'triceps overhead'], 'Arms', 'Cable or dumbbell', 'triceps', 'extension', ['Keep elbows pointing forward', 'Brace the core', 'Use a controlled stretch']],
    ['wrist-curl', 'Dumbbell Wrist Curl', ['forearm curl', 'wrist curl', 'forearm exercise'], 'Arms', 'Dumbbells', 'biceps', 'curl', ['Support the forearms', 'Move only at the wrists', 'Use a smooth range']],
    ['romanian-deadlift', 'Romanian Deadlift', ['rdl', 'deadlift', 'hip hinge'], 'Legs', 'Barbell or dumbbells', 'legs', 'hinge', ['Push hips backward', 'Keep weights close', 'Stop when hamstrings limit depth']],
    ['back-squat', 'Squat', ['barbell squat', 'hack squat', 'squat / hack squat', 'touch squat'], 'Legs', 'Barbell or bodyweight', 'legs', 'squat', ['Brace before descending', 'Track knees with toes', 'Keep the whole foot planted']],
    ['sumo-squat', 'Sumo Squat', ['sumo squat'], 'Legs', 'Dumbbell or bodyweight', 'legs', 'squat', ['Use a comfortable wide stance', 'Track knees outward', 'Stay tall through the torso']],
    ['leg-press', 'Leg Press', ['leg press'], 'Legs', 'Leg press machine', 'legs', 'legpress', ['Keep hips against the pad', 'Control depth', 'Do not lock knees forcefully']],
    ['leg-curl', 'Leg Curl', ['hamstring curl'], 'Legs', 'Leg curl machine', 'legs', 'curlleg', ['Keep hips down', 'Curl without momentum', 'Control the return']],
    ['leg-extension', 'Leg Extension', ['leg extension'], 'Legs', 'Leg extension machine', 'legs', 'extensionleg', ['Align knee with machine pivot', 'Lift smoothly', 'Avoid kicking the weight']],
    ['calf-raise', 'Calf Raise', ['standing calf raise'], 'Legs', 'Machine or bodyweight', 'legs', 'calf', ['Use a full comfortable range', 'Pause at the top', 'Lower slowly']],
    ['glute-bridge', 'Glute Bridge', ['hip bridge'], 'Glutes', 'Bodyweight', 'legs', 'bridge', ['Brace before lifting', 'Drive through heels', 'Finish with glutes, not the lower back']],
    ['hip-adduction', 'Standing Hip Adduction', ['adductor exercise', 'glutes or adductors'], 'Legs', 'Cable or band', 'legs', 'adduction', ['Stand tall', 'Move the leg across slowly', 'Keep the pelvis level']],
    ['russian-twist', 'Weighted Russian Twist', ['russian twist with plate', 'russian twist'], 'Core', 'Plate or bodyweight', 'core', 'twist', ['Stay tall through the chest', 'Rotate the rib cage', 'Use a manageable range']],
    ['v-sit-twist', 'V-sit Twist', ['v sit twist'], 'Core', 'Bodyweight', 'core', 'twist', ['Balance on the sitting bones', 'Keep the spine long', 'Rotate under control']],
    ['flutter-kicks', 'Flutter Kicks', ['flutter kick', 'flutterkicks'], 'Core', 'Bodyweight', 'core', 'flutter', ['Keep lower back supported', 'Use small controlled kicks', 'Stop if the back lifts']],
    ['v-sit-hold', 'V-sit Hold', ['v sit hold', 'boat hold'], 'Core', 'Bodyweight', 'core', 'hold', ['Lift the chest', 'Brace and breathe', 'Bend knees if needed']],
    ['mountain-climber', 'Mountain Climber', ['mountain climbers'], 'Core', 'Bodyweight', 'core', 'climber', ['Stack shoulders over hands', 'Keep hips steady', 'Drive knees without bouncing']],
    ['standing-knee-crunch', 'Standing Knee Crunch', ['standing ab', 'standing core'], 'Core', 'Bodyweight', 'core', 'crunch', ['Stand tall first', 'Bring ribs toward the hip', 'Alternate with control']],
    ['seated-knee-tuck', 'Seated Knee Tuck', ['chair abs', 'seated core', 'seated abs'], 'Core', 'Chair', 'core', 'tuck', ['Sit near the chair edge', 'Brace before lifting', 'Move in a pain-free range']],
    ['plank', 'Forearm Plank', ['plank', 'light core'], 'Core', 'Bodyweight', 'core', 'hold', ['Keep a straight body line', 'Squeeze glutes and abs', 'Breathe normally']],
    ['cable-crunch', 'Cable Crunch', ['cable crunch'], 'Core', 'Cable machine', 'core', 'crunch', ['Keep hips mostly fixed', 'Curl ribs toward pelvis', 'Return slowly']],
    ['dumbbell-thruster', 'Dumbbell Thruster', ['full body dumbbell', 'light dumbbell workout'], 'Full Body', 'Dumbbells', 'legs', 'thruster', ['Squat with control', 'Drive through the legs', 'Finish with weights overhead']],
    ['reverse-lunge', 'Reverse Lunge', ['lunge', 'lower body workout'], 'Full Body', 'Bodyweight or dumbbells', 'legs', 'lunge', ['Step back softly', 'Keep front foot planted', 'Push through the front leg']],
    ['bird-dog', 'Bird Dog', ['lower back mobility', 'mobility'], 'Mobility', 'Bodyweight', 'core', 'birddog', ['Keep hips square', 'Reach long, not high', 'Move slowly']],
    ['lower-back-rotation', 'Lower-back Rotation', ['lower back rotation'], 'Mobility', 'Bodyweight', 'core', 'rotation', ['Keep shoulders relaxed', 'Use a gentle range', 'Breathe into the stretch']]
  ].map(([id, name, aliases, category, equipment, muscle, pattern, cues]) => {
    const sourceName = realVideos[id];
    const avatar = `assets/exercises/avatars/${id}`;
    const media = sourceName ? {
      kind: 'real-video',
      src: `assets/exercises/real/${id}.mp4`,
      poster: `assets/exercises/real/${id}.webp`,
      fallback: `${avatar}.mp4`,
      sourceName,
      credit: 'Your Move',
      license: 'YMove free app-use licence',
      sourceUrl: 'https://ymove.app/free-exercise-videos'
    } : {
      kind: 'avatar-video',
      src: `${avatar}.mp4`,
      poster: `${avatar}.webp`,
      sourceName: `${name} 3D avatar`,
      credit: 'MyBody 2.0 original',
      license: 'Original app media'
    };
    return Object.freeze({ id, name, aliases, category, equipment, muscle, pattern, cues, media: Object.freeze(media) });
  });

  const normalise = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const exact = new Map();
  exercises.forEach((exercise) => [exercise.name, exercise.id, ...exercise.aliases].forEach((alias) => exact.set(normalise(alias), exercise)));

  function infer(name) {
    const value = normalise(name);
    const muscle = /squat|leg|lunge|deadlift|calf|glute|hinge/.test(value) ? 'legs' : /pulldown|pull up|row|back|lat/.test(value) ? 'back' : /curl|biceps/.test(value) ? 'biceps' : /triceps|pushdown|extension/.test(value) ? 'triceps' : /shoulder|lateral|delt|face pull|press/.test(value) ? 'shoulders' : /crunch|plank|core|knee raise|dead bug|twist/.test(value) ? 'core' : 'chest';
    const pattern = /squat/.test(value) ? 'squat' : /deadlift|hinge/.test(value) ? 'hinge' : /curl/.test(value) ? 'curl' : /row/.test(value) ? 'row' : /raise/.test(value) ? 'raise' : /crunch/.test(value) ? 'crunch' : /plank|hold/.test(value) ? 'hold' : 'press';
    return { id: `custom-${value.replace(/ /g, '-') || 'exercise'}`, name: String(name || 'Exercise'), aliases: [], category: 'Exercise', equipment: 'See your plan', muscle, pattern, cues: ['Use a controlled range', 'Keep stable alignment', 'Stop if movement causes pain'] };
  }

  function find(name) {
    const key = normalise(name);
    if (exact.has(key)) return exact.get(key);
    const match = exercises.find((exercise) => key.includes(normalise(exercise.name)) || exercise.aliases.some((alias) => key.includes(normalise(alias)) || normalise(alias).includes(key)));
    return match || infer(name);
  }

  function renderSvg(name, animated = false) {
    const exercise = typeof name === 'object' ? name : find(name);
    const motion = animated ? ' is-animated' : '';
    const label = String(exercise.name).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
    return `<svg class="exercise-motion motion-${exercise.pattern}${motion}" viewBox="0 0 320 190" role="img" aria-label="${label} movement diagram"><defs><linearGradient id="motionAccent-${exercise.id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d8ff54"/><stop offset="1" stop-color="#79c900"/></linearGradient></defs><rect width="320" height="190" rx="22" class="motion-bg"/><path class="motion-floor" d="M38 157h244"/><g class="motion-person"><g class="motion-body"><circle class="motion-head" cx="160" cy="43" r="14"/><path class="motion-torso" d="M160 60v55"/><g class="motion-arms"><path class="motion-arm motion-arm-left" d="M160 70 126 94 104 76"/><path class="motion-arm motion-arm-right" d="M160 70 194 94 216 76"/><circle class="motion-weight" cx="101" cy="74" r="7"/><circle class="motion-weight" cx="219" cy="74" r="7"/></g><g class="motion-legs"><path class="motion-leg motion-leg-left" d="M160 114 137 151"/><path class="motion-leg motion-leg-right" d="M160 114 183 151"/></g></g></g><path class="motion-arrow" d="M254 122c17-22 17-48 0-69"/><path class="motion-arrow-head" d="m247 59 7-9 8 9"/><text x="18" y="28" class="motion-label">${label}</text><text x="18" y="177" class="motion-caption">Original offline movement guide</text></svg>`;
  }

  function renderMedia(name, options = {}) {
    const exercise = typeof name === 'object' ? name : find(name);
    if (!exercise.media || exercise.id.startsWith('custom-')) return renderSvg(exercise, Boolean(options.animated));
    const label = String(exercise.name).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
    const media = exercise.media;
    const autoplay = options.animated ? ' autoplay' : '';
    const controls = options.full ? ' controls' : '';
    const accessibility = options.decorative ? ' aria-hidden="true" tabindex="-1"' : ` aria-label="${label} video demonstration"`;
    const fallback = media.fallback ? `<source src="${media.fallback}" type="video/mp4">` : '';
    return `<video class="exercise-video${options.full ? ' is-full' : ''}" width="480" height="286" poster="${media.poster}" preload="metadata" muted loop playsinline${autoplay}${controls}${accessibility}><source src="${media.src}" type="video/mp4">${fallback}</video>`;
  }

  const categories = Object.freeze(['All', ...new Set(exercises.map((exercise) => exercise.category))]);
  root.MyBodyExerciseLibrary = Object.freeze({ exercises, categories, find, renderSvg, renderMedia, normalise });
}());
