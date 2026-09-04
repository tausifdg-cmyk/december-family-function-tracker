(function(){
'use strict';
const Store=window.MyBodyStore;
if(!Store)return;

function ensureTarget(id,valueId){
  let node=document.getElementById(id);
  if(node)return node;
  const value=document.getElementById(valueId);
  if(!value)return null;
  node=document.createElement('small');
  node.id=id;
  value.insertAdjacentElement('afterend',node);
  return node;
}

function render(){
  const state=Store.read();
  const config=state.config||{};
  const calories=ensureTarget('foodCalTarget','foodCalories');
  const protein=ensureTarget('foodProteinTarget','foodProtein');
  const carbs=ensureTarget('foodCarbsTarget','foodCarbs');
  const fat=ensureTarget('foodFatTarget','foodFat');
  if(calories)calories.textContent=`target ${Math.round(Number(config.calories)||0)}`;
  if(protein)protein.textContent=`target ${Math.round(Number(config.protein)||0)}g`;
  if(carbs)carbs.textContent=`target ${Math.round(Number(config.carbs)||0)}g`;
  if(fat)fat.textContent=`target ${Math.round(Number(config.fat)||0)}g`;
}

let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.addEventListener('mybody:state',schedule);
document.addEventListener('click',e=>{if(e.target.closest('#food-tab,[data-nav="food"],[data-tab="food"],#saveDaily,.primary'))setTimeout(schedule,80)},true);
new MutationObserver(()=>schedule()).observe(document.body,{childList:true,subtree:true});
})();
