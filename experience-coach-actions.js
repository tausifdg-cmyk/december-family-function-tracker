(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
function clickCoach(action){const hidden=$(`#mybodyCoachCard [data-coach-action="${action}"]`);if(hidden){hidden.click();return true}return false}
function ensure(){
  const card=$('#experienceBrief');
  const coach=card?.querySelector('.xp-coach');
  if(!card||!coach)return;
  let tools=card.querySelector(':scope > .xp-coach-tools');
  if(!tools){
    tools=document.createElement('div');
    tools.className='xp-coach-tools';
    tools.setAttribute('aria-label','MYBODY Coach actions');
    tools.innerHTML='<button type="button" data-xp-coach="plan">View plan</button><button type="button" data-xp-coach="review">Weekly review</button><button type="button" data-xp-coach="build">Recalculate</button>';
    coach.insertAdjacentElement('afterend',tools);
    tools.addEventListener('click',e=>{const action=e.target.closest('[data-xp-coach]')?.dataset.xpCoach;if(action)clickCoach(action)});
  }
  tools.hidden=false;
  tools.style.display='grid';
}
function init(){ensure();setTimeout(ensure,250);setTimeout(ensure,800);setInterval(ensure,2000);const o=new MutationObserver(()=>requestAnimationFrame(ensure));o.observe(document.body,{childList:true,subtree:true})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();