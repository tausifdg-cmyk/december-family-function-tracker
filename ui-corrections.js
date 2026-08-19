/* MYBODY 2.0 UI corrections: searchable food picker + internet nutrition lookup. */
(function(){
'use strict';
const Store=window.MyBodyStore;
if(!Store)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const USDA='https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY';
let menu=null,activeInput=null,searchTimer=null,requestSeq=0,suppress=false;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
const round=(v,p=1)=>Math.round(num(v)*10**p)/10**p;
function state(){return Store.read()}
function allFoods(){return [...(Array.isArray(window.FOOD_DB)?window.FOOD_DB:[]),...(state().customFoods||[])]}
function norm(v){return String(v||'').trim().toLowerCase()}
function searchable(food){return [food.name,...(Array.isArray(food.aliases)?food.aliases:[])].map(norm).filter(Boolean)}
function localMatches(query){
  const q=norm(query);if(!q)return allFoods().slice(0,10);
  return allFoods().map(food=>{
    const hay=searchable(food);let score=0;
    if(norm(food.name)===q)score=100;
    else if(norm(food.name).startsWith(q))score=80;
    else if(hay.some(x=>x===q))score=70;
    else if(hay.some(x=>x.startsWith(q)))score=55;
    else if(hay.some(x=>x.includes(q)))score=35;
    return {food,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(a.food.name).localeCompare(String(b.food.name))).slice(0,10).map(x=>x.food);
}
function hasExact(query){const q=norm(query);return allFoods().some(f=>searchable(f).includes(q))}
function hasPrefix(query){const q=norm(query);return q.length>=2&&allFoods().some(f=>searchable(f).some(x=>x.startsWith(q)))}
function ensureMenu(){
  if(menu)return menu;
  menu=document.createElement('div');menu.className='mb-food-search-menu hidden';menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Food suggestions');document.body.appendChild(menu);
  menu.addEventListener('pointerdown',e=>e.preventDefault());
  menu.addEventListener('click',handleMenuClick);
  return menu;
}
function positionMenu(input){
  const m=ensureMenu(),r=input.getBoundingClientRect(),margin=8,width=Math.min(Math.max(r.width,290),window.innerWidth-margin*2);let left=Math.min(Math.max(margin,r.left),window.innerWidth-width-margin);const below=window.innerHeight-r.bottom;const placeAbove=below<220&&r.top>240;m.style.width=`${width}px`;m.style.left=`${left}px`;m.style.top=placeAbove?'auto':`${Math.min(window.innerHeight-72,r.bottom+6)}px`;m.style.bottom=placeAbove?`${Math.max(8,window.innerHeight-r.top+6)}px`:'auto';}
function closeMenu(){if(menu)menu.classList.add('hidden');activeInput=null;clearTimeout(searchTimer)}
function inputContext(input){const row=input.closest('.food-row');return row?{type:'meal',meal:row.dataset.meal,index:row.dataset.index}:{type:'manager'}}
function findContextInput(ctx){if(ctx.type==='manager')return $('#customFoodName');return $(`.food-row[data-meal="${CSS.escape(String(ctx.meal))}"][data-index="${CSS.escape(String(ctx.index))}"] .food-name`)}
function optionHtml(food,source='MYBODY'){return `<button type="button" class="mb-food-option" data-food-name="${esc(food.name)}"><span><strong>${esc(food.name)}</strong><small>${Math.round(num(food.calories))} kcal · ${round(food.protein)}g protein / 100g</small></span><span>${esc(source)}</span></button>`}
function renderLocal(input,query){
  activeInput=input;const m=ensureMenu(),matches=localMatches(query);m.innerHTML=matches.map(f=>optionHtml(f,'MYBODY')).join('');
  const q=String(query||'').trim();
  if(q.length>=3&&!hasExact(q))m.insertAdjacentHTML('beforeend',`<button type="button" class="mb-food-internet" data-search-internet="${esc(q)}"><span><strong>Find “${esc(q)}” online</strong><small>Search USDA FoodData Central and review nutrition before saving.</small></span><span>Internet</span></button>`);
  if(!matches.length&&q.length<3)m.innerHTML='<div class="mb-food-empty">Type at least 3 characters to search foods.</div>';
  m.classList.remove('hidden');positionMenu(input);
  if(q.length>=3&&!hasExact(q)&&!hasPrefix(q)){clearTimeout(searchTimer);searchTimer=setTimeout(()=>searchInternet(q,input),700)}
}
function nutrient(food,names,unit){
  const list=Array.isArray(food?.foodNutrients)?food.foodNutrients:[];
  for(const n of list){const name=String(n.nutrientName||n.nutrient?.name||'').toLowerCase(),u=String(n.unitName||n.nutrient?.unitName||'').toUpperCase();if(names.some(x=>name===x||name.includes(x))&&(!unit||u===unit))return num(n.value??n.amount)}
  return 0;
}
function mapUsda(food){
  const calories=nutrient(food,['energy'],'KCAL');
  const protein=nutrient(food,['protein']);
  const carbs=nutrient(food,['carbohydrate, by difference','carbohydrate']);
  const fat=nutrient(food,['total lipid (fat)','total fat','lipid']);
  if(!(calories>0)||!food?.description)return null;
  return {name:String(food.description).replace(/\s+/g,' ').trim(),aliases:[],calories:round(calories),protein:round(protein),carbs:round(carbs),fat:round(fat),defaultGrams:100,source:'USDA FoodData Central',sourceId:food.fdcId};
}
async function searchInternet(query,input=activeInput){
  if(!input||input!==activeInput||navigator.onLine===false)return;
  const mySeq=++requestSeq,ctx=inputContext(input),m=ensureMenu();m.classList.remove('hidden');positionMenu(input);m.insertAdjacentHTML('beforeend','<div class="mb-food-loading" data-usda-loading>Searching USDA nutrition…</div>');
  try{
    const url=`${USDA}&query=${encodeURIComponent(query)}&pageSize=8`;
    const response=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});if(!response.ok)throw new Error('lookup failed');const data=await response.json();if(mySeq!==requestSeq||activeInput!==input)return;
    const raw=Array.isArray(data.foods)?data.foods:[];const generic=raw.filter(x=>x.dataType!=='Branded'),ordered=generic.length?generic:raw;const results=ordered.map(mapUsda).filter(Boolean).slice(0,6);renderInternetResults(input,query,ctx,results);
  }catch(_){if(mySeq!==requestSeq||activeInput!==input)return;const loading=$('[data-usda-loading]',m);if(loading)loading.outerHTML='<div class="mb-food-empty">Online nutrition lookup is temporarily unavailable. You can still use the local food database.</div>'}
}
function renderInternetResults(input,query,ctx,results){
  const m=ensureMenu();$$('[data-usda-loading]',m).forEach(x=>x.remove());$$('[data-usda-result],.mb-food-empty[data-internet-empty]',m).forEach(x=>x.remove());
  if(!results.length){m.insertAdjacentHTML('beforeend','<div class="mb-food-empty" data-internet-empty>No reliable USDA match found. Try a more specific food name.</div>');return}
  m.insertAdjacentHTML('beforeend',results.map((food,i)=>`<button type="button" class="mb-food-option" data-usda-result="${i}"><span><strong>${esc(food.name)}</strong><small>${Math.round(food.calories)} kcal · ${round(food.protein)}g P · ${round(food.carbs)}g C · ${round(food.fat)}g F / 100g</small></span><span>USDA</span></button>`).join(''));
  m._internet={query,ctx,results};positionMenu(input);
}
function renderConfirm(food,ctx){
  const m=ensureMenu();m.innerHTML=`<div class="mb-food-confirm"><div><h4>${esc(food.name)}</h4><p>Review the nutrition before MYBODY saves this food to your personal database.</p></div><div class="mb-food-confirm-macros"><span><b>${Math.round(food.calories)}</b>kcal</span><span><b>${round(food.protein)}</b>protein</span><span><b>${round(food.carbs)}</b>carbs</span><span><b>${round(food.fat)}</b>fat</span></div><p class="mb-food-source">Source: USDA FoodData Central · values normalized per 100 g.</p><div class="mb-food-confirm-actions"><button type="button" class="primary" data-confirm-food>Use & save</button><button type="button" class="secondary" data-cancel-food>Back</button></div></div>`;m._confirm={food,ctx};}
function selectLocal(name){const input=activeInput;if(!input)return;const food=allFoods().find(f=>norm(f.name)===norm(name));if(!food)return;applyFood(input,food);}
function applyFood(input,food){
  suppress=true;input.value=food.name;input.removeAttribute('list');input.dispatchEvent(new Event('change',{bubbles:true}));input.dispatchEvent(new Event('input',{bubbles:true}));suppress=false;closeMenu();input.focus({preventScroll:true});
}
function saveInternetFood(food,ctx){
  const next=state();next.customFoods=Array.isArray(next.customFoods)?next.customFoods:[];const clean={name:food.name,aliases:[],calories:round(food.calories),protein:round(food.protein),carbs:round(food.carbs),fat:round(food.fat),defaultGrams:100,source:food.source,sourceId:food.sourceId};const ix=next.customFoods.findIndex(x=>norm(x.name)===norm(clean.name));if(ix>=0)next.customFoods[ix]=clean;else next.customFoods.push(clean);Store.write(next);
  setTimeout(()=>{const input=findContextInput(ctx);if(ctx.type==='manager'){
      if(input)input.value=clean.name;const serving=$('#customFoodServing'),cal=$('#customFoodCalories'),pro=$('#customFoodProtein'),carb=$('#customFoodCarbs'),fat=$('#customFoodFat');if(serving)serving.value=100;if(cal)cal.value=clean.calories;if(pro)pro.value=clean.protein;if(carb)carb.value=clean.carbs;if(fat)fat.value=clean.fat;input?.focus({preventScroll:true});
    }else if(input)applyFood(input,clean);
  },120);
  closeMenu();
}
function handleMenuClick(e){
  const local=e.target.closest('[data-food-name]');if(local)return selectLocal(local.dataset.foodName);
  const search=e.target.closest('[data-search-internet]');if(search&&activeInput)return searchInternet(search.dataset.searchInternet,activeInput);
  const result=e.target.closest('[data-usda-result]');if(result&&menu?._internet){const food=menu._internet.results[Number(result.dataset.usdaResult)];if(food)renderConfirm(food,menu._internet.ctx);return}
  if(e.target.closest('[data-confirm-food]')&&menu?._confirm){saveInternetFood(menu._confirm.food,menu._confirm.ctx);return}
  if(e.target.closest('[data-cancel-food]')&&activeInput){renderLocal(activeInput,activeInput.value)}
}
function onInput(e){const input=e.target.closest('.food-name,#customFoodName');if(!input||suppress)return;input.removeAttribute('list');renderLocal(input,input.value)}
function onFocus(e){const input=e.target.closest('.food-name,#customFoodName');if(!input)return;input.setAttribute('autocomplete','off');input.removeAttribute('list');renderLocal(input,input.value)}
function onKeydown(e){if(!activeInput||menu?.classList.contains('hidden'))return;if(e.key==='Escape'){closeMenu();activeInput?.focus();return}if(e.key==='Enter'){const first=$('.mb-food-option',menu);if(first){e.preventDefault();first.click()}}}
function refreshInputs(){$$('.food-name,#customFoodName').forEach(input=>{input.setAttribute('autocomplete','off');input.removeAttribute('list');input.setAttribute('aria-autocomplete','list')})}
function init(){ensureMenu();refreshInputs();document.addEventListener('input',onInput,true);document.addEventListener('focusin',onFocus,true);document.addEventListener('keydown',onKeydown,true);document.addEventListener('pointerdown',e=>{if(!e.target.closest('.mb-food-search-menu,.food-name,#customFoodName'))closeMenu()},true);window.addEventListener('resize',()=>{if(activeInput&&!menu.classList.contains('hidden'))positionMenu(activeInput)});window.addEventListener('scroll',()=>{if(activeInput&&!menu.classList.contains('hidden'))positionMenu(activeInput)},true);window.addEventListener('mybody:state',()=>setTimeout(refreshInputs,100));document.addEventListener('click',e=>{if(e.target.closest('[data-tab="food"],#food-tab,[data-action="add-food"],#manageFoodsBtn'))setTimeout(refreshInputs,140)},true)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
window.MyBodyUICorrections=Object.freeze({localMatches,searchInternet});
})();
