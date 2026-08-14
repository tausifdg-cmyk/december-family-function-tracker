/* MYBODY 2.0 branding + safe module loader */
(function(){
  'use strict';
  var BRAND='MYBODY 2.0';
  function apply(){
    document.title=BRAND;
    var h=document.querySelector('.topbar h1');if(h)h.textContent=BRAND;
    var e=document.querySelector('.topbar .eyebrow');if(e)e.textContent='YOUR TRANSFORMATION';
    var hero=document.querySelector('.hero');if(hero)hero.style.display='none';
  }
  function loadCss(){if(document.querySelector('link[data-ui2]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href='ui2.css?v=117';l.setAttribute('data-ui2','1');document.head.appendChild(l)}
  function loadScript(src,key){if(document.querySelector('script[data-module="'+key+'"]'))return;var s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute('data-module',key);document.body.appendChild(s)}
  function init(){loadCss();apply();loadScript('advanced-workout.js?v=117','advanced-workout');setTimeout(function(){loadScript('workout-reference-ui.js?v=117','workout-reference-ui')},120)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();