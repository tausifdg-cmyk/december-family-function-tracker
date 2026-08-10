(() => {
  const KEY='decemberTracker.v1';
  const exercises=[
    ['machine-chest-press','Machine chest press'],['lat-pulldown','Lat pulldown'],['leg-press','Leg press'],['romanian-deadlift','Romanian deadlift'],['cable-lateral-raise','Cable lateral raise'],['plank','Plank']
  ];
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=k=>new Date(k+'T00:00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
  const css=`<style id="workoutProgressStyles">.wp-wrap{margin-top:16px}.wp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wp-stat{padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--card)}.wp-stat span{display:block;font-size:12px;color:var(--muted)}.wp-stat strong{display:block;font-size:20px;margin-top:5px}.wp-table{margin-top:12px}.wp-row{display:grid;grid-template-columns:1.5fr .8fr .8fr .8fr;gap:8px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line);font-size:13px}.wp-row:last-child{border-bottom:0}.wp-head{color:var(--muted);font-size:11px;text-transform:uppercase}.wp-positive{color:var(--accent)}.wp-muted{color:var(--muted)}@media(max-width:520px){.wp-row{grid-template-columns:1.35fr .7fr .7fr .8fr;font-size:12px}} </style>`;
  function render(){
    const state=read(), logs=state.workoutLog||{};
    let entries=[];
    Object.entries(logs).forEach(([date,day])=>Object.entries(day||{}).forEach(([id,x])=>{if(x&&Number(x.weight)>0)entries.push({date,id,weight:Number(x.weight)||0,reps:Number(x.reps)||0,sets:Number(x.sets)||0});}));
    entries.sort((a,b)=>b.date.localeCompare(a.date));
    const byId=id=>entries.filter(x=>x.id===id).sort((a,b)=>a.date.localeCompare(b.date));
    let totalVolume=0,improved=0;
    const rows=exercises.map(([id,name])=>{
      const e=byId(id), latest=e.at(-1), previous=e.at(-2); if(latest) totalVolume+=latest.weight*latest.reps*latest.sets;
      const delta=latest&&previous?latest.weight-previous.weight:0; if(delta>0) improved++;
      return `<div class="wp-row"><strong>${esc(name)}</strong><span>${latest?latest.weight.toFixed(1)+' kg':'—'}</span><span>${latest?latest.sets+'×'+latest.reps:'—'}</span><span class="${delta>0?'wp-positive':'wp-muted'}">${delta>0?'+'+delta.toFixed(1)+' kg':delta<0?delta.toFixed(1)+' kg':'—'}</span></div>`;
    }).join('');
    const days=new Set(entries.map(x=>x.date)).size;
    let mount=document.getElementById('workoutProgress');
    if(!mount){mount=document.createElement('div');mount.id='workoutProgress';mount.className='wp-wrap';document.querySelector('#workout .exercise-list')?.after(mount);}
    if(!document.getElementById('workoutProgressStyles'))document.head.insertAdjacentHTML('beforeend',css);
    mount.innerHTML=`<div class="section-head"><div><p class="eyebrow">PROGRESS</p><h3>Workout history</h3></div><span>${days} day${days===1?'':'s'} logged</span></div><div class="wp-grid"><article class="wp-stat"><span>Latest training volume</span><strong>${Math.round(totalVolume).toLocaleString()} kg</strong></article><article class="wp-stat"><span>Exercises progressing</span><strong>${improved}/${exercises.length}</strong></article></div><div class="card wp-table"><div class="wp-row wp-head"><span>Exercise</span><span>Weight</span><span>Sets×Reps</span><span>Change</span></div>${rows}</div><div class="card wp-table"><div class="section-head"><div><p class="eyebrow">RECENT</p><h3>Last sessions</h3></div></div>${entries.slice(-12).reverse().map(x=>`<div class="wp-row"><span><strong>${esc(exercises.find(e=>e[0]===x.id)?.[1]||x.id)}</strong><small class="wp-muted">${fmtDate(x.date)}</small></span><span>${x.weight.toFixed(1)} kg</span><span>${x.sets}×${x.reps}</span><span>${Math.round(x.weight*x.sets*x.reps).toLocaleString()} kg</span></div>`).join('')||'<p class="wp-muted">Complete an exercise to start building your history.</p>'}</div>`;
  }
  window.addEventListener('load',render);window.addEventListener('storage',render);setInterval(render,1500);
})();
