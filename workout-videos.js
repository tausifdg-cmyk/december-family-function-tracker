/* Exercise reference videos. Direct verified links are used where available; otherwise the button opens a focused YouTube exercise-form search so references do not go stale. */
(function(){
 const direct={
  'barbell bench press':'https://www.youtube.com/watch?v=CayG6UYqL8g',
  'incline dumbbell press':'https://www.youtube.com/watch?v=oS2Uy3MAbgs'
 };
 const clean=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
 function urlFor(name){const n=clean(name);if(direct[n])return direct[n];return 'https://www.youtube.com/results?search_query='+encodeURIComponent(name+' proper form exercise tutorial');}
 function decorate(){document.querySelectorAll('#exerciseList article.exercise').forEach(card=>{if(card.querySelector('.exercise-video-link'))return;const name=card.querySelector('h4')?.textContent?.trim();if(!name)return;const a=document.createElement('a');a.className='secondary exercise-video-link';a.href=urlFor(name);a.target='_blank';a.rel='noopener noreferrer';a.textContent='▶ Form video';a.setAttribute('aria-label','Watch '+name+' form video');const top=card.querySelector('.exercise-top');if(top)top.insertAdjacentElement('afterend',a);});}
 const observer=new MutationObserver(()=>decorate());
 function init(){decorate();const list=document.getElementById('exerciseList');if(list)observer.observe(list,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 window.workoutVideoReference={urlFor,decorate};
})();
