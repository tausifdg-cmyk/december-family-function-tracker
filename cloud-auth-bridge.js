/* MYBODY 2.0 single-login bridge: Supabase Auth is authoritative; local accounts are offline data mappings only. */
(function(){
'use strict';
const DATA_KEY='decemberTracker.v1';
const ACCOUNTS_KEY='tausifTracker.accounts.v1';
const SESSION_KEY='tausifTracker.session.v1';
const CLOUD_SESSION_KEY='mybody.supabase.session';
const nativeSet=Storage.prototype.setItem;
const nativeRemove=Storage.prototype.removeItem;
const getJSON=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'')||f}catch{return f}};
const setJSON=(k,v)=>nativeSet.call(localStorage,k,JSON.stringify(v));
const userDataKey=id=>`${DATA_KEY}.user.${id}`;
const accounts=()=>getJSON(ACCOUNTS_KEY,[]);
const normalize=v=>String(v||'').trim().toLowerCase();
const cloudStored=()=>getJSON(CLOUD_SESSION_KEY,null);
const localSessionId=()=>localStorage.getItem(SESSION_KEY)||'';
const localAccount=()=>accounts().find(a=>a.id===localSessionId())||null;
let busy=false;

async function sha256(text){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function message(text,error=false){const el=document.getElementById('authError');if(el){el.textContent=text;el.style.color=error?'#ff7277':'#a8f000'}}
function setBusy(on){busy=on;const btn=document.querySelector('#authForm .auth-btn');if(btn){btn.disabled=on;btn.style.opacity=on?'.65':'1'}}
function mode(){return /create account/i.test(document.querySelector('#authForm .auth-btn')?.textContent||'')?'signup':'login'}
function saveCurrentLocal(){const id=localSessionId(),current=localStorage.getItem(DATA_KEY);if(id&&current)nativeSet.call(localStorage,userDataKey(id),current)}
function stripLegacyPassword(email,cloudUserId){const list=accounts(),i=list.findIndex(a=>normalize(a.email)===normalize(email));if(i<0)return null;const old=list[i];const clean={...old,cloudUserId};delete clean.passHash;list[i]=clean;setJSON(ACCOUNTS_KEY,list);return clean}
function createLocalMapping(email,cloudUserId){const list=accounts();let a=list.find(x=>normalize(x.email)===normalize(email));if(a){a={...a,cloudUserId};delete a.passHash;list[list.findIndex(x=>x.id===a.id)]=a}else{a={id:`sb_${cloudUserId}`,email:normalize(email),cloudUserId,profileComplete:false,createdAt:new Date().toISOString()};list.push(a)}setJSON(ACCOUNTS_KEY,list);return a}
async function establishCloudUser(s,email){const user=s?.user||cloudStored()?.user;if(!user?.id)throw new Error('Could not establish the cloud session. Please log in again.');const existing=accounts().find(a=>normalize(a.email)===normalize(email));const a=createLocalMapping(email,user.id);nativeSet.call(localStorage,SESSION_KEY,a.id);const saved=localStorage.getItem(userDataKey(a.id));if(saved)nativeSet.call(localStorage,DATA_KEY,saved);else if(!existing)nativeRemove.call(localStorage,DATA_KEY);stripLegacyPassword(email,user.id);await window.MyBodyCloud?.reconcile?.();window.location.reload()}
async function legacyCanMigrate(email,password){const a=accounts().find(x=>normalize(x.email)===normalize(email));if(!a?.passHash)return false;return (await sha256(password))===a.passHash}

async function handleLogin(email,password){try{const s=await window.MyBodyCloud.login(email,password);await establishCloudUser(s,email)}catch(first){if(await legacyCanMigrate(email,password)){message('Migrating this device account to secure cloud login…');try{const s=await window.MyBodyCloud.signup(email,password);if(s?.access_token&&s?.user){await establishCloudUser(s,email);return}message('Check your email to confirm your MYBODY account, then return here and log in. Your existing tracker data is preserved.');return}catch(e){throw e}}throw first}}
async function handleSignup(email,password){const s=await window.MyBodyCloud.signup(email,password);if(s?.access_token&&s?.user){await establishCloudUser(s,email);return}message('Account created. Check your email to confirm it, then return and log in.');}
async function onSubmit(event){const form=event.target;if(!(form instanceof HTMLFormElement)||form.id!=='authForm'||busy)return;event.preventDefault();event.stopImmediatePropagation();const email=normalize(document.getElementById('authEmail')?.value),password=document.getElementById('authPass')?.value||'';if(!email||!password)return;setBusy(true);message('');try{if(mode()==='signup')await handleSignup(email,password);else await handleLogin(email,password)}catch(e){message(e?.message||'Unable to sign in.',true)}finally{setBusy(false)}}

function addForgot(){const form=document.getElementById('authForm');if(!form)return;const login=mode()==='login';let btn=document.getElementById('authForgot');if(!login){btn?.remove();return}if(btn)return;btn=document.createElement('button');btn.id='authForgot';btn.type='button';btn.className='auth-switch';btn.style.marginTop='0';btn.textContent='Forgot password?';btn.onclick=async()=>{const email=normalize(document.getElementById('authEmail')?.value);if(!email){message('Enter your email first.',true);return}btn.disabled=true;try{await window.MyBodyCloud.forgot(email);message('Password reset email sent. Open the link to choose a new password.')}catch(e){message(e?.message||'Could not send reset email.',true)}finally{btn.disabled=false}};form.appendChild(btn)}
function rewriteAuthCopy(){const note=document.querySelector('#authGate .auth-note');if(note)note.textContent='One secure MYBODY account works across iPhone, Android and Web. Your tracker remains available offline on this device.';addForgot()}
function observeGate(){const target=document.body;const observer=new MutationObserver(()=>rewriteAuthCopy());observer.observe(target,{childList:true,subtree:true});rewriteAuthCopy()}

function recoveryMode(){return location.hash.includes('type=recovery')||location.hash.includes('access_token=')&&location.hash.includes('recovery')}
function reconcileExistingSession(){if(recoveryMode()){setTimeout(()=>{const gate=document.getElementById('authGate');if(gate)gate.style.display='none'},50);return}const local=localAccount(),cloud=cloudStored(),cloudEmail=normalize(cloud?.user?.email);if(local&&cloudEmail&&normalize(local.email)===cloudEmail){stripLegacyPassword(local.email,cloud.user?.id||'');return}if(local&&!cloudEmail){saveCurrentLocal();nativeRemove.call(localStorage,SESSION_KEY);window.location.reload();return}if(local&&cloudEmail&&normalize(local.email)!==cloudEmail){saveCurrentLocal();nativeRemove.call(localStorage,SESSION_KEY);window.MyBodyCloud?.logoutCloud?.().finally(()=>window.location.reload())}}

document.addEventListener('submit',onSubmit,true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{observeGate();setTimeout(reconcileExistingSession,120)},{once:true});else{observeGate();setTimeout(reconcileExistingSession,120)}
})();