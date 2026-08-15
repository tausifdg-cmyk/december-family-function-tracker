(function () {
  'use strict';
  const fallback = document.querySelector('meta[name="app-build"]')?.content || '__BUILD__';
  function setBuild(value) {
    const build = /^\d+$/.test(String(value)) ? String(value) : fallback;
    const badge = document.getElementById('buildBadge');
    if (badge) badge.textContent = `Build #${build}`;
    document.documentElement.dataset.build = build;
  }
  async function init() {
    setBuild(fallback);
    try {
      const response = await fetch(`./build.json?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Build request failed: ${response.status}`);
      const payload = await response.json();
      if (/^\d+$/.test(String(payload.build || ''))) setBuild(payload.build);
    } catch (_) { setBuild(fallback); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
