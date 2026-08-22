/* MYBODY 2.0 - lightweight Supabase health/activity check for the active cloud account. */
(function(){
'use strict';
const LAST_KEY='mybody.supabase.health.last';
const MIN_INTERVAL=6*60*60*1000;
let timer=0,running=false;

function lastCheck(){return Number(localStorage.getItem(LAST_KEY)||0)||0}
function publish(detail){try{window.dispatchEvent(new CustomEvent('mybody:cloud-health',{detail}))}catch{}}
async function waitForCloud(timeout=5000){
  const start=Date.now();
  while(Date.now()-start<timeout){
    if(window.MyBodyCloud)return window.MyBodyCloud;
    await new Promise(r=>setTimeout(r,120));
  }
  return null;
}
async function check(force=false){
  if(running)return false;
  if(!navigator.onLine){publish({ok:false,status:'offline'});return false}
  if(!force&&Date.now()-lastCheck()<MIN_INTERVAL)return true;
  running=true;
  try{
    const cloud=await waitForCloud();
    if(!cloud){publish({ok:false,status:'unavailable'});return false}
    if(typeof cloud.accountMatches==='function'&&!cloud.accountMatches()){
      publish({ok:false,status:'not-connected'});
      return false;
    }
    const ok=await cloud.recordActivity(false);
    if(ok){
      localStorage.setItem(LAST_KEY,String(Date.now()));
      publish({ok:true,status:'healthy',checkedAt:new Date().toISOString()});
      return true;
    }
    publish({ok:false,status:'request-failed'});
    return false;
  }catch(error){
    publish({ok:false,status:'error',message:String(error?.message||error)});
    return false;
  }finally{running=false}
}
function schedule(){
  clearInterval(timer);
  timer=setInterval(()=>check(false),MIN_INTERVAL);
}
function init(){
  setTimeout(()=>check(false),900);
  schedule();
  window.addEventListener('online',()=>check(false),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check(false)});
}
window.MyBodyCloudHealth={check,lastCheck};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
