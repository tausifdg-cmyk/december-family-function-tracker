/* MYBODY 2.0 phone step sync and app sharing.
   iPhone keeps the established Apple Health Shortcut flow. Android devices
   are detected automatically and use the optional native Health Connect
   bridge, including hourly background uploads when the device permits them.
   The legacy URL-fragment and native HealthKit bridge remain compatible. */
(function () {
  'use strict';

  const Store = window.MyBodyStore;
  if (!Store) throw new Error('MyBodyStore must load before health-sync.js');

  const SHORTCUT_READY_KEY = 'mybody.shortcut.ready.v1';
  const SYNC_TOKEN_PREFIX = 'mybody.ios-sync.token.v1.';
  const LAST_CLOUD_CHECK_PREFIX = 'mybody.ios-sync.checked.v1.';
  const PENDING_SHORTCUT_SYNC_PREFIX = 'mybody.ios-sync.pending.v1.';
  const BACKGROUND_SYNC_ENDPOINT = 'https://vucmcxkgpghnahnocirk.supabase.co/functions/v1/ios-step-sync';
  const SHORTCUT_INSTALL_URL = 'https://www.icloud.com/shortcuts/597e590247364aacb1540443b3489b0a';
  const SHORTCUT_NAME = 'MYBODY step Sync';
  const SHORTCUT_RUN_URL = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;
  const ANDROID_APK_URL = 'https://github.com/tausifdg-cmyk/december-family-function-tracker/releases/download/android-latest/mybody-android.apk';
  const HOUR = 60 * 60 * 1000;
  const MIN_CLOUD_CHECK_AGE = 5 * 60 * 1000;
  const SHORTCUT_RETURN_DELAY = 700;
  const SHORTCUT_PENDING_TTL = 2 * 60 * 1000;
  let cloudPullPromise = null;

  const $ = (selector) => document.querySelector(selector);
  const iosNativeBridge = () => window.webkit?.messageHandlers?.healthkit;
  const androidNativeBridge = () => window.MyBodyAndroidHealth;
  const isIOSNative = () => Boolean(iosNativeBridge());
  const isAndroidNative = () => Boolean(androidNativeBridge()?.requestSteps);
  const isNative = () => isIOSNative() || isAndroidNative();
  function detectPlatform(userAgent = navigator.userAgent || '', platform = navigator.platform || '', maxTouchPoints = navigator.maxTouchPoints || 0) {
    if (/Android/i.test(userAgent)) return 'android';
    if (/iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)) return 'ios';
    return 'other';
  }
  const platform = () => detectPlatform();
  const isIOS = () => platform() === 'ios';
  const shortcutReady = () => localStorage.getItem(SHORTCUT_READY_KEY) === '1';
  const profileId = () => localStorage.getItem(Store.SESSION_KEY) || 'default';
  const syncTokenKey = () => `${SYNC_TOKEN_PREFIX}${profileId()}`;
  const lastCloudCheckKey = () => `${LAST_CLOUD_CHECK_PREFIX}${profileId()}`;
  const pendingShortcutSyncKey = () => `${PENDING_SHORTCUT_SYNC_PREFIX}${profileId()}`;

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
    const device = platform();
    const syncTime = formatSyncTime(current.syncedAt);
    const age = current.syncedAt ? Date.now() - new Date(current.syncedAt).getTime() : Infinity;
    const due = ready && age > HOUR;
    const next = current.syncedAt ? new Date(new Date(current.syncedAt).getTime() + HOUR) : null;
    const status = $('#healthSyncStatus');
    const quick = $('#quickStepSyncStatus');
    const badge = $('#hourlySyncBadge');
    const eyebrow = $('#stepSyncEyebrow');
    const title = $('#iosStepSyncTitle');
    const deviceLabel = $('#detectedDeviceLabel');
    const setupButton = $('#setupIosShortcutBtn');
    const privacy = $('#stepSyncPrivacy');
    const quickButton = $('#quickStepSyncBtn');

    if (device === 'android') {
      if (eyebrow) eyebrow.textContent = 'ANDROID STEPS';
      if (title) title.textContent = 'Health Connect';
      if (deviceLabel) deviceLabel.textContent = isAndroidNative() ? 'Android app detected • native connection active' : 'Android detected • companion app required';
      if (setupButton) setupButton.textContent = isAndroidNative() ? 'Health permissions' : 'Set up Android sync';
      if (privacy) privacy.textContent = 'Health Connect permissions stay on this Android device. MYBODY syncs only today’s date and step total.';
      if (quickButton) quickButton.setAttribute('aria-label', 'Sync Android steps now');
    } else if (device === 'ios') {
      if (eyebrow) eyebrow.textContent = 'IPHONE STEPS';
      if (title) title.textContent = isIOSNative() ? 'Apple Health' : 'Apple Health Shortcut';
      if (deviceLabel) deviceLabel.textContent = isIOSNative() ? 'iPhone app detected • HealthKit connection active' : 'iPhone detected • Shortcut connection';
      if (setupButton) setupButton.textContent = isIOSNative() ? 'Health permissions' : 'Set up iPhone sync';
      if (privacy) privacy.textContent = 'The Shortcut sends only the date and step total to a private endpoint protected by a device-specific token.';
      if (quickButton) quickButton.setAttribute('aria-label', 'Sync iPhone steps now');
    } else {
      if (eyebrow) eyebrow.textContent = 'PHONE STEPS';
      if (title) title.textContent = 'Phone step sync';
      if (deviceLabel) deviceLabel.textContent = 'Desktop browser detected • connect from your phone';
      if (setupButton) setupButton.textContent = 'View iPhone setup';
      if (privacy) privacy.textContent = 'Only today’s date and step total are synced. Health permissions remain on your phone.';
      if (quickButton) quickButton.setAttribute('aria-label', 'Sync phone steps now');
    }

    if (status) {
      if (current.syncedAt) status.textContent = `${current.steps.toLocaleString()} steps from ${current.source} • Last sync ${syncTime}${due ? ' • Background upload due' : ` • Next upload by ${formatSyncTime(next.toISOString())}`}`;
      else if (isAndroidNative()) status.textContent = 'Health Connect is ready. Tap Sync now to read today’s Android steps.';
      else if (isIOSNative()) status.textContent = 'Apple Health is ready. Tap Sync now to request today’s steps.';
      else if (device === 'android') status.textContent = 'Install the Android companion to connect Health Connect. A browser or PWA cannot read health data directly.';
      else if (ready) status.textContent = `Shortcut connected. Tap Sync now to run ${SHORTCUT_NAME} and upload fresh steps.`;
      else status.textContent = 'Connect an Apple Shortcut to upload steps hourly without opening Safari.';
    }
    if (quick) quick.textContent = current.syncedAt ? `${syncTime}${due ? ' • due' : ''}` : ready ? 'Cloud ready' : 'Setup';
    if (badge) {
      badge.classList.toggle('ready', ready && !due);
      badge.classList.toggle('due', due);
      badge.textContent = !ready ? (device === 'android' ? 'App needed' : 'Setup needed') : due ? 'Upload due' : isAndroidNative() ? 'Health Connect ready' : isIOSNative() ? 'HealthKit ready' : 'Background ready';
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
    if (platform() === 'android') {
      if (isAndroidNative()) {
        androidNativeBridge().requestAuthorization?.();
        return;
      }
      const androidSheet = $('#androidHealthSheet');
      if (!androidSheet) return;
      androidSheet.classList.remove('hidden');
      document.body.classList.add('modal-open');
      androidSheet.querySelector('.sheet-panel')?.focus({ preventScroll: true });
      return;
    }
    const sheet = $('#iosShortcutSheet');
    if (!sheet) return;
    populateSetupValues();
    sheet.classList.remove('hidden');
    document.body.classList.add('modal-open');
    sheet.querySelector('.sheet-panel')?.focus({ preventScroll: true });
  }

  function closeSetup() {
    $('#iosShortcutSheet')?.classList.add('hidden');
    $('#androidHealthSheet')?.classList.add('hidden');
    if (!document.querySelector('.sheet-backdrop:not(.hidden),.media-lightbox:not(.hidden)')) document.body.classList.remove('modal-open');
  }

  function openAppInstall() {
    const sheet = $('#appInstallSheet');
    if (!sheet) return;
    sheet.classList.remove('hidden');
    document.body.classList.add('modal-open');
    sheet.querySelector('.sheet-panel')?.focus({ preventScroll: true });
  }

  function closeAppInstall() {
    $('#appInstallSheet')?.classList.add('hidden');
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

  async function copyIosAppLink() {
    await copyText(cleanAppUrl());
    toast('iPhone app link copied');
  }

  async function installShortcut() {
    if (!isIOS()) {
      toast('Open MYBODY 2.0 on an iPhone to install the Apple Shortcut.', 'error');
      return;
    }
    try {
      await copyText(syncToken());
      toast('Private token copied. Opening the Shortcut installer…');
      window.setTimeout(() => { window.location.href = SHORTCUT_INSTALL_URL; }, 220);
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
          if (feedback) toast('No phone step upload for today yet.', 'error');
          return false;
        }
        const saved = saveSteps(data.steps, 'Apple Health background sync', data.updatedAt || new Date().toISOString());
        if (saved === false) throw new Error('Could not save the uploaded step total.');
        if (feedback) toast(`${Number(saved).toLocaleString()} phone steps retrieved`);
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

  function launchShortcutSync() {
    localStorage.setItem(pendingShortcutSyncKey(), String(Date.now()));
    $('#quickStepSyncBtn')?.classList.add('syncing');
    $('#manualStepSyncBtn')?.classList.add('syncing');
    toast(`Opening ${SHORTCUT_NAME}…`);
    window.location.href = SHORTCUT_RUN_URL;
    return true;
  }

  function resumeShortcutSync() {
    const key = pendingShortcutSyncKey();
    const launchedAt = Number(localStorage.getItem(key) || 0);
    if (!launchedAt) return false;
    localStorage.removeItem(key);
    if (Date.now() - launchedAt > SHORTCUT_PENDING_TTL) {
      $('#quickStepSyncBtn')?.classList.remove('syncing');
      $('#manualStepSyncBtn')?.classList.remove('syncing');
      return false;
    }
    window.setTimeout(() => {
      pullCloudSteps({ feedback: true, force: true }).finally(() => {
        $('#manualStepSyncBtn')?.classList.remove('syncing');
      });
    }, SHORTCUT_RETURN_DELAY);
    return true;
  }

  function manualSync() {
    if (isAndroidNative()) {
      $('#quickStepSyncBtn')?.classList.add('syncing');
      androidNativeBridge().requestSteps();
      return;
    }
    if (isIOSNative()) {
      $('#quickStepSyncBtn')?.classList.add('syncing');
      iosNativeBridge().postMessage({ action: 'syncSteps' });
      return;
    }
    if (platform() === 'android') {
      openSetup();
      return;
    }
    if (!shortcutReady() || !syncToken(false)) {
      openSetup();
      return;
    }
    if (isIOS()) {
      launchShortcutSync();
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

  function receiveAndroidSteps(payload = {}) {
    $('#quickStepSyncBtn')?.classList.remove('syncing');
    if (payload.error) {
      toast(`Health Connect: ${payload.error}`, 'error');
      return false;
    }
    const source = payload.source || 'Android Health Connect';
    const saved = saveSteps(payload.steps, source, payload.syncedAt || new Date().toISOString());
    if (saved === false) return false;
    toast(`${Number(saved).toLocaleString()} steps synced from Health Connect`);
    return true;
  }

  function configureAndroidBridge() {
    if (!isAndroidNative()) return false;
    const config = backgroundSyncConfig();
    try {
      androidNativeBridge().configureBackgroundSync?.(JSON.stringify(config));
      return true;
    } catch (_) {
      return false;
    }
  }

  async function shareApp() {
    const iosUrl = cleanAppUrl();
    const data = {
      title: 'MYBODY 2.0',
      text: `MYBODY 2.0\niPhone / iPad app: ${iosUrl}\nAndroid APK: ${ANDROID_APK_URL}`,
      url: iosUrl
    };
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
    $('#closeAndroidHealthSheet')?.addEventListener('click', closeSetup);
    $('#androidSetupDoneBtn')?.addEventListener('click', closeSetup);
    $('#copyShortcutEndpointBtn')?.addEventListener('click', copyEndpoint);
    $('#copyShortcutTokenBtn')?.addEventListener('click', copyToken);
    $('#createIosShortcutBtn')?.addEventListener('click', installShortcut);
    $('#markShortcutReadyBtn')?.addEventListener('click', markShortcutReady);
    $('#shareAppBtn')?.addEventListener('click', shareApp);
    $('#shareAppSettingsBtn')?.addEventListener('click', shareApp);
    $('#shareInstallLinksBtn')?.addEventListener('click', shareApp);
    $('#appInstallOptionsBtn')?.addEventListener('click', openAppInstall);
    $('#openAppInstallBtn')?.addEventListener('click', openAppInstall);
    $('#copyIosAppLinkBtn')?.addEventListener('click', copyIosAppLink);
    $('#appInstallSheet [data-action="close-app-install"]')?.addEventListener('click', closeAppInstall);
    $('#appInstallSheet')?.addEventListener('click', (event) => {
      if (event.target.id === 'appInstallSheet') closeAppInstall();
    });
    window.addEventListener('hashchange', consumeShortcutHash);
    window.addEventListener('focus', () => {
      if (!resumeShortcutSync()) pullCloudSteps();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        updateStatus();
        if (!resumeShortcutSync()) pullCloudSteps();
      }
    });
    consumeShortcutHash();
    updateStatus();
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true || isNative();
    $('#webInstallPrompt')?.classList.toggle('hidden', standalone);
    window.setInterval(updateStatus, 60 * 1000);
    if (isAndroidNative()) {
      configureAndroidBridge();
      androidNativeBridge().requestSteps();
    } else if (isIOSNative()) iosNativeBridge().postMessage({ action: 'requestSteps' });
    else if (!resumeShortcutSync()) pullCloudSteps();
  }

  window.MyBodyHealthSync = Object.freeze({
    parseShortcutHash,
    consumeShortcutHash,
    saveSteps,
    manualSync,
    pullCloudSteps,
    installShortcut,
    launchShortcutSync,
    resumeShortcutSync,
    receiveNativeSteps,
    receiveAndroidSteps,
    shareApp,
    openAppInstall,
    shortcutTemplate,
    backgroundSyncConfig,
    shortcutInstallUrl: () => SHORTCUT_INSTALL_URL,
    shortcutRunUrl: () => SHORTCUT_RUN_URL,
    updateStatus,
    detectPlatform,
    isNative,
    isAndroidNative
  });
  window.appleHealthSteps = Object.freeze({ syncNow: manualSync, saveSteps, receiveNativeSteps, isNative });
  window.androidHealthSteps = Object.freeze({ syncNow: manualSync, saveSteps, receiveAndroidSteps, isNative: isAndroidNative });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
