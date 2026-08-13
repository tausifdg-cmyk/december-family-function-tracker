document.addEventListener('DOMContentLoaded',function(){
'use strict';
var panel=document.getElementById('food');if(!panel)return;
var mealSections=document.getElementById('mealSections');if(!mealSections)return;
var bar=document.createElement('div');bar.className='smart-food-bar';bar.innerHTML='<button id="smartLogFood" class="primary full">＋ Log Food</button><div class="smart-food-chips"><button data-q="Roti">Roti</button><button data-q="Egg">Egg</button><button data-q="Chicken">Chicken</button><button data-q="Chana">Chana</button><button data-q="Rice">Rice</button><button data-q="Paneer">Paneer</button></div>';
mealSections.parentNode.insertBefore(bar,mealSections);
function openFood(q){var first=document.querySelector('.add-food[data-meal="breakfast"]');if(first)first.click();setTimeout(function(){var rows=document.querySelectorAll('.food-row');var row=rows[rows.length-1];if(!row)return;var name=row.querySelector('.food-name');if(name){name.value=q||'';name.focus();}},20)}
document.getElementById('smartLogFood').onclick=function(){openFood('')};bar.querySelectorAll('[data-q]').forEach(function(b){b.onclick=function(){openFood(b.dataset.q)}});
});