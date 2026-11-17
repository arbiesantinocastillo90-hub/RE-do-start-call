/* Pre-game cosmetic and accessibility preferences. No gameplay state is persisted. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RedoPreferences = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const KEY = 'redo:browser-settings:v1';
  const DEFAULTS = Object.freeze({
    avatar: 'circle',
    tint: 'teal',
    slowTells: false,
    persistTells: false,
    scanlines: true,
    pulse: true,
    highContrast: false,
    reduceMotion: false,
    sound: 'off',
    volume: 100,
    muted: false
  });
  const OPTIONS = {
    avatar: ['circle', 'diamond', 'star'],
    tint: ['teal', 'amber', 'lilac'],
    sound: ['off', 'quiet', 'full']
  };
  const VOLUMES = Object.freeze({ off: 0, quiet: 0.25, full: 0.7 });
  const BOOLEAN_KEYS = ['slowTells', 'persistTells', 'scanlines', 'pulse', 'highContrast', 'reduceMotion', 'muted'];

  function normalize(value) {
    const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const next = { ...DEFAULTS };
    for (const key of Object.keys(OPTIONS)) {
      if (OPTIONS[key].includes(input[key])) next[key] = input[key];
    }
    for (const key of BOOLEAN_KEYS) {
      if (typeof input[key] === 'boolean') next[key] = input[key];
    }
    // Percent volume is bounded and numeric. Existing v1 saves default to 100%.
    if (typeof input.volume === 'number' && Number.isFinite(input.volume)) {
      next.volume = Math.max(0, Math.min(100, Math.round(input.volume)));
    }
    return next;
  }
  function defaultStorage() {
    try { return root.localStorage || null; }
    catch (_) { return null; } // Blocked storage or sandboxed embedding.
  }
  function load(storage = defaultStorage()) {
    try {
      return normalize(storage ? JSON.parse(storage.getItem(KEY) || 'null') : null);
    } catch (_) {
      return normalize(null); // Invalid JSON or privacy restrictions.
    }
  }
  function save(value, storage = defaultStorage()) {
    const safe = normalize(value);
    try {
      if (!storage) return false;
      storage.setItem(KEY, JSON.stringify(safe));
      return true;
    } catch (_) {
      return false; // Quota, private browsing and disabled storage must never block play.
    }
  }
  let active = normalize(null);
  return Object.freeze({
    key: KEY,
    defaults: DEFAULTS,
    normalize,
    load,
    save,
    current: () => ({ ...active }),
    setCurrent: value => { active = normalize(value); return { ...active }; },
    soundGain: value => {
      const safe = normalize(value);
      return safe.muted ? 0 : VOLUMES[safe.sound] * safe.volume / 100;
    }
  });
});
