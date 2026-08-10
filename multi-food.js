/* Multi-food meal logger: one or more foods per Breakfast, Lunch and Dinner. */
(function(){
  const meals=['breakfast','lunch','dinner'];
  const today=()=>new Date().toLocaleDateString('en-CA');
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const db=()=>window.FOOD_DB||[];
  const find=s=>window.foodCalculator?.findFood?.(s)||db().find(f=>String(f.name).toLowerCase()===String(s||'').toLowerCase());
  const calc=(name,grams)=>{const f=find(name),g=Number(grams)||0;return {name:String(f?.name||name||''),grams:g,calories:f?Math.round(f.calories*g/100):0,protein:f?Math.round(f.protein*g/100*10)/10:0};};
  function items(meal){const n=state.nutrition[today()]||{},m=n.meals?.[meal];if(Array.isArray(m?.items))return m.items;if(m?.name)return [{name:m.name,grams:m.grams||'',calories:Number(m.calories)||0,protein:Number(m.protein)||0}];return []}
  function persist(meal,list){state.nutrition[today()]??={};state.nutrition[today()].meals??={};const total=list.reduce((a,x)=>({calories:a.calories+x.calories,protein:a.protein+x.protein}),{calories:0,protein:0});state.nutrition[today()].meals[meal]={items:list,name:list[0]?.name||'',grams:list[0]?.grams||'',calories:total.calories,protein:total.protein};localStorage.setItem(KEY,JSON.stringify(state));}
  function renderMeal(meal){
    const host=document.querySelector(`.meal-row[data-meal="${meal}"]`);const list=host?.querySelector('.multi-food-items');if(!host||!list)return;
    let current=items(meal);if(!current.length)current=[{name:'',grams:'',calories:0,protein:0}];
    list.innerHTML=current.map((x,i)=>`<div class="food-item" data-index="${i}"><input class="mf-name" list="foodSuggestions" value="${esc(x.name)}" placeholder="Food e.g. eggs"><input class="mf-grams" type="number" min="1" max="2000" step="1" inputmode="decimal" value="${x.grams||''}" placeholder="grams"><span class="mf-cal">${Math.round(x.calories||0)} kcal</span><span class="mf-pro">${Math.round((x.protein||0)*10)/10}g</span>${current.length>1?'<button type="button" class="remove-food" aria-label="Remove food">×</button>':''}</div>`).join('');
    const sync=()=>{const listNow=[...list.querySelectorAll('.food-item')].map(row=>calc(row.querySelector('.mf-name').value,row.querySelector('.mf-grams').value));persist(meal,listNow);refreshTotals();};
    list.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{const row=input.closest('.food-item'),x=calc(row.querySelector('.mf-name').value,row.querySelector('.mf-grams').value);row.querySelector('.mf-name').value=x.name;row.querySelector('.mf-grams').value=x.grams||'';row.querySelector('.mf-cal').textContent=`${x.calories} kcal`;row.querySelector('.mf-pro').textContent=`${x.protein}g`;sync();}));
    list.querySelectorAll('.remove-food').forEach(btn=>btn.addEventListener('click',()=>{const i=Number(btn.closest('.food-item').dataset.index),next=current.filter((_,idx)=>idx!==i);persist(meal,next);renderMeal(meal);refreshTotals();}));
    const add=host.querySelector('.add-food');if(add)add.onclick=()=>{const next=[...items(meal),{name:'',grams:'',calories:0,protein:0}];persist(meal,next);renderMeal(meal);setTimeout(()=>host.querySelector('.mf-name:last-of-type')?.focus(),0);};
    const addText=add;if(addText)addText.textContent='＋ Add another food';
  }
  function refreshTotals(){let calories=0,protein=0;meals.forEach(m=>items(m).forEach(x=>{calories+=Number(x.calories)||0;protein+=Number(x.protein)||0;}));const c=document.getElementById('mealTotalCalories'),p=document.getElementById('mealTotalProtein');if(c)c.textContent=`${Math.round(calories)} kcal`;if(p)p.textContent=`${Math.round(protein*10)/10}g`;}
  function init(){document.querySelectorAll('.meal-row').forEach((row,i)=>row.dataset.meal=meals[i]);meals.forEach(renderMeal);refreshTotals();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();