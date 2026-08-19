/* MYBODY 2.0: exercise media source switch + weekly diet plan with PDF download. */
(function(){
'use strict';
const Store=window.MyBodyStore,Coach=window.MyBodyCoach,Library=window.MyBodyExerciseLibrary;
if(!Store)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round=(v,p=0)=>Math.round((Number(v)||0)*10**p)/10**p;
const YT_STORE='mybody.youtube.exercise-links.v1';
const DIET_STORE='mybody.weekly-diet-plan.v1';
let offlineMarkup='',offlineExercise='',lastDietPlan=null;

/* Curated exercise-form videos. Online playback stays inside MYBODY via YouTube's embed player. */
const CURATED_YOUTUBE=Object.freeze({
  'dumbbell-bench-press':'CayG6UYqL8g',
  'incline-dumbbell-press':'JKnpHchOWPU',
  'seated-cable-row':'k0cTJCfxa0Y',
  'romanian-deadlift':'xgusDooVfKU',
  'leg-press':'cDGOn-yfKJA',
  'leg-curl':'Dq5y4WEcqqo',
  'dumbbell-biceps-curl':'pQfJR-sSIvA',
  'plank':'mwlp75MS6Rg',
  'bird-dog':'',
  'russian-twist':'',
  'front-press':'2b5t0Cu2nQI'
});
function parseMap(){try{return JSON.parse(localStorage.getItem(YT_STORE)||'{}')||{}}catch(_){return {}}}
function saveMap(map){try{localStorage.setItem(YT_STORE,JSON.stringify(map))}catch(_){}}
function extractYoutubeId(value){const s=String(value||'').trim();if(/^[A-Za-z0-9_-]{11}$/.test(s))return s;try{const u=new URL(s);if(u.hostname.includes('youtu.be'))return u.pathname.split('/').filter(Boolean)[0]||'';if(u.hostname.includes('youtube.com')){if(u.pathname.startsWith('/embed/'))return u.pathname.split('/')[2]||'';return u.searchParams.get('v')||''}}catch(_){ }return ''}
function currentExercise(){const name=$('#exerciseLightboxTitle')?.textContent?.trim()||offlineExercise||'';return Library?.find?Library.find(name):{id:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name}}
function youtubeIdFor(exercise){const map=parseMap();return map[exercise?.id]||CURATED_YOUTUBE[exercise?.id]||''}
function ensureMediaSwitch(){
  const box=$('#exerciseLightbox');if(!box||box.classList.contains('hidden'))return;
  const stage=$('#exerciseMotion');if(!stage)return;
  const exercise=currentExercise();
  if(offlineExercise!==exercise.name){offlineExercise=exercise.name;offlineMarkup=stage.innerHTML;}
  let switcher=$('.mb-media-source',box);
  if(!switcher){switcher=document.createElement('div');switcher.className='mb-media-source';switcher.innerHTML='<button type="button" class="active" data-media-source="offline">Offline · Database</button><button type="button" data-media-source="youtube">Online · YouTube</button>';stage.parentElement.insertBefore(switcher,stage);switcher.addEventListener('click',e=>{const b=e.target.closest('[data-media-source]');if(!b)return;showMedia(b.dataset.mediaSource)})}
}
function showMedia(source){
  const box=$('#exerciseLightbox'),stage=$('#exerciseMotion');if(!box||!stage)return;const exercise=currentExercise();
  $$('.mb-media-source button',box).forEach(b=>b.classList.toggle('active',b.dataset.mediaSource===source));
  if(source==='offline'){stage.innerHTML=offlineMarkup;return}
  const id=youtubeIdFor(exercise);
  if(id){stage.innerHTML=`<div class="mb-youtube-stage"><div class="mb-youtube-frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?playsinline=1&rel=0" title="${esc(exercise.name)} YouTube demonstration" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><p class="mb-youtube-note">Streaming from YouTube. Playback requires internet. MYBODY remains open while the video plays.</p><button type="button" class="text-btn" data-change-youtube>Change YouTube video</button></div>`;return}
  stage.innerHTML=`<div class="mb-youtube-empty"><strong>No YouTube video saved for ${esc(exercise.name)}</strong><p>Paste a YouTube video link once. MYBODY will remember it for this exercise and play it inside the app next time.</p><div class="mb-youtube-link-row"><input type="url" inputmode="url" placeholder="Paste YouTube link" aria-label="YouTube video link"><button type="button" class="secondary" data-save-youtube>Save</button></div><p class="mb-youtube-note">Use only videos you trust for exercise technique. Offline MYBODY demonstrations remain available at all times.</p></div>`;
}
function saveYoutubeFromStage(){const exercise=currentExercise(),input=$('#exerciseMotion .mb-youtube-link-row input');const id=extractYoutubeId(input?.value);if(!id)return toast('Enter a valid YouTube video link.','error');const map=parseMap();map[exercise.id]=id;saveMap(map);showMedia('youtube');toast('YouTube video saved for this exercise')}
function changeYoutube(){const exercise=currentExercise(),map=parseMap();delete map[exercise.id];saveMap(map);showMedia('youtube')}
function toast(message,type='success'){const el=$('#appToast');if(!el)return;el.textContent=message;el.dataset.type=type;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2500)}

const DAY_NAMES=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MEALS={
  non_vegetarian:{
    breakfast:['3 eggs + 2 chapati + curd','Oats + milk + whey + banana','Egg bhurji + roti + fruit','Omelette + whole-grain toast + milk','2 eggs + paneer wrap + fruit','Poha + eggs + curd','Idli + sambar + eggs'],
    lunch:['Chicken breast/curry + dal + 2 roti + vegetables','Fish + rice + salad + curd','Chicken tikka + roti + mixed vegetables','Lean mutton + controlled rice + salad','Chicken + rajma + roti + vegetables','Fish curry + dal + rice + vegetables','Chicken biryani portion + raita + salad'],
    snack:['Greek yogurt/curd + fruit','Whey + milk/water + fruit','Roasted chana + buttermilk','Apple + curd + nuts','Milk + whey','Fruit + 2 boiled eggs','Buttermilk + roasted chana'],
    dinner:['Chicken/fish + vegetables + 2 roti','Dal + chicken + salad','Fish curry + vegetables + roti','Lean mutton + vegetables + roti','Chicken soup/curry + salad + roti','Egg curry + dal + vegetables','Grilled chicken/fish + vegetables + small rice portion']
  },
  vegetarian:{
    breakfast:['Paneer bhurji + 2 roti + curd','Oats + milk + whey + fruit','Besan chilla + curd','Paneer wrap + fruit','Upma + curd + whey','Poha + paneer/curd','Idli + sambar + curd'],
    lunch:['Paneer + dal + 2 roti + vegetables','Rajma + rice + curd + salad','Chole + roti + curd','Tofu/paneer + rice + vegetables','Dal + paneer + roti + salad','Kadhi + chana + rice + vegetables','Vegetable biryani + raita + paneer'],
    snack:['Greek yogurt/curd + fruit','Whey + milk + fruit','Roasted chana + buttermilk','Fruit + paneer cubes','Milk + whey','Curd + nuts + fruit','Buttermilk + roasted chana'],
    dinner:['Paneer/tofu + vegetables + 2 roti','Dal + paneer + salad','Palak paneer + roti + salad','Tofu stir fry + controlled rice','Dal + mixed vegetables + roti','Paneer tikka + salad + roti','Chana/rajma + vegetables + small rice portion']
  },
  eggetarian:{
    breakfast:['3 eggs + 2 roti + curd','Oats + milk + whey + fruit','Egg bhurji + roti','Besan chilla + 2 eggs','Omelette + toast + fruit','Poha + eggs + curd','Idli + sambar + eggs'],
    lunch:['Egg curry + dal + 2 roti + vegetables','Rajma + rice + curd + 2 eggs','Chole + roti + salad + eggs','Paneer + dal + roti + vegetables','Egg bhurji + rice + salad','Kadhi + paneer + roti','Vegetable biryani + raita + 2 eggs'],
    snack:['Greek yogurt/curd + fruit','Whey + milk/water','Roasted chana + buttermilk','Fruit + 2 boiled eggs','Milk + whey','Curd + fruit','Buttermilk + roasted chana'],
    dinner:['Egg curry + vegetables + 2 roti','Dal + paneer + salad','Omelette + vegetables + roti','Paneer/tofu + controlled rice','Egg bhurji + dal + vegetables','Palak paneer + roti','Eggs + chana + vegetables']
  },
  vegan:{
    breakfast:['Oats + soy milk + fruit + peanut-free seeds','Tofu bhurji + 2 roti','Besan chilla + fruit','Poha + sprouts','Upma + tofu','Idli + sambar','Dalia + soy milk + fruit'],
    lunch:['Tofu + dal + 2 roti + vegetables','Rajma + rice + salad','Chole + roti + vegetables','Soy chunks + rice + salad','Dal + tofu + roti + vegetables','Sambar + rice + sprouts','Vegetable biryani + chana salad'],
    snack:['Fruit + roasted chana','Soy milk + plant protein','Sprouts chaat','Fruit + hummus','Plant protein shake','Roasted makhana + fruit','Buttermilk alternative + roasted chana'],
    dinner:['Tofu + vegetables + 2 roti','Dal + mixed vegetables + roti','Rajma + salad + small rice portion','Soy chunks + vegetables + roti','Chana + vegetables + roti','Tofu stir fry + rice','Dal + sprouts + vegetables']
  }
};
function dietKey(profile){const d=String(profile.diet||'non_vegetarian').toLowerCase();if(d.includes('vegan'))return'vegan';if(d.includes('egg'))return'eggetarian';if(d.includes('veg'))return'vegetarian';return'non_vegetarian'}
function forbidden(profile){return `${profile.allergies||''} ${profile.dislikes||''}`.toLowerCase().split(/[,;]+/).map(x=>x.trim()).filter(Boolean)}
function cleanMeal(text,banned){let out=text;for(const b of banned){if(!b)continue;const rx=new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'ig');out=out.replace(rx,'alternative')}return out.replace(/\s+/g,' ').trim()}
function buildDietPlan(){
  const state=Store.read(),profile=Coach?.profileFromState?Coach.profileFromState(state):{sex:state.config.sex,weight:state.weights?.[0]?.weight||state.config.startWeight,goal:state.config.goal||'fat_loss',diet:state.config.diet||'non_vegetarian',allergies:'',dislikes:'',steps:state.config.steps};
  const metrics=state.profile?.coach?.plan?.metrics||(Coach?.calculate?Coach.calculate(profile):{calories:state.config.calories,protein:state.config.protein,carbs:state.config.carbs||200,fat:state.config.fat||70,water:state.config.water});
  const kind=dietKey(profile),source=MEALS[kind],banned=forbidden(profile),scale=Math.max(.75,Math.min(1.4,(Number(metrics.calories)||2200)/2200));
  const plan={generatedAt:new Date().toISOString(),profile:{sex:profile.sex,age:profile.age,height:profile.height,weight:profile.weight,goal:profile.goal,diet:kind,cuisine:profile.cuisine||'indian_mixed',allergies:profile.allergies||'',dislikes:profile.dislikes||''},metrics:{calories:Math.round(metrics.calories),protein:Math.round(metrics.protein),carbs:Math.round(metrics.carbs),fat:Math.round(metrics.fat),water:metrics.water},days:[]};
  DAY_NAMES.forEach((day,i)=>{plan.days.push({day,meals:[
    {label:'Breakfast',text:cleanMeal(source.breakfast[i%source.breakfast.length],banned)},
    {label:'Lunch',text:cleanMeal(source.lunch[i%source.lunch.length],banned)},
    {label:'Snack',text:cleanMeal(source.snack[i%source.snack.length],banned)},
    {label:'Dinner',text:cleanMeal(source.dinner[i%source.dinner.length],banned)}
  ],portionNote:scale<.9?'Use the smaller end of listed starch/oil portions.':scale>1.1?'Add one extra controlled starch/protein serving to reach the calorie target.':'Use normal portions and adjust with the daily calorie target.'})});
  lastDietPlan=plan;try{localStorage.setItem(DIET_STORE,JSON.stringify(plan))}catch(_){ }
  return plan;
}
function goalLabel(goal){return({fat_loss:'Fat loss',recomp:'Body recomposition',muscle_gain:'Muscle gain',general:'General fitness'})[goal]||String(goal||'Fitness').replace(/_/g,' ')}
function ensureDietButton(){const head=$('#food > .section-head:first-child');if(!head)return;let actions=$('.mb-food-head-actions',head);const manage=$('#manageFoodsBtn');if(!actions){actions=document.createElement('div');actions.className='mb-food-head-actions';manage?.parentNode?.insertBefore(actions,manage);if(manage)actions.appendChild(manage)}if(!$('#weeklyDietPlanBtn')){const b=document.createElement('button');b.id='weeklyDietPlanBtn';b.type='button';b.className='secondary';b.textContent='Weekly diet plan';actions.insertBefore(b,actions.firstChild)}}
function openDiet(){const plan=buildDietPlan();let modal=$('#weeklyDietPlanModal');if(!modal){modal=document.createElement('div');modal.id='weeklyDietPlanModal';modal.className='mb-diet-modal';document.body.appendChild(modal)}modal.innerHTML=renderDiet(plan);modal.classList.remove('hidden');document.body.classList.add('modal-open')}
function renderDiet(plan){return `<section class="mb-diet-panel" role="dialog" aria-modal="true" aria-labelledby="weeklyDietTitle"><header class="mb-diet-head"><div><h2 id="weeklyDietTitle">Weekly Diet Plan</h2><p>${esc(goalLabel(plan.profile.goal))} · ${esc(plan.profile.diet.replace(/_/g,' '))} · personalized from MYBODY targets</p></div><button type="button" class="mb-diet-close" data-close-diet aria-label="Close">×</button></header><div class="mb-diet-targets"><div><span>Calories</span><strong>${plan.metrics.calories}</strong></div><div><span>Protein</span><strong>${plan.metrics.protein}g</strong></div><div><span>Carbs</span><strong>${plan.metrics.carbs}g</strong></div><div><span>Fat</span><strong>${plan.metrics.fat}g</strong></div></div><div class="mb-diet-actions"><button type="button" class="primary" data-download-diet>Download PDF</button><button type="button" class="secondary" data-regenerate-diet>Regenerate plan</button></div><div class="mb-diet-days">${plan.days.map(d=>`<article class="mb-diet-day"><h3>${d.day}</h3>${d.meals.map(m=>`<div class="mb-diet-meal"><span>${m.label}</span><p>${esc(m.text)}</p></div>`).join('')}<div class="mb-diet-meal"><span>Portions</span><p>${esc(d.portionNote)}</p></div></article>`).join('')}</div><aside class="mb-diet-instructions"><h3>Important instructions</h3><ul><li>Use this as a practical weekly framework, not a medical diet prescription.</li><li>Aim for the MYBODY calorie and protein targets across the full day; exact recipes and cooking oil can change calories substantially.</li><li>Keep protein spread across 3–4 meals and include vegetables/fruit daily.</li><li>Start with about ${esc(String(plan.metrics.water||'2.5'))} L water/day unless a clinician has advised a different fluid target.</li><li>For fat loss, prioritize consistency and avoid crash dieting. For muscle gain, increase portions gradually rather than using a large surplus.</li><li>Allergies/dislikes recorded in your profile should be avoided. Verify packaged-food labels and restaurant ingredients yourself.</li><li>If you have kidney disease, pregnancy, an eating disorder history, recent surgery, uncontrolled hypertension, cardiac disease, or another condition requiring medical nutrition therapy, review the plan with an appropriate clinician.</li></ul></aside></section>`}
function closeDiet(){const m=$('#weeklyDietPlanModal');if(m)m.classList.add('hidden');if(!document.querySelector('.mb-diet-modal:not(.hidden),.sheet-backdrop:not(.hidden),.media-lightbox:not(.hidden),.xp-modal:not(.hidden),.coach-modal:not(.hidden)'))document.body.classList.remove('modal-open')}
function pdfSafe(s){return String(s||'').normalize('NFKD').replace(/[^\x20-\x7E]/g,'-').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function wrapLine(text,max=86){const words=String(text||'').split(/\s+/),out=[];let line='';for(const w of words){const next=line?`${line} ${w}`:w;if(next.length>max&&line){out.push(line);line=w}else line=next}if(line)out.push(line);return out}
function dietLines(plan){const lines=['MYBODY 2.0 - WEEKLY DIET PLAN',`Generated: ${new Date(plan.generatedAt).toLocaleDateString()}`,`Goal: ${goalLabel(plan.profile.goal)} | Diet: ${plan.profile.diet.replace(/_/g,' ')}`,`Targets: ${plan.metrics.calories} kcal | Protein ${plan.metrics.protein} g | Carbs ${plan.metrics.carbs} g | Fat ${plan.metrics.fat} g | Water ${plan.metrics.water||'-'} L`,''];plan.days.forEach(d=>{lines.push(d.day.toUpperCase());d.meals.forEach(m=>wrapLine(`${m.label}: ${m.text}`).forEach(x=>lines.push(x)));wrapLine(`Portions: ${d.portionNote}`).forEach(x=>lines.push(x));lines.push('')});lines.push('IMPORTANT INSTRUCTIONS');['Use this as a practical weekly framework, not a medical diet prescription.','Aim for the MYBODY daily calorie and protein targets; cooking oil and recipes can materially change calories.','Spread protein across 3-4 meals and include vegetables/fruit daily.','Avoid recorded allergies/dislikes and verify packaged-food labels yourself.','For fat loss, avoid crash dieting. For muscle gain, increase portions gradually.','If you have a condition requiring medical nutrition therapy, review the plan with an appropriate clinician.'].forEach(x=>wrapLine('- '+x).forEach(y=>lines.push(y)));return lines}
function buildPdf(lines){const perPage=48,pages=[];for(let i=0;i<lines.length;i+=perPage)pages.push(lines.slice(i,i+perPage));const objs=[];const pageIds=pages.map((_,i)=>4+i*2),contentIds=pages.map((_,i)=>5+i*2);objs[1]='<< /Type /Catalog /Pages 2 0 R >>';objs[2]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';pages.forEach((page,i)=>{const pageId=pageIds[i],contentId=contentIds[i];const stream=['BT','/F1 10 Tf','40 800 Td','14 TL',...page.map((line,j)=>`${j?'T* ':''}(${pdfSafe(line)}) Tj`),'ET'].join('\n');objs[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;objs[contentId]=`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`});let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objs.length;i++){offsets[i]=new TextEncoder().encode(pdf).length;pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`}const xref=new TextEncoder().encode(pdf).length;pdf+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;for(let i=1;i<objs.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return new Blob([pdf],{type:'application/pdf'})}
function downloadDiet(){const plan=lastDietPlan||buildDietPlan(),blob=buildPdf(dietLines(plan)),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`MYBODY-Weekly-Diet-Plan-${Store.localDate()}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Weekly diet plan PDF downloaded')}
function regenerateDiet(){lastDietPlan=buildDietPlan();const modal=$('#weeklyDietPlanModal');if(modal)modal.innerHTML=renderDiet(lastDietPlan);toast('Diet plan regenerated')}
function scheduleMedia(){setTimeout(ensureMediaSwitch,60);setTimeout(ensureMediaSwitch,180)}
function init(){ensureDietButton();document.addEventListener('click',e=>{if(e.target.closest('#weeklyDietPlanBtn'))openDiet();if(e.target.closest('[data-close-diet]'))closeDiet();if(e.target.closest('[data-download-diet]'))downloadDiet();if(e.target.closest('[data-regenerate-diet]'))regenerateDiet();if(e.target.closest('[data-save-youtube]'))saveYoutubeFromStage();if(e.target.closest('[data-change-youtube]'))changeYoutube();if(e.target.closest('[data-action="close-exercise-media"]')){offlineMarkup='';offlineExercise=''}scheduleMedia()},true);window.addEventListener('mybody:state',()=>setTimeout(ensureDietButton,100));window.addEventListener('mybody:tabchange',()=>setTimeout(ensureDietButton,100));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#weeklyDietPlanModal')?.classList.contains('hidden'))closeDiet()});}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
window.MyBodyMediaDietUpgrade=Object.freeze({buildDietPlan,downloadDiet,youtubeIdFor});
})();
