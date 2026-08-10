const KEY='decemberTracker.v1';
const START_WEIGHT=89;const GOAL_WEIGHT=78;const GOAL_DATE=new Date('2026-12-03T00:00:00');
const exercises=[['Machine chest press','3 × 10–12'],['Lat pulldown','3 × 10–12'],['Leg press','3 × 10–12'],['Romanian deadlift','3 × 8–10'],['Cable lateral raise','3 × 12–15'],['Plank','3 × 45–60 sec']];
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{weights:[],habits:{},theme:'dark',workout:false};
const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function dateKey(d=new Date()){return d.toISOString().slice(0,10)}
function render(){
 const latest=state.weights[0]?.weight??START_WEIGHT;const progress=Math.max(0,Math.min(100,(START_WEIGHT-latest)/(START_WEIGHT-GOAL_WEIGHT)*100));
 $('#currentWeight').textContent=`${latest.toFixed(1)} kg`;$('#goalWeight').textContent=`${GOAL_WEIGHT.toFixed(1)} kg`;$('#progressPct').textContent=`${Math.round(progress)}%`;
 $('#weightChange').textContent=`Start: ${START_WEIGHT.toFixed(1)} kg`;
 const days=Math.max(0,Math.ceil((GOAL_DATE-new Date())/86400000));$('#daysLeft').textContent=days;$('#todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
 const start=new Date();start.setDate(start.getDate()-start.getDay()+1);const week=Math.max(1,Math.min(12,Math.ceil((new Date()-start)/604800000)));$('#weekLabel').textContent=`Week ${week}`;$('#weekProgress').style.width=`${Math.round(week/12*100)}%`;
 const today=state.habits[dateKey()]||{};$$('.check').forEach(b=>b.classList.toggle('done',!!today[b.dataset.habit]));
 $('#streak').textContent=`${calcStreak()} day${calcStreak()===1?'':'s'}`;$('#workoutDay').textContent=`Day ${(new Date().getDay()||7)}`;
 $('#exerciseList').innerHTML=exercises.map(([n,s])=>`<article class="exercise card"><div><h4>${n}</h4><p>Controlled reps • leave 1–2 reps in reserve</p></div><b>${s}</b></article>`).join('');
 renderWeights();drawChart();document.body.classList.toggle('light',state.theme==='light');$('#themeBtn').textContent=state.theme==='light'?'☾':'◐';
}
function calcStreak(){let n=0,d=new Date();for(;;){const k=dateKey(d);if(!state.habits[k]||!Object.values(state.habits[k]).some(Boolean))break;n++;d.setDate(d.getDate()-1)}return n}
function renderWeights(){$('#weightList').innerHTML=state.weights.length?state.weights.slice(0,14).map(x=>`<div class="list-row"><span>${new Date(x.date+'T00:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</span><strong>${x.weight.toFixed(1)} kg</strong></div>`).join(''):'<div class="list-row"><span>No weight entries yet</span></div>'}
function drawChart(){const c=$('#weightChart'),ctx=c.getContext('2d'),w=c.clientWidth,h=c.height,dpr=devicePixelRatio||1;c.width=w*dpr;c.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);const data=[...state.weights].reverse().map(x=>x.weight);if(!data.length){ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--muted');ctx.font='14px system-ui';ctx.fillText('Add your first weight to see the trend.',20,40);return}const min=Math.min(...data,GOAL_WEIGHT)-1,max=Math.max(...data,START_WEIGHT)+1;const px=i=>30+i*Math.max(1,(w-50)/Math.max(1,data.length-1));const py=v=>h-30-(v-min)/(max-min)*(h-60);ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue('--accent');ctx.lineWidth=3;ctx.beginPath();data.forEach((v,i)=>i?ctx.lineTo(px(i),py(v)):ctx.moveTo(px(i),py(v)));ctx.stroke();ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--accent');data.forEach((v,i)=>{ctx.beginPath();ctx.arc(px(i),py(v),4,0,Math.PI*2);ctx.fill()});ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--muted');ctx.font='11px system-ui';ctx.fillText(`${max.toFixed(1)} kg`,4,14);ctx.fillText(`${min.toFixed(1)} kg`,4,h-8)}
$$('.tab').forEach(t=>t.addEventListener('click',()=>{$$('.tab').forEach(x=>x.classList.remove('active'));$$('.panel').forEach(x=>x.classList.remove('active'));t.classList.add('active');$('#'+t.dataset.tab).classList.add('active');if(t.dataset.tab==='weight')drawChart()}));
$$('.check').forEach(b=>b.addEventListener('click',()=>{const k=dateKey();state.habits[k]??={};state.habits[k][b.dataset.habit]=!state.habits[k][b.dataset.habit];save()}));
$('#saveWeight').addEventListener('click',()=>{const v=Number($('#weightInput').value);if(!Number.isFinite(v)||v<30||v>250)return;state.weights.unshift({date:dateKey(),weight:v});state.weights=state.weights.slice(0,365);$('#weightInput').value='';save()});
$('#completeWorkout').addEventListener('click',()=>{const k=dateKey();state.habits[k]??={};state.habits[k].workout=true;state.workout=true;save();alert('Workout marked complete. Great work!')});
$('#clearWeights').addEventListener('click',()=>{if(confirm('Delete all weight history?')){state.weights=[];save()}});
$('#themeBtn').addEventListener('click',()=>{state.theme=state.theme==='light'?'dark':'light';save()});
window.addEventListener('resize',drawChart);if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});render();