(function(){
'use strict';
const Store=window.MyBodyStore;
if(!Store)return;

const classify=name=>{
  const n=String(name||'').toLowerCase();
  return {
    plant:/dal|lentil|rajma|bean|chana|chickpea|sprout|vegetable|veggie|salad|fruit|apple|banana|orange|berries|oats|dalia|whole.?grain|brown rice|roti|chapati|quinoa|millet|nuts|seed|tofu|soy|hummus|makhana|poha|upma|idli|sambar|karela|bhindi|eggplant|brinjal/.test(n),
    redProcessed:/mutton|beef|lamb|bacon|sausage|salami|ham|pepperoni|processed meat/.test(n),
    supplement:/whey|protein powder|protein shake|mass gainer/.test(n)
  };
};

function todayFoods(){
  const state=Store.read();
  const key=Store.localDate();
  const meals=state.nutrition?.[key]?.meals||{};
  return Object.values(meals).flat().filter(Boolean);
}

function summary(){
  const foods=todayFoods();
  let plant=0,redProcessed=0,supplement=0;
  foods.forEach(food=>{
    const c=classify(food?.name||food?.food||food?.label||'');
    if(c.plant)plant++;
    if(c.redProcessed)redProcessed++;
    if(c.supplement)supplement++;
  });
  let message='Build meals around vegetables, beans/lentils, whole grains and fruit.';
  if(foods.length){
    if(redProcessed)message='Red or processed meat was logged today. Consider making the next meal plant-centered.';
    else if(supplement)message='A protein supplement was logged. Treat supplements as optional convenience rather than the center of the diet.';
    else if(plant>=Math.max(3,Math.ceil(foods.length/2)))message='Good plant-food variety today. Keep whole plant foods at the center of most meals.';
    else message='Add more plant-food variety today: dal/beans, vegetables, fruit, whole grains, nuts or seeds.';
  }
  return {plant,message};
}

function addCard(){
  const food=document.querySelector('#food');
  if(!food||document.querySelector('#wholeFoodFocusCard'))return;
  const grid=food.querySelector('.nutrition-grid');
  if(!grid)return;
  const card=document.createElement('section');
  card.id='wholeFoodFocusCard';
  card.className='card';
  card.style.margin='12px 0';
  card.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div><span style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7">WHOLE-FOOD FOCUS</span><h3 style="margin:4px 0 6px">Fiber and food quality first</h3></div><span id="wholeFoodPlantCount" class="pill">0 plant foods</span></div><p id="wholeFoodMessage" style="margin:4px 0 10px;line-height:1.45"></p><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:13px"><div><b>Prioritize</b><br><span style="opacity:.75">Dal/beans, vegetables, fruit, whole grains, nuts and seeds</span></div><div><b>De-emphasize</b><br><span style="opacity:.75">Red/processed meat and routine protein shakes</span></div></div><small style="display:block;margin-top:10px;opacity:.65">Proteinaholic-inspired principles. General wellness guidance, not medical nutrition therapy.</small>';
  grid.insertAdjacentElement('afterend',card);
  refreshCard();
}

function refreshCard(){
  const s=summary();
  const count=document.querySelector('#wholeFoodPlantCount');
  const msg=document.querySelector('#wholeFoodMessage');
  if(count)count.textContent=s.plant+' plant food'+(s.plant===1?'':'s');
  if(msg)msg.textContent=s.message;
}

function transformMeal(text){
  const t=String(text||'');
  if(/whey|protein shake|protein powder/i.test(t))return 'Whole fruit + roasted chana + nuts/seeds';
  if(/mutton|beef|lamb|chicken|fish/i.test(t))return 'Dal/rajma/chana + mixed vegetables + whole grain';
  if(/\begg|omelette|bhurji/i.test(t))return 'Besan/moong chilla + vegetables + fruit';
  return t.replace(/paneer/ig,'tofu/beans');
}

function alignDietModal(){
  const modal=document.querySelector('#weeklyDietPlanModal');
  if(!modal||modal.dataset.wholeFoodAligned==='1')return;
  modal.querySelectorAll('.mb-diet-meal p').forEach(p=>{p.textContent=transformMeal(p.textContent)});
  const list=modal.querySelector('.mb-diet-instructions ul');
  if(list)list.innerHTML='<li>Build most meals around vegetables, legumes, whole grains and fruit.</li><li>Focus on fiber and overall food quality before trying to push protein higher.</li><li>Use your saved protein target as a target, not a number you must exceed.</li><li>Keep red and processed meat occasional.</li><li>Protein powders and shakes are optional, not required.</li><li>Avoid recorded allergies/intolerances and use professional medical nutrition advice when needed.</li>';
  modal.dataset.wholeFoodAligned='1';
}

function softenProteinCoachMessages(){
  document.querySelectorAll('.coach-insight,.xp-insight,.p2-insight,.p3-insight,.p4-insight,.p5-insight').forEach(node=>{
    if(/protein is your clearest opportunity|add one protein-rich serving/i.test(node.textContent||'')){
      const title=node.querySelector('h3,strong,b');
      const body=node.querySelector('p,small');
      if(title)title.textContent='Improve food quality first';
      if(body)body.textContent='Before adding extra protein, make the next meal richer in vegetables, beans/lentils, whole grains, fruit, nuts or seeds. Protein supplements are optional.';
    }
  });
}

let obs;
function boot(){
  addCard();
  refreshCard();
  alignDietModal();
  softenProteinCoachMessages();
  obs=new MutationObserver(()=>{
    addCard();
    alignDietModal();
    softenProteinCoachMessages();
  });
  obs.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('mybody:state',()=>setTimeout(refreshCard,30));
  document.addEventListener('click',()=>setTimeout(()=>{refreshCard();alignDietModal();softenProteinCoachMessages()},60),true);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
