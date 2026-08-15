/* Resilient mobile navigation for MyBody2.0. */
(function(){
  function openTab(id,button){
    if(!id||!document.getElementById(id))return;
    document.querySelectorAll('.tab[data-tab]').forEach(function(tab){
      var active=tab===button||tab.getAttribute('data-tab')===id;
      tab.classList.toggle('active',active);
      tab.setAttribute('aria-selected',active?'true':'false');
    });
    document.querySelectorAll('.panel').forEach(function(panel){
      panel.classList.toggle('active',panel.id===id);
      panel.removeAttribute('hidden');
    });
    try{sessionStorage.setItem('mybody.activeTab',id)}catch(e){}
    window.scrollTo(0,0);
  }
  function init(){
    var nav=document.querySelector('.tabs');
    if(!nav)return;
    nav.setAttribute('role','tablist');
    document.querySelectorAll('.tab[data-tab]').forEach(function(tab){
      if(tab.tagName==='BUTTON')tab.setAttribute('type','button');
      tab.setAttribute('role','tab');
      tab.setAttribute('aria-controls',tab.getAttribute('data-tab'));
      tab.onclick=function(event){
        openTab(tab.getAttribute('data-tab'),tab);
      };
    });
    var saved='today';
    try{saved=sessionStorage.getItem('mybody.activeTab')||saved}catch(e){}
    if(location.hash&&document.getElementById(location.hash.slice(1)))saved=location.hash.slice(1);
    var initial=nav.querySelector('[data-tab="'+saved+'"]')||nav.querySelector('.tab[data-tab]');
    if(initial)openTab(initial.getAttribute('data-tab'),initial);
    window.addEventListener('hashchange',function(){
      var id=location.hash.slice(1),tab=nav.querySelector('[data-tab="'+id+'"]');
      if(tab)openTab(id,tab);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
