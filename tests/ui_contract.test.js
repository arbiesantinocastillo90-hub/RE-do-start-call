'use strict';
/* Dependency-free UI contract checks — the real DOM still needs manual browser QA. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Game } = require('../web/engine.js');

const html = fs.readFileSync('web/index.html', 'utf8');
const css = fs.readFileSync('web/style.css', 'utf8');
const app = fs.readFileSync('web/app.js', 'utf8');
const godot = fs.readFileSync('scripts/main.gd', 'utf8');
const rightRail = html.match(/<aside class="control-column"[^>]*>([\s\S]*?)<\/aside>/)?.[1];
assert.ok(rightRail, 'right rail must exist');
for (const id of ['phase-pill', 'player-hp', 'enemy-hp', 'hold-btn', 'mod-list']) {
  assert.match(rightRail, new RegExp('id="' + id + '"'), 'missing live essential ' + id);
}
for (const id of ['instruction', 'room-hint', 'narrative', 'log', 'slow-tells', 'persist-tells', 'setup-options']) {
  assert.doesNotMatch(rightRail, new RegExp('id="' + id + '"'), id + ' must not be in live right rail');
}
assert.match(html, /id="clue-panel"[^>]*hidden/, 'optional tactical copy must begin hidden');
for (const id of ['instruction', 'room-hint', 'narrative', 'log']) {
  const panel = html.match(/id="clue-panel"[^>]*>([\s\S]*?)<\/div>/)?.[1] || '';
  assert.match(panel, new RegExp('id="' + id + '"'), id + ' must belong to optional reveal');
}
assert.match(html, /id="clue-trigger"[^>]*aria-expanded="false"[^>]*aria-controls="clue-panel"/);
assert.match(app, /clueTrigger\.setAttribute\('aria-expanded', String\(open\)\)/);
assert.match(app, /cluePanel\.hidden = !open/);
assert.match(html, /role="dialog" aria-modal="true"/);
for (const id of ['setup-options', 'avatar-tint', 'avatar-preview', 'slow-tells', 'persist-tells', 'effect-scanlines', 'effect-pulse']) {
  assert.match(html, new RegExp('id="' + id + '"'), 'missing pregame choice ' + id);
}
assert.match(html, /name="avatar-shape" value="circle"/);
assert.match(html, /name="avatar-shape" value="diamond"/);
assert.match(html, /name="avatar-shape" value="star"/);
assert.match(html, /data-step="up"/);
assert.match(html, /data-step="down"/);
assert.match(css, /\.clue-panel\[hidden\]/, 'hidden panel must override CSS display');
assert.match(css, /prefers-reduced-motion:reduce/, 'reduced motion override must remain');
assert.match(app, /event\.key === 'Escape'/, 'optional tactical text must be dismissible');
assert.match(app, /return; \/\/ No movement, attacks, reset or hidden clues while a modal is open/);
assert.match(godot, /func _open_setup\(\)/);
assert.match(godot, /func _sync_clue\(\)/);
assert.match(godot, /func _begin_from_setup\(\)/);
assert.match(godot, /setup_overlay\.visible/);
assert.match(godot, /clue_details\.add_child\(log_label\)/);

let armed;
let cleared = 0;
let renders = 0;
const stopped = new Game({
  timer: callback => { armed = callback; return 42; },
  clearTimer: token => { assert.equal(token, 42); cleared++; },
  onUpdate: () => { renders++; }
});
assert.equal(stopped.phase, 'TELL');
const before = renders;
stopped.dispose();
assert.equal(cleared, 1);
armed(); // Simulate a queued callback racing with menu navigation.
assert.equal(stopped.phase, 'STOPPED');
assert.equal(renders, before, 'stale tells must not render behind the pre-game setup');
console.log('PASS: quiet right rail, hidden optional notes, pre-game controls, keyboard semantics and stale-timer cancellation');
