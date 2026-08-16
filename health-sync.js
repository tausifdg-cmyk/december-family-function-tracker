/* MYBODY 2.0 iPhone step sync and app sharing.
   Web/PWA mode accepts Apple Shortcut data through the URL fragment, which is
   never sent to the web server. The optional native wrapper continues to use
   its HealthKit WKWebView bridge. */
(function () {
  'use strict';

  const Store = window.MyBodyStore;
  if (!Store) throw new Error('MyBodyStore must load before health-sync.js');

  const SHORTCUT_NAME = 'MYBODY Step Sync';
  const SHORTCUT_READY_KEY = 'mybody.shortcut.ready.v1';
  const HOUR = 60 * 60 * 1000;

  const $ = (selector) => document.querySelector(selector);
  const nativeBridge = () => window.webkit?.messageHandlers?.healthkit;
  const isNative = () => Boolean(nativeBridge());
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const shortcutReady = () => localStorage.getItem(SHORTCUT_READY_KEY) === '1';

  function cleanAppUrl() {
    const url = new URL('./', window.location.href);
    url.hash = '';
    url.search = '';
    return url.href;
  }

  function shortcutTemplate() {
    return `${cleanAppUrl()}#mybody-sync?steps=STEP_TOTAL`;
  }

  function todayActivity() {
    const state = Store.read();
    const activity = state.activity?.[Store.localDate()] || {};
    return {
      steps: Store.number(activity.steps, 0, 0, 200000),
      source: activity.stepsSource || activity.stepSource || 'Manual',
      syncedAt: activity.stepsSyncedAt || activity.stepSyncedAt || ''
    };
  }

  function saveSteps(steps, source = 'Apple Shortcut', syncedAt = new Date().toISOString()) {
    const value = Math.round(Store.number(String(steps).replaceAll(',', ''), NaN, 0, 200000));
    if (!Number.isFinite(value)) return false;
    const state = Store.read();
    const date = Store.localDate();
    state.activity[date] = {
      ...(state.activity[date] || {}),
      steps: value,
      stepsSource: source,
      stepsSyncedAt: syncedAt
    };
    const result = Store.write(state);
    if (!result.ok) return false;
    localStorage.setItem(SHORTCUT_READY_KEY, '1');
    window.MyBodyApp?.render?.();
    updateStatus();
    window.dispatchEvent(new CustomEvent('mybody:steps-synced', { detail: { steps: value, source, syncedAt } }));
    return value;
  }

  function parseShortcutHash(hash = window.location.hash) {
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw.startsWith('mybody-sync?')) return null;
    const params = new URLSearchParams(raw.slice('mybody-sync?'.length));
    const steps = Number(String(params.get('steps') || '').replaceAll(',', ''));
    if (!Number.isFinite(steps) || steps < 0 || steps > 200000) return { error: 'The Shortcut did not provide a valid step total.' };
    return { steps: Math.round(steps) };
  }

  function consumeShortcutHash() {
    const payload = parseShortcutHash();
    if (!payload) return false;
    if (!localStorage.getItem(Store.SESSION_KEY)) return false;
    const destination = `${window.location.pathname}${window.location.search}#today`;
    window.history.replaceState(null, '', destination);
    if (payload.error) {
      toast(payload.error, 'error');
      return false;
    }
    const saved = saveSteps(payload.steps, 'Apple Health via Shortcut');
    if (saved === false) {
      toast('Could not save the iPhone step total.', 'error');
      return false;
    }
    toast(`${Number(saved).toLocaleString()} steps synced from iPhone`);
    window.dispatchEvent(new CustomEvent('mybody:navigate', { detail: { id: 'today' } }));
    return true;
  }

  function formatSyncTime(iso) {
    const value = new Date(iso);
    if (!iso || Number.isNaN(value.getTime())) return '';
    return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function updateStatus() {
    const current = todayActivity();
    const ready = isNative() || shortcutReady();
    const syncTime = formatSyncTime(current.syncedAt);
    const age = current.syncedAt ? Date.now() - new Date(current.syncedAt).getTime() : Infinity;
    const due = ready && age > HOUR;
    const next = current.syncedAt ? new Date(new Date(current.syncedAt).getTime() + HOUR) : null;
    const status = $('#healthSyncStatus');
    const quick = $('#quickStepSyncStatus');
    const badge = $('#hourlySyncBadge');

    if (status) {
      if (current.syncedAt) status.textContent = `${current.steps.toLocaleString()} steps from ${current.source} • Last sync ${syncTime}${due ? ' • Hourly sync due' : ` • Next by ${formatSyncTime(next.toISOString())}`}`;
      else if (isNative()) status.textContent = 'Apple Health is ready. Tap Sync now to request today’s steps.';
      else if (ready) status.textContent = 'Shortcut connected. Run it once, then add your hourly Time of Day automations.';
      else status.textContent = 'Connect an Apple Shortcut to bring today’s step total into this app without a paid developer account.';
    }
    if (quick) quick.textContent = current.syncedAt ? `${syncTime}${due ? ' • due' : ''}` : ready ? 'Ready' : 'Manual';
    if (badge) {
      badge.classList.toggle('ready', ready && !due);
      badge.classList.toggle('due', due);
      badge.textContent = !ready ? 'Setup needed' : due ? 'Sync due' : isNative() ? 'HealthKit ready' : 'Hourly ready';
    }
  }

  function toast(message, type = 'success') {
    const node = $('#appToast');
    if (!node) return;
    node.textContent = message;
    node.dataset.type = type;
    node.classList.add('show');
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => node.classList.remove('show'), 2600);
  }

  function openSetup() {
    const sheet = $('#iosShortcutSheet');
    if (!sheet) return;
    const template = $('#shortcutSyncTemplate');
    if (template) template.textContent = shortcutTemplate();
    sheet.classList.remove('hidden');
    document.body.classList.add('modal-open');
    sheet.querySelector('.sheet-panel')?.focus({ preventScroll: true });
  }

  function closeSetup() {
    $('#iosShortcutSheet')?.classList.add('hidden');
    if (!document.querySelector('.sheet-backdrop:not(.hidden),.media-lightbox:not(.hidden)')) document.body.classList.remove('modal-open');
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    return copied;
  }

  async function createShortcut() {
    if (!isIOS()) {
      toast('Open MYBODY 2.0 on an iPhone to create the Apple Shortcut.', 'error');
      return;
    }
    try {
      await copyText(shortcutTemplate());
      toast('Sync-link template copied. Opening Shortcuts…');
      window.setTimeout(() => { window.location.href = 'shortcuts://create-shortcut'; }, 220);
    } catch (_) {
      toast('Could not copy the sync-link template.', 'error');
    }
  }

  function markShortcutReady() {
    localStorage.setItem(SHORTCUT_READY_KEY, '1');
    closeSetup();
    updateStatus();
    toast('iPhone Shortcut marked ready');
  }

  function manualSync() {
    if (isNative()) {
      $('#quickStepSyncBtn')?.classList.add('syncing');
      nativeBridge().postMessage({ action: 'syncSteps' });
      return;
    }
    if (!isIOS() || !shortcutReady()) {
      openSetup();
      return;
    }
    $('#quickStepSyncBtn')?.classList.add('syncing');
    window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;
    window.setTimeout(() => $('#quickStepSyncBtn')?.classList.remove('syncing'), 2500);
  }

  function receiveNativeSteps(payload = {}) {
    $('#quickStepSyncBtn')?.classList.remove('syncing');
    if (payload.error) {
      toast(`Apple Health: ${payload.error}`, 'error');
      return false;
    }
    const saved = saveSteps(payload.steps, 'Apple Health', payload.syncedAt || new Date().toISOString());
    if (saved === false) return false;
    toast(`${Number(saved).toLocaleString()} steps synced from Apple Health`);
    return true;
  }

  async function shareApp() {
    const data = { title: 'MYBODY 2.0', text: 'Track workouts, food, steps and progress with MYBODY 2.0.', url: cleanAppUrl() };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await copyText(data.url);
      toast('App link copied');
    } catch (error) {
      if (error?.name !== 'AbortError') toast('Could not share the app link.', 'error');
    }
  }

  function init() {
    const template = $('#shortcutSyncTemplate');
    if (template) template.textContent = shortcutTemplate();
    $('#quickStepSyncBtn')?.addEventListener('click', manualSync);
    $('#manualStepSyncBtn')?.addEventListener('click', manualSync);
    $('#setupIosShortcutBtn')?.addEventListener('click', openSetup);
    $('#closeIosShortcutSheet')?.addEventListener('click', closeSetup);
    $('#createIosShortcutBtn')?.addEventListener('click', createShortcut);
    $('#markShortcutReadyBtn')?.addEventListener('click', markShortcutReady);
    $('#shareAppBtn')?.addEventListener('click', shareApp);
    $('#shareAppSettingsBtn')?.addEventListener('click', shareApp);
    window.addEventListener('hashchange', consumeShortcutHash);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) updateStatus(); });
    consumeShortcutHash();
    updateStatus();
    window.setInterval(updateStatus, 60 * 1000);
    if (isNative()) nativeBridge().postMessage({ action: 'requestSteps' });
  }

  window.MyBodyHealthSync = Object.freeze({
    parseShortcutHash,
    consumeShortcutHash,
    saveSteps,
    manualSync,
    receiveNativeSteps,
    shareApp,
    shortcutTemplate,
    updateStatus,
    isNative
  });
  // Keep the existing WKWebView bridge contract used by the optional native wrapper.
  window.appleHealthSteps = Object.freeze({ syncNow: manualSync, saveSteps, receiveNativeSteps, isNative });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
