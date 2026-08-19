(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function clickCoach(action){const hidden=$(`#mybodyCoachCard [data-coach-action="${action}"]`);if(hidden){hidden.click();return true}return false}
function removeDuplicateWorkoutCta(card){
  const primary=card?.querySelector('.xp-coach > [data-xp-action="workout"]');
  const featured=$('#today .today-workout-card [data-nav="workout"]');
  if(primary&&featured){primary.remove()}
}
function ensure(){
  const card=$('#experienceBrief');
  const coach=card?.querySelector('.xp-coach');
  if(!card||!coach)return;
  removeDuplicateWorkoutCta(card);
  let tools=card.querySelector(':scope > .xp-coach-tools');
  if(!tools){
    tools=document.createElement('div');
    tools.className='xp-coach-tools';
    tools.setAttribute('aria-label','MYBODY Coach actions');
    tools.innerHTML='<button type="button" data-xp-coach="plan">View plan</button><button type="button" data-xp-coach="review">Weekly review</button><button type="button" data-xp-coach="build">Recalculate</button>';
    coach.insertAdjacentElement('afterend',tools);
    tools.addEventListener('click',e=>{const action=e.target.closest('[data-xp-coach]')?.dataset.xpCoach;if(action)clickCoach(action)});
  }
  Object.assign(tools.style,{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'8px',width:'100%',marginTop:'12px',paddingTop:'12px',borderTop:'1px solid var(--line)',visibility:'visible',opacity:'1',position:'relative',zIndex:'2'});
  tools.hidden=false;
  $$('button',tools).forEach((b,i)=>Object.assign(b.style,{display:'grid',placeItems:'center',minHeight:'40px',width:'100%',padding:'7px 4px',border:'1px solid '+(i===0?'color-mix(in srgb,var(--accent) 34%,var(--line))':'var(--line)'),borderRadius:'11px',background:i===0?'color-mix(in srgb,var(--accent-soft) 65%,var(--card))':'var(--card)',color:i===0?'var(--accent)':'var(--text)',fontSize:'10px',fontWeight:'850',lineHeight:'1.15',visibility:'visible',opacity:'1',whiteSpace:'nowrap'}));
}
function init(){ensure();[80,180,350,700,1400].forEach(ms=>setTimeout(ensure,ms));setInterval(ensure,1500);const o=new MutationObserver(()=>requestAnimationFrame(ensure));o.observe(document.body,{childList:true,subtree:true})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();