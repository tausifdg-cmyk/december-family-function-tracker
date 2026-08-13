/* Separate abdomen/belly and pant-line waist tracking without breaking existing waist history. */
(function(){
 const KEY='decemberTracker.v1', today=()=>new Date().toLocaleDateString('en-CA');
 const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
 const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
 function inchesToCm(v){return Math.round(Number(v)*2.54*10)/10}
 function cmToIn(v){return Math.round(Number(v)/2.54*10)/10}
 function init(){
  const old=document.getElementById('waistInput'); if(!old)return;
  const label=old.closest('label'); if(!label)return;
  label.innerHTML='Belly / abdomen (in)<input id="abdomenInput" type="number" step="0.1" inputmode="decimal" placeholder="42.0">';
  const waist=document.createElement('label'); waist.innerHTML='Waist / pant line (in)<input id="pantWaistInput" type="number" step="0.1" inputmode="decimal" placeholder="39.5">';
  label.insertAdjacentElement('afterend',waist);
  const btn=document.getElementById('saveDaily');
  btn?.addEventListener('click',()=>setTimeout(()=>{
    const abdomen=Number(document.getElementById('abdomenInput')?.value), pant=Number(document.getElementById('pantWaistInput')?.value); if(!abdomen&&!pant)return;
    const s=load(),k=today(); s.abdomen=s.abdomen||[];s.pantWaist=s.pantWaist||[];
    if(abdomen>=20&&abdomen<=80){const x={date:k,value:inchesToCm(abdomen),inches:abdomen};const i=s.abdomen.findIndex(e=>e.date===k);i>=0?s.abdomen[i]=x:s.abdomen.unshift(x)}
    if(pant>=20&&pant<=80){const x={date:k,value:inchesToCm(pant),inches:pant};const i=s.pantWaist.findIndex(e=>e.date===k);i>=0?s.pantWaist[i]=x:s.pantWaist.unshift(x)}
    save(s); document.getElementById('abdomenInput').value='';document.getElementById('pantWaistInput').value='';
  },80),true);
  const stats=document.querySelector('#progress .stats-grid');
  if(stats&&!document.getElementById('latestAbdomen')){
   const a=document.createElement('article');a.className='metric-card';a.innerHTML='<span>Latest abdomen</span><strong id="latestAbdomen">—</strong><small>belly midpoint</small>';
   const w=document.createElement('article');w.className='metric-card';w.innerHTML='<span>Pant-line waist</span><strong id="latestPantWaist">—</strong><small>where trousers sit</small>';stats.append(a,w);
  }
  function renderMeasurements(){const s=load(),a=s.abdomen?.[0],w=s.pantWaist?.[0];const ae=document.getElementById('latestAbdomen'),we=document.getElementById('latestPantWaist');if(ae)ae.textContent=a?`${a.inches||cmToIn(a.value)} in`:'—';if(we)we.textContent=w?`${w.inches||cmToIn(w.value)} in`:'—'}
  renderMeasurements(); document.querySelector('[data-tab="progress"]')?.addEventListener('click',()=>setTimeout(renderMeasurements,50));
  const s=load(),k=today(); if(!s.abdomen?.length){s.abdomen=[{date:k,value:106.7,inches:42}]};if(!s.pantWaist?.length){s.pantWaist=[{date:k,value:100.3,inches:39.5}]};save(s);renderMeasurements();
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();