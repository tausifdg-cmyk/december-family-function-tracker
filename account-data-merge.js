/* MYBODY 2.0 - one-time device-local account history merge.
   Merges tausif.4946@gmail.com history into tausifdg@gmail.com while preserving
   the current account's settings/profile when both accounts contain a value. */
(function(){
  'use strict';

  const DATA_KEY='decemberTracker.v1';
  const ACCOUNTS_KEY='tausifTracker.accounts.v1';
  const SESSION_KEY='tausifTracker.session.v1';
  const OLD_EMAIL='tausif.4946@gmail.com';
  const NEW_EMAIL='tausifdg@gmail.com';
  const MERGE_MARKER='mybody.accountMerge.tausif4946-to-tausifdg.v1';
  const userDataKey=id=>`${DATA_KEY}.user.${id}`;

  const parse=(raw,fallback=null)=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
  const isObject=value=>value&&typeof value==='object'&&!Array.isArray(value);
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const signature=value=>{try{return JSON.stringify(value)}catch{return String(value)}};

  function mergeArrays(oldValue,newValue){
    const oldList=Array.isArray(oldValue)?oldValue:[];
    const newList=Array.isArray(newValue)?newValue:[];
    const seen=new Set();
    const combined=[];
    [...newList,...oldList].forEach(item=>{
      const key=signature(item);
      if(seen.has(key))return;
      seen.add(key);
      combined.push(clone(item));
    });
    if(combined.every(item=>isObject(item)&&typeof item.date==='string')){
      combined.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    }
    return combined;
  }

  function mergeDeep(oldValue,newValue){
    if(Array.isArray(oldValue)||Array.isArray(newValue))return mergeArrays(oldValue,newValue);
    if(isObject(oldValue)||isObject(newValue)){
      const oldObj=isObject(oldValue)?oldValue:{};
      const newObj=isObject(newValue)?newValue:{};
      const out={};
      new Set([...Object.keys(oldObj),...Object.keys(newObj)]).forEach(key=>{
        if(Object.prototype.hasOwnProperty.call(oldObj,key)&&Object.prototype.hasOwnProperty.call(newObj,key)){
          out[key]=mergeDeep(oldObj[key],newObj[key]);
        }else if(Object.prototype.hasOwnProperty.call(newObj,key))out[key]=clone(newObj[key]);
        else out[key]=clone(oldObj[key]);
      });
      return out;
    }
    return newValue!==undefined&&newValue!==null&&newValue!==''?clone(newValue):clone(oldValue);
  }

  function mergeStates(oldState,newState,newAccount){
    const oldData=isObject(oldState)?oldState:{};
    const newData=isObject(newState)?newState:{};
    const merged={...clone(oldData),...clone(newData)};

    // Historical collections are combined instead of replaced.
    ['weights','abdomen','pantWaist','waist','customFoods'].forEach(key=>{
      merged[key]=mergeArrays(oldData[key],newData[key]);
    });
    ['nutrition','activity','workoutLog'].forEach(key=>{
      merged[key]=mergeDeep(oldData[key],newData[key]);
    });

    // Keep the current account's plan/settings as authoritative.
    merged.config={...(oldData.config||{}),...(newData.config||{})};
    merged.planSummary={...(oldData.planSummary||{}),...(newData.planSummary||{})};
    merged.profile={...(oldData.profile||{}),...(newData.profile||{}),email:NEW_EMAIL};
    if(newAccount?.name&&!merged.profile.name)merged.profile.name=newAccount.name;
    if(Array.isArray(newData.workouts)&&newData.workouts.length)merged.workouts=clone(newData.workouts);
    else if(Array.isArray(oldData.workouts))merged.workouts=clone(oldData.workouts);
    if(newData.theme)merged.theme=newData.theme;
    return merged;
  }

  function run(){
    try{
      const accounts=parse(localStorage.getItem(ACCOUNTS_KEY),[]);
      if(!Array.isArray(accounts))return;
      const sid=localStorage.getItem(SESSION_KEY)||'';
      const current=accounts.find(a=>a&&a.id===sid);
      if(!current||String(current.email||'').toLowerCase()!==NEW_EMAIL)return;

      const oldAccount=accounts.find(a=>String(a?.email||'').toLowerCase()===OLD_EMAIL);
      const newAccount=accounts.find(a=>String(a?.email||'').toLowerCase()===NEW_EMAIL);
      if(!oldAccount||!newAccount)return;

      // Run once per browser/device unless a future migration version explicitly changes.
      if(localStorage.getItem(MERGE_MARKER)==='1')return;

      const oldState=parse(localStorage.getItem(userDataKey(oldAccount.id)),null);
      const newState=parse(localStorage.getItem(userDataKey(newAccount.id)),null)
        || parse(localStorage.getItem(DATA_KEY),null);
      if(!oldState||!newState)return;

      const merged=mergeStates(oldState,newState,newAccount);
      const payload=JSON.stringify(merged);
      localStorage.setItem(userDataKey(newAccount.id),payload);
      localStorage.setItem(DATA_KEY,payload);
      localStorage.setItem(MERGE_MARKER,'1');
      window.dispatchEvent(new CustomEvent('mybody:account-history-merged',{detail:{from:OLD_EMAIL,to:NEW_EMAIL}}));
      console.info('MYBODY: combined local history for previous and current Tausif accounts.');
    }catch(error){
      console.warn('MYBODY account history merge skipped:',error);
    }
  }

  run();
})();
