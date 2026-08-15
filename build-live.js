(function(){
'use strict';
var liveBuild='';
function badge(){return document.getElementById('buildBadge')}
function apply(){var b=badge();if(b&&liveBuild)b.textContent='Build #'+liveBuild}
function read(){fetch('build.json?ts='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('build');return r.json()}).then(function(j){if(j&&/^\d+$/.test(String(j.build||''))){liveBuild=String(j.build);apply();setTimeout(apply,250);setTimeout(apply,1000)}}).catch(function(){var p=new URLSearchParams(location.search),v=p.get('build');if(v&&/^\d+$/.test(v)){liveBuild=v;apply()}})}
var obs=new MutationObserver(function(){apply()});
function init(){obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});read();setInterval(apply,1000);setTimeout(function(){try{obs.disconnect()}catch(e){}},10000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
