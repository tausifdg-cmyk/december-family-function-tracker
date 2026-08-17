/* MYBODY 2.0 - force production Auth redirects */
(function(){
'use strict';
const SUPABASE_URL='https://vucmcxkgpghnahnocirk.supabase.co';
const KEY='sb_publishable____2MhGKdMY2FWa_lgOT_w_454NS9Qg';
const PROD='https://tausifdg-cmyk.github.io/december-family-function-tracker/';
const headers=()=>({'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY});
async function request(path,body){
  const r=await fetch(SUPABASE_URL+path,{method:'POST',headers:headers(),body:JSON.stringify(body)});
  let x={};try{x=await r.json()}catch{}
  if(!r.ok)throw new Error(x.msg||x.message||x.error_description||x.error||'Request failed');
  return x;
}
function install(){
  if(!window.MyBodyCloud)return false;
  window.MyBodyCloud.sendEmailOtp=async function(email){
    const clean=String(email||'').trim().toLowerCase();
    const local=String(window.MyBodyCloud.localAccount?.()?.email||'').trim().toLowerCase();
    if(local&&local!==clean)throw new Error('Use the same email as the currently logged-in MYBODY profile.');
    await request('/auth/v1/otp?redirect_to='+encodeURIComponent(PROD),{email:clean,create_user:false});
    return true;
  };
  window.MyBodyCloud.forgot=async function(email){
    const clean=String(email||'').trim().toLowerCase();
    await request('/auth/v1/recover?redirect_to='+encodeURIComponent(PROD),{email:clean});
    return true;
  };
  return true;
}
if(!install()){
  const t=setInterval(()=>{if(install())clearInterval(t)},50);
  setTimeout(()=>clearInterval(t),10000);
}
})();
