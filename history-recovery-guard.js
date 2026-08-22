/* MYBODY 2.0 - non-destructive local history recovery guard. */
(function(){
'use strict';
const DATA_KEY='decemberTracker.v1';
const ACCOUNTS_KEY='tausifTracker.accounts.v1';
const SESSION_KEY='tausifTracker.session.v1';
const TARGET_EMAIL='tausifdg@gmail.com';
const OLD_EMAIL='tausif.4946@gmail.com';
const parse=(raw,f=null)=>{try{return raw?JSON.parse(raw):f}catch{return f}};
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const sig=v=>{try{return JSON.stringify(v)}catch{return String(v)}};
function mergeArrays(a,b){const out=[],seen=new Set();[...(Array.isArray(b)?b:[]),...(Array.isArray(a)?a:[])].forEach(x=>{const k=sig(x);if(seen.has(k))return;seen.add(k);out.push(clone(x))});if(out.every(x=>obj(x)&&typeof x.date==='string'))out.sort((x,y)=>String(y.date).localeCompare(String(x.date)));return out}
function mergeDeep(a,b){if(Array.isArray(a)||Array.isArray(b))return mergeArrays(a,b);if(obj(a)||obj(b)){const A=obj(a)?a:{},B=obj(b)?b:{},o={};new Set([...Object.keys(A),...Object.keys(B)]).forEach(k=>{o[k]=(k in A&&k in B)?mergeDeep(A[k],B[k]):clone(k in B?B[k]:A[k])});return o}return b!==undefined&&b!==null&&b!==''?clone(b):clone(a)}
function mergeState(source,current){const A=obj(source)?source:{},B=obj(current)?current:{},m={...clone(A),...clone(B)};['weights','abdomen','pantWaist','waist','customFoods'].forEach(k=>m[k]=mergeArrays(A[k],B[k]));['nutrition','activity','workoutLog'].forEach(k=>m[k]=mergeDeep(A[k],B[k]));m.config={...(A.config||{}),...(B.config||{})};m.planSummary={...(A.planSummary||{}),...(B.planSummary||{})};m.profile={...(A.profile||{}),...(B.profile||{})};if(Array.isArray(B.workouts)&&B.workouts.length)m.workouts=clone(B.workouts);else if(Array.isArray(A.workouts))m.workouts=clone(A.workouts);return m}
function score(s){if(!obj(s))return 0;let n=0;n+=(Array.isArray(s.weights)?s.weights.length:0)*5;n+=(Array.isArray(s.abdomen)?s.abdomen.length:0)*5;n+=obj(s.nutrition)?Object.keys(s.nutrition).length*4:0;n+=obj(s.activity)?Object.keys(s.activity).length*2:0;n+=obj(s.workoutLog)?Object.keys(s.workoutLog).length*5:0;return n}
function run(){try{const accounts=parse(localStorage.getItem(ACCOUNTS_KEY),[]);if(!Array.isArray(accounts))return false;const sid=localStorage.getItem(SESSION_KEY)||'';const currentAcct=accounts.find(a=>a?.id===sid);if(String(currentAcct?.email||'').toLowerCase()!==TARGET_EMAIL)return false;let current=parse(localStorage.getItem(DATA_KEY),{});const candidates=[];const currentScoped=parse(localStorage.getItem(`${DATA_KEY}.user.${currentAcct.id}`),null);if(currentScoped)candidates.push(currentScoped);for(const a of accounts){const email=String(a?.email||'').toLowerCase();if(email!==TARGET_EMAIL&&email!==OLD_EMAIL)continue;const s=parse(localStorage.getItem(`${DATA_KEY}.user.${a.id}`),null);if(s)candidates.push(s)}let recovered=current;for(const c of candidates)recovered=mergeState(c,recovered);if(score(recovered)<=score(current))return false;const payload=JSON.stringify(recovered);localStorage.setItem(DATA_KEY,payload);localStorage.setItem(`${DATA_KEY}.user.${currentAcct.id}`,payload);window.dispatchEvent(new CustomEvent('mybody:history-recovered',{detail:{before:score(current),after:score(recovered)}}));console.info('MYBODY: recovered richer local history after cloud auth.');return true}catch(e){console.warn('MYBODY history recovery skipped:',e);return false}}
window.MyBodyHistoryRecovery={run};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,250),{once:true});else setTimeout(run,250);
})();
