/* MYBODY 2.0 weekly diet hotfix: correct diet selection + working regeneration. */
(function(){
'use strict';
const Store=window.MyBodyStore,Coach=window.MyBodyCoach;
if(!Store||!Coach)return;
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const KEY='mybody.weekly-diet-plan.v2';
let variation=0,lastPlan=null;

const OPTIONS={
  non_vegetarian:{
    breakfast:['3 eggs + 2 chapati + curd','Egg bhurji + 2 roti + fruit','Oats + milk + whey + banana','Omelette + whole-grain toast + milk','2 eggs + paneer wrap + fruit','Poha + 2 eggs + curd','Idli + sambar + 2 eggs','Vegetable upma + eggs + curd','Boiled eggs + roti + fruit','Masala omelette + chapati + curd'],
    lunch:['Chicken curry + dal + 2 roti + vegetables','Fish + rice + salad + curd','Chicken tikka + roti + mixed vegetables','Lean mutton + controlled rice + salad','Chicken + rajma + roti + vegetables','Fish curry + dal + rice + vegetables','Chicken biryani portion + raita + salad','Grilled chicken + dal + roti + salad','Egg curry + chicken soup + roti + vegetables','Lean mutton curry + roti + vegetables'],
    snack:['Greek yogurt/curd + fruit','Whey + milk/water + fruit','Roasted chana + buttermilk','Apple + curd + nuts','Milk + whey','Fruit + 2 boiled eggs','Buttermilk + roasted chana','Boiled eggs + fruit','Curd + banana','Whey + banana + water'],
    dinner:['Chicken/fish + vegetables + 2 roti','Dal + chicken + salad','Fish curry + vegetables + roti','Lean mutton + vegetables + roti','Chicken soup/curry + salad + roti','Egg curry + dal + vegetables','Grilled chicken/fish + vegetables + small rice portion','Chicken tikka + salad + roti','Fish + dal + vegetables','Lean mutton + salad + controlled rice']
  },
  vegetarian:{
    breakfast:['Paneer bhurji + 2 roti + curd','Oats + milk + whey + fruit','Besan chilla + curd','Paneer wrap + fruit','Upma + curd + whey','Poha + paneer/curd','Idli + sambar + curd','Dalia + milk + fruit','Moong chilla + paneer','Vegetable poha + curd'],
    lunch:['Paneer + dal + 2 roti + vegetables','Rajma + rice + curd + salad','Chole + roti + curd','Tofu/paneer + rice + vegetables','Dal + paneer + roti + salad','Kadhi + chana + rice + vegetables','Vegetable biryani + raita + paneer','Palak paneer + roti + salad','Mixed dal + rice + curd','Soy chunks + roti + vegetables'],
    snack:['Greek yogurt/curd + fruit','Whey + milk + fruit','Roasted chana + buttermilk','Fruit + paneer cubes','Milk + whey','Curd + nuts + fruit','Buttermilk + roasted chana','Paneer cubes + fruit','Roasted makhana + curd','Lassi without added sugar + roasted chana'],
    dinner:['Paneer/tofu + vegetables + 2 roti','Dal + paneer + salad','Palak paneer + roti + salad','Tofu stir fry + controlled rice','Dal + mixed vegetables + roti','Paneer tikka + salad + roti','Chana/rajma + vegetables + small rice portion','Soy chunks + vegetables + roti','Paneer curry + salad + roti','Dal khichdi + curd + salad']
  },
  eggetarian:{
    breakfast:['3 eggs + 2 roti + curd','Oats + milk + whey + fruit','Egg bhurji + roti','Besan chilla + 2 eggs','Omelette + toast + fruit','Poha + eggs + curd','Idli + sambar + eggs','Boiled eggs + upma','Egg wrap + fruit','Masala omelette + chapati'],
    lunch:['Egg curry + dal + 2 roti + vegetables','Rajma + rice + curd + 2 eggs','Chole + roti + salad + eggs','Paneer + dal + roti + vegetables','Egg bhurji + rice + salad','Kadhi + paneer + roti','Vegetable biryani + raita + 2 eggs','Egg curry + rice + vegetables','Paneer + egg bhurji + roti','Dal + eggs + roti + salad'],
    snack:['Greek yogurt/curd + fruit','Whey + milk/water','Roasted chana + buttermilk','Fruit + 2 boiled eggs','Milk + whey','Curd + fruit','Buttermilk + roasted chana','2 boiled eggs + fruit','Paneer cubes + fruit','Whey + banana'],
    dinner:['Egg curry + vegetables + 2 roti','Dal + paneer + salad','Omelette + vegetables + roti','Paneer/tofu + controlled rice','Egg bhurji + dal + vegetables','Palak paneer + roti','Eggs + chana + vegetables','Egg curry + salad + roti','Paneer + egg stir fry + vegetables','Dal + 2 eggs + small rice portion']
  },
  vegan:{
    breakfast:['Oats + soy milk + fruit + seeds','Tofu bhurji + 2 roti','Besan chilla + fruit','Poha + sprouts','Upma + tofu','Idli + sambar','Dalia + soy milk + fruit','Moong chilla + tofu','Oats + plant protein + banana','Sprouts + poha + fruit'],
    lunch:['Tofu + dal + 2 roti + vegetables','Rajma + rice + salad','Chole + roti + vegetables','Soy chunks + rice + salad','Dal + tofu + roti + vegetables','Sambar + rice + sprouts','Vegetable biryani + chana salad','Tofu curry + roti + salad','Mixed dal + rice + vegetables','Soy chunks + roti + salad'],
    snack:['Fruit + roasted chana','Soy milk + plant protein','Sprouts chaat','Fruit + hummus','Plant protein shake','Roasted makhana + fruit','Roasted chana + fruit','Soy yogurt + fruit','Hummus + vegetables','Plant protein + banana'],
    dinner:['Tofu + vegetables + 2 roti','Dal + mixed vegetables + roti','Rajma + salad + small rice portion','Soy chunks + vegetables + roti','Chana + vegetables + roti','Tofu stir fry + rice','Dal + sprouts + vegetables','Tofu curry + salad + roti','Chana masala + vegetables','Dal khichdi + salad']
  }
};

function normalizeDiet(value){
  const d=String(value||'non_vegetarian').trim().toLowerCase().replace(/[\s-]+/g,'_');
  if(['non_vegetarian','nonvegetarian','non_veg','nonveg','omnivore','mixed'].includes(d))return'non_vegetarian';
  if(['vegan','plant_based','plantbased'].includes(d))return'vegan';
  if(['eggetarian','eggitarian','ovo_vegetarian','egg_vegetarian'].includes(d)||d.includes('egg'))return'eggetarian';
  if(['vegetarian','veg','lacto_vegetarian'].includes(d))return'vegetarian';
  if(d.includes('non')&&d.includes('veg'))return'non_vegetarian';
  return'non_vegetarian';
}
function profile(){const state=Store.read();return Coach.profileFromState(state)}
function currentMetrics(p){const state=Store.read();return state.profile?.coach?.plan?.metrics||Coach.calculate(p)}
function banned(p){return `${p.allergies||''},${p.dislikes||''}`.toLowerCase().split(/[,;]+/).map(x=>x.trim()).filter(Boolean)}
function clean(text,ban){let out=text;for(const b of ban){if(!b)continue;const rx=new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig');out=out.replace(rx,'alternative')}return out.replace(/\s+/g,' ').trim()}
function pick(arr,index,shift){return arr[(index+shift)%arr.length]}
function labelDiet(kind){return kind==='non_vegetarian'?'Non-vegetarian':kind==='eggetarian'?'Eggetarian':kind.charAt(0).toUpperCase()+kind.slice(1)}
function goalLabel(goal){return({fat_loss:'Fat loss',recomp:'Body recomposition',muscle_gain:'Muscle gain',general:'General fitness'})[goal]||String(goal||'Fitness').replace(/_/g,' ')}
function buildPlan(forceNext=false){
  const p=profile(),kind=normalizeDiet(p.diet),src=OPTIONS[kind],metrics=currentMetrics(p),ban=banned(p);
  if(forceNext)variation=(variation+1)%src.breakfast.length;
  const scale=Math.max(.75,Math.min(1.4,(Number(metrics.calories)||2200)/2200));
  const plan={generatedAt:new Date().toISOString(),variation,profile:{...p,diet:kind},metrics:{calories:Math.round(metrics.calories),protein:Math.round(metrics.protein),carbs:Math.round(metrics.carbs),fat:Math.round(metrics.fat),water:metrics.water},days:[]};
  DAYS.forEach((day,i)=>plan.days.push({day,meals:[
    {label:'Breakfast',text:clean(pick(src.breakfast,i,variation),ban)},
    {label:'Lunch',text:clean(pick(src.lunch,i,variation*2),ban)},
    {label:'Snack',text:clean(pick(src.snack,i,variation*3),ban)},
    {label:'Dinner',text:clean(pick(src.dinner,i,variation*4),ban)}
  ],portionNote:scale<.9?'Use the smaller end of starch/oil portions.':scale>1.1?'Add one extra controlled starch/protein serving to reach the calorie target.':'Use normal portions and adjust to the daily calorie target.'}));
  lastPlan=plan;try{localStorage.setItem(KEY,JSON.stringify(plan))}catch(_){ }
  return plan;
}
function render(plan){return `<section class="mb-diet-panel" role="dialog" aria-modal="true" aria-labelledby="weeklyDietTitle"><header class="mb-diet-head"><div><h2 id="weeklyDietTitle">Weekly Diet Plan</h2><p>${esc(goalLabel(plan.profile.goal))} · ${esc(labelDiet(plan.profile.diet))} · personalized from MYBODY targets</p></div><button type="button" class="mb-diet-close" data-close-diet aria-label="Close">×</button></header><div class="mb-diet-targets"><div><span>Calories</span><strong>${plan.metrics.calories}</strong></div><div><span>Protein</span><strong>${plan.metrics.protein}g</strong></div><div><span>Carbs</span><strong>${plan.metrics.carbs}g</strong></div><div><span>Fat</span><strong>${plan.metrics.fat}g</strong></div></div><div class="mb-diet-actions"><button type="button" class="primary" data-diet-fix-download>Download PDF</button><button type="button" class="secondary" data-diet-fix-regenerate>Regenerate plan</button></div><div class="mb-diet-days">${plan.days.map(d=>`<article class="mb-diet-day"><h3>${d.day}</h3>${d.meals.map(m=>`<div class="mb-diet-meal"><span>${m.label}</span><p>${esc(m.text)}</p></div>`).join('')}<div class="mb-diet-meal"><span>Portions</span><p>${esc(d.portionNote)}</p></div></article>`).join('')}</div><aside class="mb-diet-instructions"><h3>Important instructions</h3><ul><li>This plan uses your currently saved diet preference: <b>${esc(labelDiet(plan.profile.diet))}</b>.</li><li>Use this as a practical weekly framework, not a medical diet prescription.</li><li>Aim for your MYBODY calorie and protein targets across the whole day.</li><li>Cooking oil, sauces, recipes and restaurant portions can materially change calories.</li><li>Keep protein spread across 3–4 meals and include vegetables/fruit daily.</li><li>Avoid recorded allergies/intolerances and disliked foods.</li><li>If you need medical nutrition therapy, review the plan with an appropriate clinician.</li></ul></aside></section>`}
function refreshModal(next=false){const modal=$('#weeklyDietPlanModal');if(!modal||modal.classList.contains('hidden'))return;const plan=buildPlan(next);modal.innerHTML=render(plan)}

function pdfSafe(s){return String(s||'').normalize('NFKD').replace(/[^\x20-\x7E]/g,'-').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function wrap(text,max=86){const words=String(text||'').split(/\s+/),out=[];let line='';for(const w of words){const n=line?`${line} ${w}`:w;if(n.length>max&&line){out.push(line);line=w}else line=n}if(line)out.push(line);return out}
function pdfLines(plan){const lines=['MYBODY 2.0 - WEEKLY DIET PLAN',`Generated: ${new Date(plan.generatedAt).toLocaleDateString()}`,`Goal: ${goalLabel(plan.profile.goal)} | Diet: ${labelDiet(plan.profile.diet)}`,`Targets: ${plan.metrics.calories} kcal | Protein ${plan.metrics.protein} g | Carbs ${plan.metrics.carbs} g | Fat ${plan.metrics.fat} g | Water ${plan.metrics.water||'-'} L`,''];plan.days.forEach(d=>{lines.push(d.day.toUpperCase());d.meals.forEach(m=>wrap(`${m.label}: ${m.text}`).forEach(x=>lines.push(x)));wrap(`Portions: ${d.portionNote}`).forEach(x=>lines.push(x));lines.push('')});lines.push('IMPORTANT INSTRUCTIONS');['This plan follows the currently saved diet preference.','Use this as a practical weekly framework, not a medical diet prescription.','Aim for the MYBODY calorie and protein targets across the whole day.','Cooking oil and recipes can materially change calories.','Avoid recorded allergies/intolerances and disliked foods.'].forEach(x=>wrap('- '+x).forEach(y=>lines.push(y)));return lines}
function makePdf(lines){const per=48,pages=[];for(let i=0;i<lines.length;i+=per)pages.push(lines.slice(i,i+per));const objs=[],pageIds=pages.map((_,i)=>4+i*2),contentIds=pages.map((_,i)=>5+i*2);objs[1]='<< /Type /Catalog /Pages 2 0 R >>';objs[2]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';pages.forEach((page,i)=>{const stream=['BT','/F1 10 Tf','40 800 Td','14 TL',...page.map((line,j)=>`${j?'T* ':''}(${pdfSafe(line)}) Tj`),'ET'].join('\n');objs[pageIds[i]]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;objs[contentIds[i]]=`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`});let pdf='%PDF-1.4\n',offs=[0];for(let i=1;i<objs.length;i++){offs[i]=new TextEncoder().encode(pdf).length;pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`}const xref=new TextEncoder().encode(pdf).length;pdf+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;for(let i=1;i<objs.length;i++)pdf+=`${String(offs[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return new Blob([pdf],{type:'application/pdf'})}
function download(){const plan=lastPlan||buildPlan(false),blob=makePdf(pdfLines(plan)),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`MYBODY-Weekly-Diet-Plan-${Store.localDate()}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)}
function toast(msg){const el=$('#appToast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}

document.addEventListener('click',e=>{
  if(e.target.closest('#weeklyDietPlanBtn'))setTimeout(()=>refreshModal(false),0);
  if(e.target.closest('[data-diet-fix-regenerate]')){refreshModal(true);toast('Diet plan regenerated with new meal options')}
  if(e.target.closest('[data-diet-fix-download]')){download();toast('Weekly diet plan PDF downloaded')}
},false);

window.addEventListener('mybody:state',()=>{const modal=$('#weeklyDietPlanModal');if(modal&&!modal.classList.contains('hidden'))setTimeout(()=>refreshModal(false),60)});
window.MyBodyDietPlanFix=Object.freeze({normalizeDiet,buildPlan,refresh:refreshModal});
})();
