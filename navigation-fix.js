(function () {
  'use strict';
  const VALID_TABS = new Set(['today', 'workout', 'food', 'progress', 'settings']);
  let activeTab = 'today';
  function resetScroll() {
    const shell = document.querySelector('.app-shell');
    if (shell) {
      try { shell.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }
      catch (_) { shell.scrollTop = 0; shell.scrollLeft = 0; }
    }
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (_) {}
  }
  function selectTab(requested, options = {}) {
    const id = VALID_TABS.has(requested) && document.getElementById(requested) ? requested : 'today';
    activeTab = id;
    document.querySelectorAll('.tab[data-tab]').forEach((tab) => {
      const active = tab.dataset.tab === id;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('.panel').forEach((panel) => {
      const active = panel.id === id;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });
    try { sessionStorage.setItem('mybody.activeTab', id); } catch (_) {}
    if (options.updateHash !== false && location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
    if (options.scroll !== false) requestAnimationFrame(resetScroll);
    window.dispatchEvent(new CustomEvent('mybody:tabchange', { detail: { id } }));
  }
  function handleNavClick(event) {
    const tab = event.target.closest('.tab[data-tab]');
    if (!tab) return;
    event.preventDefault();
    selectTab(tab.dataset.tab);
  }
  function handleKeydown(event) {
    const tab = event.target.closest('.tab[data-tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = Array.from(document.querySelectorAll('.tab[data-tab]'));
    const current = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    selectTab(tabs[next].dataset.tab);
  }
  function init() {
    const nav = document.querySelector('.tabs');
    if (!nav || nav.dataset.navigationReady === '1') return;
    nav.dataset.navigationReady = '1';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Primary');
    nav.addEventListener('click', handleNavClick);
    nav.addEventListener('keydown', handleKeydown);
    document.querySelectorAll('.tab[data-tab]').forEach((tab) => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', tab.dataset.tab);
    });
    let initial = location.hash.slice(1);
    try { if (!VALID_TABS.has(initial)) initial = sessionStorage.getItem('mybody.activeTab') || 'today'; } catch (_) { initial = 'today'; }
    selectTab(initial, { updateHash: false, scroll: false });
    window.addEventListener('hashchange', () => selectTab(location.hash.slice(1), { updateHash: false }));
    window.addEventListener('mybody:navigate', (event) => selectTab(event.detail?.id));
  }
  window.MyBodyNavigation = Object.freeze({ select: selectTab, current: () => activeTab });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
