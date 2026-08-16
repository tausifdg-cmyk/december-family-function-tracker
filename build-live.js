(function () {
  'use strict';
  const metaBuild = document.querySelector('meta[name="app-build"]')?.content || '__BUILD__';
  const currentBuild = /^\d+$/.test(String(metaBuild)) ? Number(metaBuild) : 0;
  const THRESHOLD = 66;
  const MAX_PULL = 96;
  let startY = 0;
  let pullDistance = 0;
  let tracking = false;
  let checking = false;
  let resetTimer = 0;

  function setBuild(value) {
    const build = /^\d+$/.test(String(value)) ? String(value) : String(metaBuild);
    const badge = document.getElementById('buildBadge');
    if (badge) badge.textContent = `Build #${build}`;
    document.documentElement.dataset.build = build;
  }

  function indicator() {
    return document.getElementById('pullRefresh');
  }

  function setIndicator(message, options = {}) {
    const node = indicator();
    if (!node) return;
    const distance = Number.isFinite(options.distance) ? options.distance : pullDistance;
    node.style.setProperty('--pull-distance', `${Math.max(0, distance)}px`);
    node.style.setProperty('--pull-progress', String(Math.min(1, Math.max(0, distance / THRESHOLD))));
    node.classList.toggle('visible', options.visible !== false);
    node.classList.toggle('ready', Boolean(options.ready));
    node.classList.toggle('checking', Boolean(options.checking));
    node.setAttribute('aria-hidden', options.visible === false ? 'true' : 'false');
    const label = node.querySelector('span');
    if (label) label.textContent = message;
  }

  function resetIndicator(delay = 0) {
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      pullDistance = 0;
      setIndicator('Pull to check for update', { distance: 0, visible: false });
    }, delay);
  }

  function withTimeout(promise, milliseconds) {
    return Promise.race([
      promise,
      new Promise((resolve) => window.setTimeout(resolve, milliseconds))
    ]);
  }

  async function prepareServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration('./');
    if (!registration) return;
    await registration.update().catch(() => {});
    const worker = registration.waiting || registration.installing;
    if (worker?.state === 'installed') worker.postMessage('SKIP_WAITING');
    if (worker && worker.state !== 'installed' && worker.state !== 'activated') {
      await withTimeout(new Promise((resolve) => {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' || worker.state === 'activated' || worker.state === 'redundant') resolve();
        });
      }), 3500);
      if (registration.waiting) registration.waiting.postMessage('SKIP_WAITING');
    }
  }

  function reloadForBuild(build) {
    const next = new URL(window.location.href);
    next.searchParams.set('build', String(build));
    window.location.replace(next.toString());
  }

  async function checkForBuild() {
    if (checking) return;
    checking = true;
    pullDistance = THRESHOLD;
    setIndicator('Checking for a new build…', { distance: THRESHOLD, visible: true, checking: true });
    try {
      const response = await fetch(`./build.json?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Build request failed: ${response.status}`);
      const payload = await response.json();
      const latest = /^\d+$/.test(String(payload.build || '')) ? Number(payload.build) : 0;
      if (!latest) throw new Error('Invalid build response');
      if (currentBuild && latest > currentBuild) {
        setIndicator(`Build #${latest} found — updating…`, { distance: THRESHOLD, visible: true, checking: true, ready: true });
        await prepareServiceWorker();
        window.setTimeout(() => reloadForBuild(latest), 250);
        return;
      }
      setIndicator(`Up to date • Build #${currentBuild || latest}`, { distance: THRESHOLD, visible: true, ready: true });
      resetIndicator(1400);
    } catch (_) {
      setIndicator('Offline — unable to check for update', { distance: THRESHOLD, visible: true });
      resetIndicator(1800);
    } finally {
      checking = false;
    }
  }

  function canStart(event) {
    if (checking || window.scrollY > 0 || event.touches?.length !== 1) return false;
    if (document.body.classList.contains('modal-open')) return false;
    return !event.target.closest('input,select,textarea,[contenteditable="true"]');
  }

  function onTouchStart(event) {
    if (!canStart(event)) return;
    startY = event.touches[0].clientY;
    pullDistance = 0;
    tracking = true;
  }

  function onTouchMove(event) {
    if (!tracking || checking) return;
    const delta = event.touches[0].clientY - startY;
    if (delta <= 0 || window.scrollY > 0) {
      pullDistance = 0;
      setIndicator('Pull to check for update', { distance: 0, visible: false });
      return;
    }
    event.preventDefault();
    pullDistance = Math.min(MAX_PULL, delta * .55);
    const ready = pullDistance >= THRESHOLD;
    setIndicator(ready ? 'Release to check for update' : 'Pull to check for update', { distance: pullDistance, visible: true, ready });
  }

  function onTouchEnd() {
    if (!tracking) return;
    tracking = false;
    if (pullDistance >= THRESHOLD) checkForBuild();
    else resetIndicator(80);
  }

  function init() {
    setBuild(currentBuild || metaBuild);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }
  window.MyBodyBuild = Object.freeze({ current: currentBuild, check: checkForBuild });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
