'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Prefs = require('../web/preferences.js');
let cases = 0;
const check = (name, fn) => { fn(); cases++; console.log('PASS ' + name); };
const fakeStorage = () => {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    put: (key, value) => data.set(key, value)
  };
};

check('default pre-game settings', () => {
  assert.deepEqual(Prefs.load(null), { ...Prefs.defaults });
  assert.equal(Prefs.soundGain(Prefs.defaults), 0, 'audio must be muted on a fresh install');
  assert.equal(Prefs.soundGain({sound:'quiet'}), 0.25);
});
check('round-trip preferences and isolate game state', () => {
  const storage = fakeStorage();
  const input = {
    avatar: 'star', tint: 'lilac', sound: 'off', slowTells: true,
    persistTells: true, highContrast: true, reduceMotion: true,
    scanlines: false, pulse: false, hp: 9999, roomIndex: 3
  };
  assert.equal(Prefs.save(input, storage), true);
  assert.deepEqual(Prefs.load(storage), Prefs.normalize(input));
  assert.equal(storage.getItem(Prefs.key).includes('9999'), false);
  assert.equal(storage.getItem(Prefs.key).includes('roomIndex'), false);
});
check('untrusted and malformed values cannot mutate options', () => {
  assert.deepEqual(Prefs.normalize({avatar:'<img>',sound:1000,slowTells:'yes',tint:null}), { ...Prefs.defaults });
  assert.deepEqual(Prefs.normalize([]), { ...Prefs.defaults });
  assert.equal(Prefs.soundGain({sound:'full'}),0.7);
});
check('bad JSON falls back to defaults', () => {
  const storage = fakeStorage();
  storage.put(Prefs.key, '{bad json');
  assert.deepEqual(Prefs.load(storage), { ...Prefs.defaults });
});
check('storage denied or full does not prevent play', () => {
  const storage = { getItem: () => {throw Error('SecurityError');}, setItem: () => {throw Error('QuotaExceededError');} };
  assert.deepEqual(Prefs.load(storage), { ...Prefs.defaults });
  assert.equal(Prefs.save(Prefs.defaults, storage), false);
  assert.equal(Prefs.save(Prefs.defaults, null), false);
});
check('active preferences are copies (no ambient mutations)', () => {
  Prefs.setCurrent({avatar:'diamond',sound:'full'});
  const current = Prefs.current();
  current.avatar='star';
  assert.equal(Prefs.current().avatar,'diamond');
  assert.equal(Prefs.soundGain(Prefs.current()),0.7);
});
check('menu, scripts and HUD boundaries are present', () => {
  const html = fs.readFileSync(path.join(__dirname,'../web/index.html'),'utf8');
  assert.ok(html.indexOf('src="preferences.js"') < html.indexOf('src="app.js"'));
  assert.ok(html.includes('id="setup-options"'));
  for (const id of ['avatar-preview','sound-test','sound-level','reduce-motion','high-contrast','slow-tells','persist-tells','clue-trigger']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  assert.match(html,/id="clue-panel"[^>]*hidden/);
  const aside = html.match(/<aside class="control-column"[\s\S]*?<\/aside>/)?.[0];
  assert.ok(aside,'live combat aside');
  assert.equal(aside.includes('id="log"'),false,'logs must not appear in live rail');
  assert.equal(aside.includes('id="instruction"'),false,'tactical help must not appear in live rail');
});
console.log('Pre-game UX preference tests: ' + cases + ' passed.');
