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
  Object.assign(tools.style,{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'7px',width:'100%',marginTop:'10px',paddingTop:'10px',borderTop:'1px solid var(--line)',visibility:'visible',opacity:'1'});
  tools.hidden=false;
  tools.querySelectorAll('button').forEach((b,i)=>Object.assign(b.style,{display:'block',minHeight:'38px',width:'100%',padding:'7px 5px',border:'1px solid var(--line)',borderRadius:'10px',background:i===0?'var(--accent-soft)':'var(--card)',color:i===0?'var(--accent)':'var(--text)',fontSize:'10px',fontWeight:'800',visibility:'visible',opacity:'1'}));
}
function init(){ensure();setTimeout(ensure,150);setTimeout(ensure,500);setTimeout(ensure,1200);setInterval(ensure,2000);const o=new MutationObserver(()=>requestAnimationFrame(ensure));o.observe(document.body,{childList:true,subtree:true})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();