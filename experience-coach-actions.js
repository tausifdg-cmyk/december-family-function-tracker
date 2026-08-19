(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
function clickCoach(action){const hidden=$(`#mybodyCoachCard [data-coach-action="${action}"]`);if(hidden){hidden.click();return true}return false}
function ensure(){const coach=$('#experienceBrief .xp-coach');if(!coach||$('.xp-coach-tools',coach))return;const tools=document.createElement('div');tools.className='xp-coach-tools';tools.innerHTML='<button type="button" data-xp-coach="plan">View plan</button><button type="button" data-xp-coach="review">Weekly review</button><button type="button" data-xp-coach="build">Recalculate</button>';coach.appendChild(tools);tools.addEventListener('click',e=>{const action=e.target.closest('[data-xp-coach]')?.dataset.xpCoach;if(action)clickCoach(action)});
}
function init(){ensure();const o=new MutationObserver(()=>requestAnimationFrame(ensure));o.observe(document.body,{childList:true,subtree:true})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();