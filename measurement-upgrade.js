/* Separate abdomen/belly and pant-line waist tracking without breaking the core daily-save handler. */
(function(){
 const KEY='decemberTracker.v1', today=()=>new Date().toLocaleDateString('en-CA');
 const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
 const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
 const inchesToCm=v=>Math.round(Number(v)*2.54*10)/10;
 const cmToIn=v=>Math.round(Number(v)/2.54*10)/10;
 function latest(arr){return [...(arr||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0]}
 function init(){
  const old=document.getElementById('waistInput'); if(!old)return;
  const label=old.closest('label'); if(!label)return;
  // Keep the legacy field hidden so app.js saveDaily never crashes looking for #waistInput.
  label.innerHTML='Belly / abdomen (in)<input id="abdomenInput" type="number" step="0.1" inputmode="decimal" placeholder="e.g. 42.0"><input id="waistInput" type="hidden" value="">';
  const waist=document.createElement('label'); waist.innerHTML='Waist / pant line (in)<input id="pantWaistInput" type="number" step="0.1" inputmode="decimal" placeholder="e.g. 39.5">';
  label.insertAdjacentElement('afterend',waist);

  const btn=document.getElementById('saveDaily');
  btn?.addEventListener('click',()=>setTimeout(()=>{
    const abdomen=Number(document.getElementById('abdomenInput')?.value),pant=Number(document.getElementById('pantWaistInput')?.value);
    if(!abdomen&&!pant)return;
    const s=load(),k=today();s.abdomen=Array.isArray(s.abdomen)?s.abdomen:[];s.pantWaist=Array.isArray(s.pantWaist)?s.pantWaist:[];
    if(abdomen>=20&&abdomen<=80){const x={date:k,value:inchesToCm(abdomen),inches:abdomen};const i=s.abdomen.findIndex(e=>e.date===k);i>=0?s.abdomen[i]=x:s.abdomen.push(x)}
    if(pant>=20&&pant<=80){const x={date:k,value:inchesToCm(pant),inches:pant};const i=s.pantWaist.findIndex(e=>e.date===k);i>=0?s.pantWaist[i]=x:s.pantWaist.push(x)}
    s.abdomen.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));s.pantWaist.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    save(s);
    try{if(typeof state!=='undefined'){state.abdomen=s.abdomen;state.pantWaist=s.pantWaist;if(typeof renderProgress==='function')renderProgress()}}catch{}
    const a=document.getElementById('abdomenInput'),p=document.getElementById('pantWaistInput');if(a)a.value='';if(p)p.value='';renderMeasurements();
  },100),true);

  const stats=document.querySelector('#progress .stats-grid');
  if(stats&&!document.getElementById('latestAbdomen')){
   const a=document.createElement('article');a.className='metric-card';a.innerHTML='<span>Latest abdomen</span><strong id="latestAbdomen">—</strong><small>belly midpoint</small>';
   const w=document.createElement('article');w.className='metric-card';w.innerHTML='<span>Pant-line waist</span><strong id="latestPantWaist">—</strong><small>where trousers sit</small>';stats.append(a,w);
  }
  function renderMeasurements(){const s=load(),a=latest(s.abdomen),w=latest(s.pantWaist);const ae=document.getElementById('latestAbdomen'),we=document.getElementById('latestPantWaist');if(ae)ae.textContent=a?`${a.inches||cmToIn(a.value)} in`:'—';if(we)we.textContent=w?`${w.inches||cmToIn(w.value)} in`:'—'}
  renderMeasurements();document.querySelector('[data-tab="progress"]')?.addEventListener('click',()=>setTimeout(renderMeasurements,30));
  // No hard-coded measurements are inserted here. Every user's baseline must come from their own entry.
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();