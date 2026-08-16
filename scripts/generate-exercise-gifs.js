#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createCanvas } = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'exercise-library.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context, { filename: 'exercise-library.js' });
const exercises = context.window.MyBodyExerciseLibrary.exercises;
const outputDir = path.join(root, 'assets', 'exercises', 'guides');
const frameCount = 20;

fs.mkdirSync(outputDir, { recursive: true });

const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
}[character]));
const mix = (start, end, amount) => start + ((end - start) * amount);
const point = (start, end, amount) => [mix(start[0], end[0], amount), mix(start[1], end[1], amount)];

function standingPose() {
  return {
    head: [160, 41], neck: [160, 57], shoulderL: [148, 68], shoulderR: [172, 68],
    elbowL: [136, 91], elbowR: [184, 91], handL: [126, 113], handR: [194, 113],
    hip: [160, 112], kneeL: [143, 134], kneeR: [177, 134], footL: [134, 157], footR: [186, 157]
  };
}

function poseFor(exercise, amount) {
  const { pattern, id } = exercise;
  const start = standingPose();
  const end = JSON.parse(JSON.stringify(start));
  const set = (key, value) => { end[key] = value; };

  if (['dumbbell-bench-press', 'incline-dumbbell-press', 'squeeze-press'].includes(id)) {
    Object.assign(start, {
      head: [83, 118], neck: [99, 122], shoulderL: [116, 119], shoulderR: [116, 127],
      elbowL: [131, 92], elbowR: [142, 104], handL: [145, 75], handR: [157, 86],
      hip: [168, 128], kneeL: [204, 126], kneeR: [205, 134], footL: [232, 154], footR: [244, 154]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    set('elbowL', [143, 60]); set('elbowR', [157, 67]); set('handL', [146, 27]); set('handR', [161, 34]);
  } else if (id === 'dumbbell-chest-fly') {
    Object.assign(start, {
      head: [83, 118], neck: [99, 122], shoulderL: [116, 119], shoulderR: [116, 127],
      elbowL: [126, 89], elbowR: [137, 105], handL: [101, 69], handR: [113, 86],
      hip: [168, 128], kneeL: [204, 126], kneeR: [205, 134], footL: [232, 154], footR: [244, 154]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    set('elbowL', [141, 67]); set('elbowR', [154, 75]); set('handL', [148, 38]); set('handR', [162, 46]);
  } else if (id === 'dumbbell-pullover') {
    Object.assign(start, {
      head: [83, 118], neck: [99, 122], shoulderL: [116, 119], shoulderR: [116, 127],
      elbowL: [99, 91], elbowR: [109, 96], handL: [74, 70], handR: [83, 76],
      hip: [168, 128], kneeL: [204, 126], kneeR: [205, 134], footL: [232, 154], footR: [244, 154]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    set('elbowL', [130, 76]); set('elbowR', [141, 83]); set('handL', [145, 52]); set('handR', [156, 59]);
  } else if (id === 'plank') {
    Object.assign(start, {
      head: [88, 96], neck: [104, 102], shoulderL: [121, 109], shoulderR: [124, 116],
      elbowL: [112, 137], elbowR: [126, 139], handL: [91, 145], handR: [107, 147],
      hip: [177, 121], kneeL: [213, 132], kneeR: [216, 139], footL: [251, 148], footR: [252, 153]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    set('hip', [177, 116]); set('head', [88, 91]); set('neck', [104, 97]);
  } else if (id === 'mountain-climber') {
    Object.assign(start, {
      head: [88, 88], neck: [104, 96], shoulderL: [120, 106], shoulderR: [124, 114],
      elbowL: [111, 133], elbowR: [126, 136], handL: [91, 146], handR: [109, 148],
      hip: [177, 118], kneeL: [212, 132], kneeR: [214, 138], footL: [250, 149], footR: [251, 154]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    set('kneeL', [151, 119]); set('footL', [132, 142]);
  } else if (id === 'flutter-kicks') {
    Object.assign(start, {
      head: [80, 124], neck: [97, 128], shoulderL: [114, 129], shoulderR: [114, 135],
      elbowL: [95, 144], elbowR: [108, 148], handL: [80, 151], handR: [94, 154],
      hip: [164, 136], kneeL: [200, 129], kneeR: [201, 142], footL: [240, 122], footR: [241, 149]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    set('footL', [240, 149]); set('footR', [241, 122]);
  } else if (['v-sit-hold', 'v-sit-twist', 'russian-twist', 'seated-knee-tuck'].includes(id)) {
    Object.assign(start, {
      head: [124, 60], neck: [134, 75], shoulderL: [128, 82], shoulderR: [143, 78],
      elbowL: [151, 93], elbowR: [159, 88], handL: [174, 101], handR: [182, 96],
      hip: [160, 122], kneeL: [192, 103], kneeR: [196, 112], footL: [225, 83], footR: [230, 94]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    if (id === 'seated-knee-tuck') { set('kneeL', [171, 102]); set('kneeR', [178, 109]); set('footL', [195, 93]); set('footR', [203, 101]); }
    else if (id !== 'v-sit-hold') { set('handL', [149, 108]); set('handR', [158, 103]); set('elbowL', [139, 94]); set('elbowR', [147, 90]); }
    else { set('footL', [228, 79]); set('footR', [233, 90]); }
  } else if (id === 'bird-dog') {
    Object.assign(start, {
      head: [96, 91], neck: [111, 100], shoulderL: [126, 108], shoulderR: [130, 115],
      elbowL: [114, 133], elbowR: [133, 136], handL: [93, 148], handR: [114, 150],
      hip: [177, 119], kneeL: [168, 146], kneeR: [190, 145], footL: [147, 153], footR: [172, 154]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    set('elbowL', [103, 102]); set('handL', [69, 91]); set('kneeR', [207, 121]); set('footR', [244, 109]);
  } else if (id === 'lower-back-rotation') {
    Object.assign(start, {
      head: [82, 126], neck: [99, 130], shoulderL: [116, 127], shoulderR: [116, 136],
      elbowL: [103, 107], elbowR: [105, 153], handL: [78, 99], handR: [80, 158],
      hip: [166, 137], kneeL: [193, 111], kneeR: [196, 120], footL: [216, 137], footR: [220, 146]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    set('kneeL', [190, 145]); set('kneeR', [193, 152]); set('footL', [215, 154]); set('footR', [220, 157]);
  } else if (id === 'leg-press') {
    Object.assign(start, {
      head: [105, 65], neck: [113, 81], shoulderL: [109, 90], shoulderR: [123, 85],
      elbowL: [103, 111], elbowR: [126, 108], handL: [118, 124], handR: [140, 119],
      hip: [145, 128], kneeL: [176, 104], kneeR: [181, 113], footL: [204, 80], footR: [211, 89]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    set('kneeL', [203, 100]); set('kneeR', [208, 109]); set('footL', [245, 81]); set('footR', [250, 91]);
  } else if (id === 'leg-extension') {
    Object.assign(start, {
      head: [122, 54], neck: [130, 70], shoulderL: [124, 79], shoulderR: [138, 75],
      elbowL: [118, 102], elbowR: [142, 98], handL: [132, 115], handR: [155, 109],
      hip: [154, 122], kneeL: [181, 125], kneeR: [186, 133], footL: [193, 154], footR: [201, 157]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    set('footL', [221, 125]); set('footR', [225, 134]);
  } else if (id === 'leg-curl') {
    Object.assign(start, {
      head: [78, 118], neck: [95, 124], shoulderL: [112, 124], shoulderR: [112, 132],
      elbowL: [98, 145], elbowR: [112, 149], handL: [78, 151], handR: [95, 154],
      hip: [165, 134], kneeL: [203, 136], kneeR: [204, 144], footL: [241, 145], footR: [241, 153]
    });
    Object.assign(end, JSON.parse(JSON.stringify(start)));
    set('footL', [205, 101]); set('footR', [212, 106]);
  } else if (['press', 'thruster'].includes(pattern)) {
    set('elbowL', [145, 48]); set('elbowR', [175, 48]); set('handL', [143, 20]); set('handR', [177, 20]);
  } else if (pattern === 'fly') {
    start.elbowL = [122, 78]; start.elbowR = [198, 78]; start.handL = [91, 82]; start.handR = [229, 82];
    set('elbowL', [151, 67]); set('elbowR', [169, 67]); set('handL', [156, 52]); set('handR', [164, 52]);
  } else if (['row', 'upright-row'].includes(pattern)) {
    start.elbowL = [148, 95]; start.elbowR = [172, 95]; start.handL = [145, 124]; start.handR = [175, 124];
    set('elbowL', [129, 69]); set('elbowR', [191, 69]); set('handL', [146, 78]); set('handR', [174, 78]);
  } else if (pattern === 'pull') {
    start.elbowL = [130, 48]; start.elbowR = [190, 48]; start.handL = [108, 23]; start.handR = [212, 23];
    set('elbowL', [132, 91]); set('elbowR', [188, 91]); set('handL', [145, 73]); set('handR', [175, 73]);
  } else if (pattern === 'pullover') {
    start.elbowL = [145, 49]; start.elbowR = [175, 49]; start.handL = [139, 22]; start.handR = [181, 22];
    set('elbowL', [142, 74]); set('elbowR', [178, 74]); set('handL', [148, 99]); set('handR', [172, 99]);
  } else if (['curl', 'curlleg'].includes(pattern)) {
    set('handL', [145, 72]); set('handR', [175, 72]);
    if (pattern === 'curlleg') { set('footL', [159, 131]); set('kneeL', [143, 134]); }
  } else if (pattern === 'pushdown') {
    start.elbowL = [145, 80]; start.elbowR = [175, 80]; start.handL = [153, 62]; start.handR = [167, 62];
    set('handL', [142, 116]); set('handR', [178, 116]);
  } else if (pattern === 'extension') {
    start.elbowL = [145, 44]; start.elbowR = [175, 44]; start.handL = [155, 65]; start.handR = [165, 65];
    set('handL', [148, 17]); set('handR', [172, 17]);
  } else if (pattern === 'raise') {
    set('elbowL', [121, 72]); set('elbowR', [199, 72]); set('handL', [91, 72]); set('handR', [229, 72]);
  } else if (pattern === 'shrug') {
    set('shoulderL', [148, 59]); set('shoulderR', [172, 59]); set('elbowL', [136, 82]); set('elbowR', [184, 82]); set('handL', [126, 104]); set('handR', [194, 104]);
  } else if (['squat', 'legpress'].includes(pattern)) {
    set('head', [160, 62]); set('neck', [160, 76]); set('shoulderL', [148, 83]); set('shoulderR', [172, 83]);
    set('hip', [160, 128]); set('kneeL', [128, 133]); set('kneeR', [192, 133]);
  } else if (pattern === 'hinge') {
    set('head', [205, 69]); set('neck', [191, 76]); set('shoulderL', [181, 80]); set('shoulderR', [198, 72]);
    set('elbowL', [184, 104]); set('elbowR', [202, 98]); set('handL', [181, 129]); set('handR', [202, 125]);
  } else if (pattern === 'lunge') {
    set('hip', [160, 124]); set('kneeL', [135, 135]); set('footL', [121, 157]); set('kneeR', [193, 138]); set('footR', [223, 157]);
  } else if (pattern === 'adduction') {
    set('kneeL', [165, 134]); set('footL', [181, 157]);
  } else if (pattern === 'calf') {
    Object.keys(end).forEach((key) => { if (end[key][1] > 20) end[key][1] -= 9; });
  } else if (pattern === 'extensionleg') {
    set('kneeL', [143, 134]); set('footL', [111, 133]);
  } else if (pattern === 'twist' || pattern === 'rotation') {
    set('elbowL', [149, 86]); set('elbowR', [176, 77]); set('handL', [139, 104]); set('handR', [194, 68]);
  } else if (['crunch', 'tuck'].includes(pattern)) {
    set('head', [148, 60]); set('neck', [151, 72]); set('shoulderL', [143, 80]); set('shoulderR', [163, 77]); set('hip', [160, 119]);
    set('kneeL', [149, 126]); set('kneeR', [174, 126]);
  } else if (pattern === 'flutter') {
    set('footL', [126, 146]); set('footR', [196, 164]);
  } else if (pattern === 'climber') {
    set('kneeL', [154, 118]); set('footL', [137, 139]);
  } else if (pattern === 'bridge') {
    set('head', [102, 133]); set('neck', [116, 128]); set('shoulderL', [126, 126]); set('shoulderR', [126, 126]); set('hip', [164, 105]);
    set('kneeL', [195, 128]); set('kneeR', [195, 128]); set('footL', [214, 156]); set('footR', [214, 156]);
    start.head = [102, 133]; start.neck = [116, 130]; start.shoulderL = [126, 130]; start.shoulderR = [126, 130]; start.hip = [164, 139];
    start.kneeL = [195, 140]; start.kneeR = [195, 140]; start.footL = [214, 156]; start.footR = [214, 156];
  } else if (pattern === 'birddog') {
    set('elbowL', [111, 101]); set('handL', [79, 93]); set('kneeR', [190, 120]); set('footR', [225, 107]);
  }

  const pose = {};
  Object.keys(start).forEach((key) => { pose[key] = point(start[key], end[key], amount); });
  return pose;
}

function svgFor(exercise, amount) {
  const p = poseFor(exercise, amount);
  const line = (a, b, className = 'limb') => `<path class="${className}" d="M${p[a][0].toFixed(1)} ${p[a][1].toFixed(1)}L${p[b][0].toFixed(1)} ${p[b][1].toFixed(1)}"/>`;
  const weights = !/bodyweight|chair|band/i.test(exercise.equipment) && !['hold', 'climber', 'birddog', 'rotation', 'flutter', 'bridge'].includes(exercise.pattern);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="190" viewBox="0 0 320 190">
  <rect width="320" height="190" rx="20" fill="#090d09"/>
  <path d="M28 160H292" stroke="#303830" stroke-width="3" stroke-linecap="round"/>
  <text x="18" y="25" fill="#f4f7f1" font-family="Arial,sans-serif" font-size="15" font-weight="700">${esc(exercise.name)}</text>
  <text x="18" y="180" fill="#8f9b8f" font-family="Arial,sans-serif" font-size="10">Offline movement guide • ${esc(exercise.category)}</text>
  <g fill="none" stroke="#f4f7f1" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    ${line('neck', 'hip', 'torso')}${line('shoulderL', 'elbowL')}${line('elbowL', 'handL')}${line('shoulderR', 'elbowR')}${line('elbowR', 'handR')}
    ${line('hip', 'kneeL')}${line('kneeL', 'footL')}${line('hip', 'kneeR')}${line('kneeR', 'footR')}
  </g>
  <circle cx="${p.head[0].toFixed(1)}" cy="${p.head[1].toFixed(1)}" r="13" fill="#171e17" stroke="#d8ff54" stroke-width="4"/>
  ${weights ? `<circle cx="${p.handL[0].toFixed(1)}" cy="${p.handL[1].toFixed(1)}" r="7" fill="#d8ff54" stroke="#071007" stroke-width="3"/><circle cx="${p.handR[0].toFixed(1)}" cy="${p.handR[1].toFixed(1)}" r="7" fill="#d8ff54" stroke="#071007" stroke-width="3"/>` : ''}
  <path d="M266 115c14-19 14-43 0-62m-7 8 7-10 8 10" fill="none" stroke="#d8ff54" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="${(0.48 + amount * 0.52).toFixed(2)}"/>
  </svg>`;
}

function drawFrame(exercise, amount, target) {
  const pose = poseFor(exercise, amount);
  const canvas = createCanvas(320, 190);
  const drawing = canvas.getContext('2d');
  drawing.fillStyle = '#090d09';
  drawing.fillRect(0, 0, 320, 190);
  drawing.strokeStyle = '#303830';
  drawing.lineWidth = 3;
  drawing.lineCap = 'round';
  drawing.beginPath();
  drawing.moveTo(28, 160);
  drawing.lineTo(292, 160);
  drawing.stroke();

  drawing.fillStyle = '#f4f7f1';
  drawing.font = '700 15px Arial';
  const title = exercise.name.length > 34 ? `${exercise.name.slice(0, 32)}…` : exercise.name;
  drawing.fillText(title, 18, 25);
  drawing.fillStyle = '#8f9b8f';
  drawing.font = '10px Arial';
  drawing.fillText(`Offline movement guide • ${exercise.category}`, 18, 180);

  const limb = (from, to) => {
    drawing.beginPath();
    drawing.moveTo(...pose[from]);
    drawing.lineTo(...pose[to]);
    drawing.stroke();
  };
  drawing.strokeStyle = '#f4f7f1';
  drawing.lineWidth = 10;
  drawing.lineJoin = 'round';
  limb('neck', 'hip');
  limb('shoulderL', 'elbowL'); limb('elbowL', 'handL');
  limb('shoulderR', 'elbowR'); limb('elbowR', 'handR');
  limb('hip', 'kneeL'); limb('kneeL', 'footL');
  limb('hip', 'kneeR'); limb('kneeR', 'footR');

  drawing.fillStyle = '#171e17';
  drawing.strokeStyle = '#d8ff54';
  drawing.lineWidth = 4;
  drawing.beginPath();
  drawing.arc(pose.head[0], pose.head[1], 13, 0, Math.PI * 2);
  drawing.fill();
  drawing.stroke();

  const weights = !/bodyweight|chair|band/i.test(exercise.equipment) && !['hold', 'climber', 'birddog', 'rotation', 'flutter', 'bridge'].includes(exercise.pattern);
  if (weights) {
    [pose.handL, pose.handR].forEach(([x, y]) => {
      drawing.fillStyle = '#d8ff54';
      drawing.strokeStyle = '#071007';
      drawing.lineWidth = 3;
      drawing.beginPath();
      drawing.arc(x, y, 7, 0, Math.PI * 2);
      drawing.fill();
      drawing.stroke();
    });
  }

  drawing.strokeStyle = `rgba(216,255,84,${0.48 + amount * 0.52})`;
  drawing.lineWidth = 4;
  drawing.beginPath();
  drawing.moveTo(266, 115); drawing.bezierCurveTo(280, 96, 280, 72, 266, 53);
  drawing.moveTo(259, 61); drawing.lineTo(266, 51); drawing.lineTo(274, 61);
  drawing.stroke();
  fs.writeFileSync(target, canvas.toBuffer('image/png'));
}

const temporaryBase = fs.existsSync(os.tmpdir()) ? os.tmpdir() : path.join(root, '.generated-frames');
fs.mkdirSync(temporaryBase, { recursive: true });
const temporaryRoot = fs.mkdtempSync(path.join(temporaryBase, 'mybody-gifs-'));
try {
  exercises.forEach((exercise, exerciseIndex) => {
    const frameDir = path.join(temporaryRoot, exercise.id);
    fs.mkdirSync(frameDir);
    const frames = [];
    for (let index = 0; index < frameCount; index += 1) {
      const phase = index / frameCount;
      const amount = (1 - Math.cos(phase * Math.PI * 2)) / 2;
      const frame = path.join(frameDir, `${String(index).padStart(2, '0')}.png`);
      drawFrame(exercise, amount, frame);
      frames.push(frame);
    }
    const output = path.join(outputDir, `${exercise.id}.gif`);
    execFileSync('convert', ['-background', '#090d09', '-delay', '7', '-loop', '0', ...frames, '-layers', 'Optimize', output], { stdio: ['ignore', 'ignore', 'inherit'] });
    process.stdout.write(`${String(exerciseIndex + 1).padStart(2, '0')}/${exercises.length} ${exercise.id}\n`);
  });
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
  if (path.basename(temporaryBase) === '.generated-frames') fs.rmSync(temporaryBase, { recursive: true, force: true });
}

console.log(`Generated ${exercises.length} original GIF demonstrations in ${path.relative(root, outputDir)}`);
