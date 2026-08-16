/* MYBODY 2.0 iPhone step sync and app sharing.
   The preferred PWA flow uploads Apple Health steps from Shortcuts to a
   capability-protected cloud endpoint. The PWA retrieves the latest value
   when it is foregrounded, so hourly automations never need to open Safari.
   The legacy URL-fragment and optional native HealthKit bridge remain
   compatible. */
(function () {
  'use strict';

  const Store = window.MyBodyStore;
  if (!Store) throw new Error('MyBodyStore must load before health-sync.js');

  const SHORTCUT_READY_KEY = 'mybody.shortcut.ready.v1';
  const SYNC_TOKEN_PREFIX = 'mybody.ios-sync.token.v1.';
  const LAST_CLOUD_CHECK_PREFIX = 'mybody.ios-sync.checked.v1.';
  const BACKGROUND_SYNC_ENDPOINT = 'https://vucmcxkgpghnahnocirk.supabase.co/functions/v1/ios-step-sync';
  const HOUR = 60 * 60 * 1000;
  const MIN_CLOUD_CHECK_AGE = 5 * 60 * 1000;
  let cloudPullPromise = null;

  const $ = (selector) => document.querySelector(selector);
  const nativeBridge = () => window.webkit?.messageHandlers?.healthkit;
  const isNative = () => Boolean(nativeBridge());
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const shortcutReady = () => localStorage.getItem(SHORTCUT_READY_KEY) === '1';
  const profileId = () => localStorage.getItem(Store.SESSION_KEY) || 'default';
  const syncTokenKey = () => `${SYNC_TOKEN_PREFIX}${profileId()}`;
  const lastCloudCheckKey = () => `${LAST_CLOUD_CHECK_PREFIX}${profileId()}`;

  function cleanAppUrl() {
    const url = new URL('./', window.location.href);
    url.hash = '';
    url.search = '';
    return url.href;
  }

  function shortcutTemplate() {
    return `${cleanAppUrl()}#mybody-sync?steps=STEP_TOTAL`;
  }

  function createSyncToken() {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function syncToken(create = true) {
    const key = syncTokenKey();
    let token = localStorage.getItem(key) || '';
    if (!token && create) {
      token = createSyncToken();
      localStorage.setItem(key, token);
    }
    return token;
  }

  function backgroundSyncConfig() {
    return { endpoint: BACKGROUND_SYNC_ENDPOINT, token: syncToken() };
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
    const ready = isNative() || (shortcutReady() && Boolean(syncToken(false)));
    const syncTime = formatSyncTime(current.syncedAt);
    const age = current.syncedAt ? Date.now() - new Date(current.syncedAt).getTime() : Infinity;
    const due = ready && age > HOUR;
    const next = current.syncedAt ? new Date(new Date(current.syncedAt).getTime() + HOUR) : null;
    const status = $('#healthSyncStatus');
    const quick = $('#quickStepSyncStatus');
    const badge = $('#hourlySyncBadge');

    if (status) {
      if (current.syncedAt) status.textContent = `${current.steps.toLocaleString()} steps from ${current.source} • Last sync ${syncTime}${due ? ' • Background upload due' : ` • Next upload by ${formatSyncTime(next.toISOString())}`}`;
      else if (isNative()) status.textContent = 'Apple Health is ready. Tap Sync now to request today’s steps.';
      else if (ready) status.textContent = 'Background Shortcut connected. Tap Sync now to check for its latest upload.';
      else status.textContent = 'Connect an Apple Shortcut to upload steps hourly without opening Safari.';
    }
    if (quick) quick.textContent = current.syncedAt ? `${syncTime}${due ? ' • due' : ''}` : ready ? 'Cloud ready' : 'Setup';
    if (badge) {
      badge.classList.toggle('ready', ready && !due);
      badge.classList.toggle('due', due);
      badge.textContent = !ready ? 'Setup needed' : due ? 'Upload due' : isNative() ? 'HealthKit ready' : 'Background ready';
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

  function populateSetupValues() {
    const config = backgroundSyncConfig();
    const endpoint = $('#shortcutSyncEndpoint');
    const token = $('#shortcutSyncToken');
    if (endpoint) endpoint.textContent = config.endpoint;
    if (token) token.textContent = config.token;
  }

  function openSetup() {
    const sheet = $('#iosShortcutSheet');
    if (!sheet) return;
    populateSetupValues();
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

  async function copyEndpoint() {
    await copyText(BACKGROUND_SYNC_ENDPOINT);
    toast('Background endpoint copied');
  }

  async function copyToken() {
    await copyText(syncToken());
    toast('Private sync token copied');
  }

  async function createShortcut() {
    if (!isIOS()) {
      toast('Open MYBODY 2.0 on an iPhone to create the Apple Shortcut.', 'error');
      return;
    }
    try {
      await copyText(syncToken());
      toast('Private token copied. Opening Shortcuts…');
      window.setTimeout(() => { window.location.href = 'shortcuts://create-shortcut'; }, 220);
    } catch (_) {
      toast('Could not copy the private sync token.', 'error');
    }
  }

  function markShortcutReady() {
    localStorage.setItem(SHORTCUT_READY_KEY, '1');
    closeSetup();
    updateStatus();
    toast('Background iPhone sync marked ready');
    pullCloudSteps({ force: true });
  }

  async function cloudRequest(payload) {
    const response = await fetch(BACKGROUND_SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.error || 'Background step sync is unavailable.');
    return data;
  }

  async function pullCloudSteps({ feedback = false, force = false } = {}) {
    if (isNative()) return false;
    const token = syncToken(false);
    if (!token || !shortcutReady()) {
      if (feedback) openSetup();
      return false;
    }
    const lastCheck = Number(localStorage.getItem(lastCloudCheckKey()) || 0);
    if (!force && Date.now() - lastCheck < MIN_CLOUD_CHECK_AGE) return false;
    if (cloudPullPromise) return cloudPullPromise;
    $('#quickStepSyncBtn')?.classList.add('syncing');
    cloudPullPromise = (async () => {
      try {
        const data = await cloudRequest({ action: 'read', token });
        localStorage.setItem(lastCloudCheckKey(), String(Date.now()));
        if (!data.found || data.date !== Store.localDate()) {
          if (feedback) toast('No iPhone step upload for today yet.', 'error');
          return false;
        }
        const saved = saveSteps(data.steps, 'Apple Health background sync', data.updatedAt || new Date().toISOString());
        if (saved === false) throw new Error('Could not save the uploaded step total.');
        if (feedback) toast(`${Number(saved).toLocaleString()} iPhone steps retrieved`);
        return saved;
      } catch (error) {
        if (feedback) toast(error.message || 'Could not check background steps.', 'error');
        return false;
      } finally {
        $('#quickStepSyncBtn')?.classList.remove('syncing');
        cloudPullPromise = null;
      }
    })();
    return cloudPullPromise;
  }

  function manualSync() {
    if (isNative()) {
      $('#quickStepSyncBtn')?.classList.add('syncing');
      nativeBridge().postMessage({ action: 'syncSteps' });
      return;
    }
    if (!shortcutReady() || !syncToken(false)) {
      openSetup();
      return;
    }
    pullCloudSteps({ feedback: true, force: true });
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
    $('#quickStepSyncBtn')?.addEventListener('click', manualSync);
    $('#manualStepSyncBtn')?.addEventListener('click', manualSync);
    $('#setupIosShortcutBtn')?.addEventListener('click', openSetup);
    $('#closeIosShortcutSheet')?.addEventListener('click', closeSetup);
    $('#copyShortcutEndpointBtn')?.addEventListener('click', copyEndpoint);
    $('#copyShortcutTokenBtn')?.addEventListener('click', copyToken);
    $('#createIosShortcutBtn')?.addEventListener('click', createShortcut);
    $('#markShortcutReadyBtn')?.addEventListener('click', markShortcutReady);
    $('#shareAppBtn')?.addEventListener('click', shareApp);
    $('#shareAppSettingsBtn')?.addEventListener('click', shareApp);
    window.addEventListener('hashchange', consumeShortcutHash);
    window.addEventListener('focus', () => pullCloudSteps());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        updateStatus();
        pullCloudSteps();
      }
    });
    consumeShortcutHash();
    updateStatus();
    window.setInterval(updateStatus, 60 * 1000);
    if (isNative()) nativeBridge().postMessage({ action: 'requestSteps' });
    else pullCloudSteps();
  }

  window.MyBodyHealthSync = Object.freeze({
    parseShortcutHash,
    consumeShortcutHash,
    saveSteps,
    manualSync,
    pullCloudSteps,
    receiveNativeSteps,
    shareApp,
    shortcutTemplate,
    backgroundSyncConfig,
    updateStatus,
    isNative
  });
  window.appleHealthSteps = Object.freeze({ syncNow: manualSync, saveSteps, receiveNativeSteps, isNative });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
