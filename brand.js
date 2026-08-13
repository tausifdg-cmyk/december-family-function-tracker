/* MYBODY 2.0 branding + safe UI 2.0 loader */
(function(){
  'use strict';
  var BRAND='MYBODY 2.0';
  function apply(){
    document.title=BRAND;
    var h=document.querySelector('.topbar h1');if(h)h.textContent=BRAND;
    var e=document.querySelector('.topbar .eyebrow');if(e)e.textContent='YOUR TRANSFORMATION';
    var hero=document.querySelector('.hero');if(hero)hero.style.display='none';
  }
  function loadUi(){
    if(document.querySelector('link[data-ui2]'))return;
    var l=document.createElement('link');l.rel='stylesheet';l.href='ui2.css?v=111';l.setAttribute('data-ui2','1');document.head.appendChild(l);
  }
  function init(){loadUi();apply()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();