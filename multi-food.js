/* Multiple-food meal logger. Keeps the existing single-food data compatible while allowing unlimited foods per meal. */
(function(){
  const meals=['breakfast','lunch','dinner'];
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const db=()=>window.FOOD_DB||[];
  const find=s=>window.foodCalculator?.findFood?.(s)||db().find(f=>f.name.toLowerCase()===String(s||'').toLowerCase());
  const calc=(name,grams)=>{const f=find(name),g=Number(grams)||f?.defaultGrams||0;if(!f)return {name,grams:g,calories:0,protein:0};return {name:f.name,grams:g,calories:Math.round(f.calories*g/100),protein:Math.round(f.protein*g/100*10)/10};};
  const today=()=>new Date().toLocaleDateString('en-CA');
  function mealItems(meal){const n=state.nutrition[today()]||{};const m=n.meals?.[meal];if(Array.isArray(m?.items))return m.items; if(m?.name)return [{name:m.name,grams:m.grams||'',calories:Number(m.calories)||0,protein:Number(m.protein)||0}]; return []}
  function renderMeal(meal){
    const host=document.querySelector(`.meal-row[data-meal="${meal}"]`);if(!host)return;
    const items=mealItems(meal);
    const list=host.querySelector('.multi-food-items');
    list.innerHTML=items.map((x,i)=>`<div class="food-item" data-index="${i}"><input class="mf-name" list="foodSuggestions" value="${esc(x.name)}" placeholder="Food e.g. eggs" aria-label="${meal} food ${i+1}"><input class="mf-grams" type="number" min="1" max="2000" step="1" inputmode="decimal" value="${x.grams||''}" placeholder="grams" aria-label="${meal} grams ${i+1}"><span class="mf-cal">${Math.round(x.calories||0)} kcal</span><span class="mf-pro">${Math.round((x.protein||0)*10)/10}g</span>${items.length>1?'<button type="button" class="remove-food" aria-label="Remove food">×</button>':''}</div>`).join('')||`<div class="food-empty">Add the foods you ate.</div>`;
    list.querySelectorAll('.mf-name,.mf-grams').forEach(el=>el.addEventListener('input',()=>{const row=el.closest('.food-item'),i=Number(row.dataset.index),name=row.querySelector('.mf-name').value,grams=row.querySelector('.mf-grams').value,x=calc(name,grams);row.querySelector('.mf-name').value=x.name;row.querySelector('.mf-grams').value=x.grams||'';row.querySelector('.mf-cal').textContent=`${x.calories} kcal`;row.querySelector('.mf-pro').textContent=`${x.protein}g`;row.dataset.cal=x.calories;row.dataset.pro=x.protein;refreshMealTotals();}));
    list.querySelectorAll('.remove-food').forEach(btn=>btn.addEventListener('click',()=>{const i=Number(btn.closest('.food-item').dataset.index);const current=mealItems(meal);current.splice(i,1);saveItemsOnly(meal,current);renderMeal(meal);refreshMealTotals();}));
    host.querySelector('.add-food').onclick=()=>{const current=mealItems(meal);current.push({name:'',grams:'',calories:0,protein:0});saveItemsOnly(meal,current);renderMeal(meal);};
  }
  function collect(meal){return [...document.querySelectorAll(`.meal-row[data-meal="${meal}"] .food-item`)].map(row=>{const x=calc(row.querySelector('.mf-name').value,row.querySelector('.mf-grams').value);return x;}).filter(x=>x.name);}
  function saveItemsOnly(meal,items){state.nutrition[today()]??={};state.nutrition[today()].meals??={};state.nutrition[today()].meals[meal]={items, name:items[0]?.name||'', grams:items[0]?.grams||'', calories:items.reduce((a,x)=>a+x.calories,0), protein:items.reduce((a,x)=>a+x.protein,0)};localStorage.setItem(KEY,JSON.stringify(state));}
  function refreshMealTotals(){let c=0,p=0;meals.forEach(m=>collect(m).forEach(x=>{c+=x.calories;p+=x.protein;}));const ce=document.getElementById('mealTotalCalories'),pe=document.getElementById('mealTotalProtein');if(ce)ce.textContent=`${Math.round(c)} kcal`;if(pe)pe.textContent=`${Math.round(p*10)/10}g`;}
  function customSave(e){e.preventDefault();e.stopImmediatePropagation();state.nutrition[today()]??={};state.nutrition[today()].meals??={};meals.forEach(m=>{const items=collect(m);state.nutrition[today()].meals[m]={items,name:items[0]?.name||'',grams:items[0]?.grams||'',calories:items.reduce((a,x)=>a+x.calories,0),protein:items.reduce((a,x)=>a+x.protein,0)};});state.nutrition[today()].water=Number(document.getElementById('waterInput').value)||0;state.nutrition[today()].steps=Number(document.getElementById('stepsInput').value)||0;save();setTimeout(()=>{renderMeals();},0);}
  function renderMeals(){meals.forEach(renderMeal);refreshMealTotals();}
  function init(){document.querySelectorAll('.meal-row').forEach((row,i)=>{const meal=meals[i];row.dataset.meal=meal;const fields=row.querySelector('.meal-fields');fields.innerHTML=`<div class="multi-food-items"></div><button type="button" class="add-food">＋ Add food</button>`;});document.getElementById('saveNutrition')?.addEventListener('click',customSave,true);renderMeals();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
