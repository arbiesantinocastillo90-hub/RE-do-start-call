/* Agent E: observational, cancelable presentation over the deterministic engine.
 * No combat method is called here. All timeouts are bounded and disposable. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RedoEffects = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MS = Object.freeze({ move: 170, attack: 145, impact: 145, strike: 180, room: 260 });
  const samePosition = (a, b) => a.x === b.x && a.y === b.y;
  const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  function snapshot(game) {
    return {
      roomIndex: game.roomIndex, turn: game.turn, phase: game.phase,
      player: { x: game.player.x, y: game.player.y },
      hp: game.hp, enemyHp: game.enemyHp,
      warning: game.warningIds ? Array.from(game.warningIds) : []
    };
  }
  // Pure transition classification is reusable by Node tests; it never changes Game.
  function classify(before, after) {
    if (!before || before.roomIndex !== after.roomIndex || after.turn < before.turn) {
      return ['room', after.phase === 'TELL' ? 'tell' : ''].filter(Boolean);
    }
    const out = [];
    if (before.phase !== 'TELL' && after.phase === 'TELL') out.push('tell');
    if (before.phase === 'TELL' && after.phase === 'MOVE') out.push('hide');
    if (!samePosition(before.player, after.player) &&
        manhattan(before.player, after.player) === 1 &&
        ((before.phase === 'MOVE' && after.phase === 'ATTACK') ||
         (before.phase === 'RESOLVE' && after.phase === 'TELL'))) out.push('move');
    if (before.phase === 'ATTACK' && after.phase === 'RESOLVE') out.push('resolve');
    if (before.phase === 'RESOLVE' && after.phase === 'TELL') out.push('strike');
    if (after.hp < before.hp) out.push('player-hit');
    if (after.enemyHp < before.enemyHp) out.push('enemy-hit');
    if (before.phase !== after.phase && ['REWARD', 'WIN', 'DEAD'].includes(after.phase)) out.push('room-end');
    return out;
  }
  function create(options) {
    const board = options.board;
    const tiles = options.tiles;
    const frame = options.frame;
    const playerBar = options.playerBar;
    const enemyBar = options.enemyBar;
    const prefs = options.preferences;
    const root = options.root || window;
    const layer = document.createElement('div');
    layer.className = 'redo-fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    const marker = document.createElement('span');
    marker.className = 'redo-fx-player';
    marker.setAttribute('aria-hidden', 'true');
    const marks = document.createElement('div');
    marks.className = 'redo-fx-marks';
    layer.append(marker, marks);
    board.append(layer);
    let prev = null;
    let generation = 0;
    let audio = null;
    const voices = new Set();
    const timers = new Set();
    const reducedQuery = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduced = () => Boolean((reducedQuery && reducedQuery.matches) || prefs.current().reduceMotion);
    function later(fn, delay) {
      const ticket = generation;
      const handle = root.setTimeout(() => {
        timers.delete(handle);
        if (ticket === generation) fn();
      }, delay);
      timers.add(handle);
    }
    function cancel() {
      generation++;
      for (const handle of timers) root.clearTimeout(handle);
      timers.clear();
      for (const voice of voices) {
        try { voice.stop(); } catch (_) { /* Already stopped. */ }
      }
      voices.clear();
      marks.replaceChildren();
      for (const tile of tiles) tile.classList.remove('redo-warning-once');
      for (const node of [frame, playerBar, enemyBar]) {
        node && node.classList.remove('redo-fx-hit', 'redo-fx-room');
      }
    }
    function reset() {
      cancel();
      prev = null;
      marker.hidden = true;
      marker.classList.add('redo-fx-no-glide');
    }
    function audioGain() {
      return prefs.soundGain(prefs.current());
    }
    // AudioContext is created only in a user gesture. Browsing or passive tells
    // never unlock sound; volume preferences are consulted on every cue.
    function armAudio() {
      if (!audioGain() || audio) {
        if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
        return;
      }
      const Ctx = root.AudioContext || root.webkitAudioContext;
      if (!Ctx) return;
      try { audio = new Ctx(); } catch (_) { audio = null; }
    }
    function cue(kind) {
      if (!audio || !audioGain() || audio.state !== 'running') return;
      const frequencies = { tell: 349, hide: 262, move: 196, attack: 470,
        strike: 127, hit: 110, reward: 523, room: 300 };
      if (!Object.hasOwn(frequencies, kind)) return;
      try {
        const now = audio.currentTime;
        const osc = audio.createOscillator();
        const envelope = audio.createGain();
        osc.type = kind === 'strike' || kind === 'hit' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(frequencies[kind], now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(75, frequencies[kind] * .84), now + .11);
        envelope.gain.setValueAtTime(.0001, now);
        envelope.gain.exponentialRampToValueAtTime(Math.max(.0001, audioGain() * .065), now + .012);
        envelope.gain.exponentialRampToValueAtTime(.0001, now + .13);
        osc.connect(envelope);
        envelope.connect(audio.destination);
        osc.onended = () => { voices.delete(osc); osc.disconnect(); envelope.disconnect(); };
        voices.add(osc);
        osc.start(now);
        osc.stop(now + .14);
      } catch (_) { /* Sound is enhancement, never a gameplay dependency. */ }
    }
    function tileById(key) {
      const parts = key.split(',').map(Number);
      if (parts.length !== 2 || !Number.isInteger(parts[0]) || !Number.isInteger(parts[1]) ||
          parts[0] < 0 || parts[0] >= 6 || parts[1] < 0 || parts[1] >= 6) return null;
      return tiles[parts[1] * 6 + parts[0]];
    }
    function position(next, glide) {
      const tile = tiles[next.player.y * 6 + next.player.x];
      if (!tile) return;
      marker.textContent = tile.querySelector('.symbol')?.textContent || '◉';
      marker.hidden = false;
      marker.classList.toggle('redo-fx-no-glide', !glide || reduced());
      marker.style.width = tile.offsetWidth + 'px';
      marker.style.height = tile.offsetHeight + 'px';
      marker.style.transform = 'translate3d(' + tile.offsetLeft + 'px,' + tile.offsetTop + 'px,0)';
    }
    function pulse(node) {
      if (!node || reduced()) return;
      node.classList.remove('redo-fx-hit');
      void node.offsetWidth; // Re-arm one finite animation, never a frame loop.
      node.classList.add('redo-fx-hit');
      later(() => node.classList.remove('redo-fx-hit'), MS.impact + 20);
    }
    function mark(keys, type) {
      if (reduced()) return; // Static board warnings remain independently visible.
      marks.replaceChildren();
      for (const key of keys) {
        const tile = tileById(key);
        if (!tile) continue;
        const node = document.createElement('span');
        node.className = 'redo-fx-mark redo-fx-' + type;
        node.style.left = tile.offsetLeft + 'px';
        node.style.top = tile.offsetTop + 'px';
        node.style.width = tile.offsetWidth + 'px';
        node.style.height = tile.offsetHeight + 'px';
        marks.append(node);
      }
      later(() => marks.replaceChildren(), type === 'strike' ? MS.strike : MS.attack);
    }
    function observe(game) {
      const next = snapshot(game);
      const changes = classify(prev, next);
      const before = prev;
      if (changes.includes('room')) {
        cancel(); // Invalidates effects from prior room and pending callbacks.
        if (!reduced()) {
          frame.classList.add('redo-fx-room');
          later(() => frame.classList.remove('redo-fx-room'), MS.room);
        }
        cue('room');
      }
      position(next, changes.includes('move'));
      if (changes.includes('tell')) {
        if (!reduced() && prefs.current().pulse) {
          for (const tile of tiles) {
            if (tile.classList.contains('telegraph')) tile.classList.add('redo-warning-once');
          }
        }
        cue('tell');
      }
      if (changes.includes('hide')) {
        for (const tile of tiles) tile.classList.remove('redo-warning-once');
        cue('hide');
      }
      if (changes.includes('move')) cue('move');
      if (changes.includes('strike') && before) {
        // Engine already resolved; use the SAVED tell footprint from RESOLVE,
        // never reconstruct damage geometry from the next warning.
        mark(before.warning, 'strike');
        cue('strike');
      }
      if (changes.includes('player-hit')) {
        pulse(playerBar); pulse(frame); cue('hit');
      }
      if (changes.includes('enemy-hit')) pulse(enemyBar);
      if (changes.includes('room-end')) cue('reward');
      prev = next;
    }
    function attack(cells, hit) {
      if (!cells.length) return;
      mark(cells.map(cell => cell.x + ',' + cell.y), hit ? 'attack-hit' : 'attack');
      cue('attack');
    }
    const align = () => { if (prev) position(prev, false); marks.replaceChildren(); };
    const observer = root.ResizeObserver ? new root.ResizeObserver(align) : null;
    if (observer) observer.observe(board);
    else root.addEventListener('resize', align, { passive: true });
    return Object.freeze({ observe, attack, reset, armAudio,
      dispose: () => { reset(); observer?.disconnect(); if (!observer) root.removeEventListener('resize', align); if (audio) { audio.close().catch(() => {}); audio = null; } }
    });
  }
  return Object.freeze({ MS, snapshot, classify, create });
});
