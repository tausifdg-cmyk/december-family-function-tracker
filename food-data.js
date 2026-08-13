/* MYBODY 2.0 startup-safe food database bootstrap. */
window.FOOD_DB=window.FOOD_DB||[];
if(!document.getElementById('daysLeft')){
  const el=document.createElement('span');
  el.id='daysLeft';
  el.hidden=true;
  document.body.appendChild(el);
}
