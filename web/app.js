(function () {
  'use strict';
  const { Game, SIZE, MODS, cellsFor, p, id, distance } = window.RedoEngine;
  const $ = sel => document.querySelector(sel);
  const boardEl = $('#board');
  // Agent E owns in-game presentation only; do not change engine turn semantics.
  const boardFrame = $('.board-frame');
  const aidVault = $('#aid-vault');
  const aidTrigger = $('#aid-trigger');
  const playerMarker = document.createElement('span');
  playerMarker.className = 'player-marker no-motion';
  playerMarker.setAttribute('aria-hidden', 'true');
  playerMarker.innerHTML = '<span class="marker-core">◉</span>';
  const strikeLayer = document.createElement('div');
  strikeLayer.className = 'strike-layer';
  strikeLayer.setAttribute('aria-hidden', 'true');
  let priorFrame = null;
  let strikeSerial = 0;
  const flashTimers = new WeakMap();
  const tiles = [];
  let game = null;
  let hover = null;
  let showStart = true;
  let currentModal = 'intro';
  const shellEl = $('.shell');
  shellEl.inert = true;
  const phaseText = {
    TELL: 'STATIC / WATCH', MOVE: 'READ / MOVE', ATTACK: 'ACT / ATTACK',
    RESOLVE: 'STRIKE / RESOLVE', REWARD: 'REFLECTION / CHOOSE', WIN: 'DEMO / COMPLETE', DEAD: 'LOOP / RESET'
  };
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = p(x, y);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'cell'; button.dataset.x = String(x); button.dataset.y = String(y);
      button.innerHTML = `<span class="coord">${'ABCDEF'[x]}${y + 1}</span><span class="symbol"></span><span class="name"></span>`;
      button.addEventListener('click', () => {
        if (!game) return;
        if (game.phase === 'MOVE') game.move(c);
        else if (game.phase === 'ATTACK') attemptAttack(c);
      });
      button.addEventListener('mouseenter', () => { hover = c; if (game) drawBoard(game); });
      button.addEventListener('mouseleave', () => { hover = null; if (game) drawBoard(game); });
      button.addEventListener('focus', () => { hover = c; if (game) drawBoard(game); });
      button.addEventListener('blur', () => { hover = null; if (game) drawBoard(game); });
      boardEl.append(button); tiles.push(button);
    }
  }

  boardEl.append(playerMarker, strikeLayer);
  boardEl.classList.add('has-player-marker');

  // Hover and keyboard focus reveal details temporarily. Tap/click pins them.
  function syncAid() {
    const expanded = aidVault.classList.contains('is-open') ||
      aidVault.matches(':hover') || aidVault.contains(document.activeElement);
    aidTrigger.setAttribute('aria-expanded', String(expanded));
  }
  aidTrigger.addEventListener('click', () => {
    aidVault.classList.toggle('is-open');
    syncAid();
  });
  for (const type of ['mouseenter', 'mouseleave', 'focusin']) {
    aidVault.addEventListener(type, syncAid);
  }
  aidVault.addEventListener('focusout', () => window.setTimeout(syncAid, 0));

  function positionMarker(s, previous) {
    const tile = tiles[s.player.y * SIZE + s.player.x];
    // Animate only a deliberate cardinal MOVE -> ATTACK transition; never a reset/room spawn.
    const walked = previous && previous.roomIndex === s.roomIndex &&
      previous.phase === 'MOVE' && s.phase === 'ATTACK' &&
      distance(previous.player, s.player) === 1;
    playerMarker.classList.toggle('no-motion', !walked);
    playerMarker.style.width = tile.offsetWidth + 'px';
    playerMarker.style.height = tile.offsetHeight + 'px';
    playerMarker.style.setProperty('--marker-x', tile.offsetLeft + 'px');
    playerMarker.style.setProperty('--marker-y', tile.offsetTop + 'px');
  }

  function pulse(node, className) {
    const former = flashTimers.get(node);
    if (former) window.clearTimeout(former);
    node.classList.remove(className);
    // Re-arm a one-shot transition without adding observers or animation loops.
    void node.offsetWidth;
    node.classList.add(className);
    const handle = window.setTimeout(() => {
      node.classList.remove(className);
      flashTimers.delete(node);
    }, 460);
    flashTimers.set(node, handle);
  }

  function strikeFeedback(cells, directHit, enemy) {
    const serial = ++strikeSerial;
    strikeLayer.replaceChildren();
    function mark(c, style) {
      const tile = tiles[c.y * SIZE + c.x];
      const el = document.createElement('span');
      el.className = 'strike-mark ' + style;
      el.style.left = tile.offsetLeft + 'px';
      el.style.top = tile.offsetTop + 'px';
      el.style.width = tile.offsetWidth + 'px';
      el.style.height = tile.offsetHeight + 'px';
      strikeLayer.append(el);
    }
    for (const cell of cells) mark(cell, 'strike-trace');
    if (directHit) mark(enemy, 'strike-impact');
    window.setTimeout(() => {
      if (serial === strikeSerial) strikeLayer.replaceChildren();
    }, 450);
  }

  // All attack effects are observational; the engine still resolves each action once.
  function attemptAttack(c) {
    if (!game || game.phase !== 'ATTACK') return;
    const cells = cellsFor(game.attackName, game.player, c);
    const enemy = { ...game.enemy };
    const directHit = cells.some(tile => tile.x === enemy.x && tile.y === enemy.y);
    if (game.attackAt(c)) strikeFeedback(cells, directHit, enemy);
  }

  function alignOnResize() {
    if (!game) return;
    positionMarker(game, null);
    strikeSerial++;
    strikeLayer.replaceChildren();
  }
  if ('ResizeObserver' in window) new ResizeObserver(alignOnResize).observe(boardEl);
  else window.addEventListener('resize', alignOnResize, { passive: true });

  function drawBoard(s) {
    const preview = s.phase === 'ATTACK' && hover ? new Set(cellsFor(s.attackName, s.player, hover).map(id)) : new Set();
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const c = p(x, y), tile = tiles[y * SIZE + x], info = s.tileInfo(c);
      const shown = info.showWarning && info.warned;
      const statuses = info.statuses;
      const playerGround = statuses.some(e => e.owner === 'player');
      const enemyGround = statuses.some(e => e.owner === 'enemy');
      tile.className = 'cell' + (playerGround ? ' player-ground' : '') + (enemyGround ? ' danger-ground' : '')
        + (shown && s.phase === 'TELL' ? ' telegraph' : '') + (shown && s.phase !== 'TELL' ? ' ghost' : '')
        + (info.enemy ? ' enemy' : '') + (info.player ? ' you' : '')
        + (preview.has(id(c)) ? ' preview' : '')
        + (s.phase === 'MOVE' && distance(c, s.player) === 1 && !info.enemy ? ' move-option' : '');
      tile.disabled = !['MOVE', 'ATTACK'].includes(s.phase);
      tile.querySelector('.symbol').textContent = info.player ? '◉' : info.enemy ? s.room.symbol : shown ? '!' : enemyGround ? '▒' : playerGround ? '∙' : '';
      tile.querySelector('.name').textContent = info.player ? 'YOU' : info.enemy ? 'MEMORY' : shown ? 'DANGER' : '';
      const details = [info.player ? 'you' : info.enemy ? s.room.enemy : 'empty'];
      if (shown) details.push(s.phase === 'TELL' ? 'next enemy strike' : 'retained next-strike outline');
      for (const effect of statuses) details.push((effect.owner === 'enemy' ? 'enemy ' : 'your ') + effect.kind + ' lingering tile');
      if (s.phase === 'MOVE' && distance(c, s.player) === 1 && !info.enemy) details.push('legal move; not necessarily safe');
      tile.setAttribute('aria-label', 'Tile ' + 'ABCDEF'[x] + (y + 1) + ': ' + details.join('; '));
    }
  }
  function render(s) {
    if (!s) return;
    $('#fragment').textContent = String(s.roomIndex + 1).padStart(2, '0');
    $('#room-name').textContent = s.room.title;
    $('#room-line').textContent = s.room.line;
    $('#round-num').textContent = 'TURN ' + String(s.turn + 1).padStart(2, '0');
    $('#player-hp').textContent = `${Math.max(0, s.hp)} / ${s.maxHp}`;
    $('#enemy-hp').textContent = `${Math.max(0, s.enemyHp)} / ${s.enemyMaxHp}`;
    $('#enemy-label').textContent = s.room.enemy;
    $('#player-health-bar').style.width = `${Math.max(0, s.hp / s.maxHp * 100)}%`;
    $('#enemy-health-bar').style.width = `${Math.max(0, s.enemyHp / s.enemyMaxHp * 100)}%`;
    $('#phase-pill').textContent = phaseText[s.phase] || 'UNKNOWN';
    $('#choice-step').textContent = s.phase === 'MOVE' ? 'MOVE → ATTACK' : s.phase === 'ATTACK' ? 'AIM → STRIKE' : s.phase === 'TELL' ? 'WATCH → REMEMBER' : '•••';
    $('#instruction').textContent = s.phase === 'TELL' ? `Watch the flash for ${s.tellDuration.toFixed(2)} seconds. Then remember where it was.`
      : s.phase === 'MOVE' ? (s.skipMove || s.slowed ? 'Movement unavailable this turn. Use HOLD.' : ('Choose one neighboring tile, or hold position. ' + (s.persistTells ? 'Amber outlines show the next strike.' : 'Recall the vanished danger tiles.')))
      : s.phase === 'ATTACK' ? 'Choose an attack shape, then click a valid target. Your attack leaves a 2-turn tile effect.'
      : s.phase === 'REWARD' ? 'A choice between rooms. Each modifier helps and harms.'
      : s.phase === 'WIN' ? 'The phone falls silent. You survived the three-room demonstration.'
      : s.phase === 'DEAD' ? 'The loop restarts. Try another route.' : 'The memory is resolving.';
    $('#narrative').textContent = s.events[s.events.length - 1] || 'The air does not move.';
    $('#mod-count').textContent = `${String(s.owned.length).padStart(2, '0')} / 08`;
    const mods = $('#mod-list'); mods.replaceChildren();
    if (!s.owned.length) { const sp = document.createElement('span'); sp.className = 'muted'; sp.textContent = 'Nothing has been carried forward yet.'; mods.append(sp); }
    else for (const id of s.owned) { const tag = document.createElement('span'); tag.className = 'mod-chip'; tag.textContent = MODS.find(m => m.id === id).name.toUpperCase(); mods.append(tag); }
    const log = $('#log'); log.replaceChildren();
    for (const line of [...s.events].reverse()) { const li = document.createElement('li'); li.textContent = line; log.append(li); }
    for (const btn of document.querySelectorAll('[data-attack]')) {
      btn.disabled = !['MOVE', 'ATTACK'].includes(s.phase);
      btn.classList.toggle('active', btn.dataset.attack === s.attackName);
      btn.setAttribute('aria-pressed', btn.dataset.attack === s.attackName ? 'true' : 'false');
    }
    $('#hold-btn').disabled = s.phase !== 'MOVE';
    $('#comfort-btn').hidden = !s.has('comfort');
    $('#comfort-btn').disabled = s.phase !== 'ATTACK' || s.has('numb');
    $('#freeze-btn').hidden = !s.has('freeze');
    $('#freeze-btn').disabled = !['MOVE', 'ATTACK'].includes(s.phase) || !s.freezeReady;
    drawBoard(s);

    // Compare successive notified snapshots, including damage from lingering ground.
    if (priorFrame && priorFrame.roomIndex === s.roomIndex) {
      if (s.hp < priorFrame.hp) {
        pulse($('#player-health-bar').parentElement, 'fx-health-hit');
        pulse(boardFrame, 'fx-player-hit');
      }
      if (s.enemyHp < priorFrame.enemyHp) pulse($('#enemy-health-bar').parentElement, 'fx-health-hit');
    }
    if (!priorFrame || priorFrame.roomIndex !== s.roomIndex || s.turn < priorFrame.turn) {
      ++strikeSerial;
      strikeLayer.replaceChildren();
    }
    positionMarker(s, priorFrame);
    priorFrame = {
      roomIndex: s.roomIndex, turn: s.turn, phase: s.phase,
      hp: s.hp, enemyHp: s.enemyHp, player: { ...s.player }
    };
    if (s.phase === 'REWARD' && currentModal !== `reward${s.roomIndex}`) showReward(s);
    if (s.phase === 'WIN' && currentModal !== 'win') showEnd(s, true);
    if (s.phase === 'DEAD' && currentModal !== 'dead') showEnd(s, false);
    if (['TELL', 'MOVE', 'ATTACK'].includes(s.phase) && !showStart) hideModal();
  }
  function showModal(kicker, title, html, primary, action) {
    $('#modal-kicker').textContent = kicker; $('#modal-title').innerHTML = title;
    $('#modal-text').innerHTML = html;
    $('#modal-primary').textContent = primary;
    $('#modal-primary').onclick = action;
    $('#modal-choices').replaceChildren();
    $('#modal-primary').hidden = false;
    shellEl.inert = true;
    $('#modal').hidden = false;
    $('#modal-primary').focus();
  }
  function hideModal() {
    if ($('#modal').hidden) return;
    $('#modal').hidden = true; currentModal = '';
    shellEl.inert = false;
    boardEl.focus({ preventScroll: true });
  }
  function begin() {
    showStart = false;
    currentModal = '';
    hideModal();
    game = new Game({ onUpdate: render, slowTells: $('#slow-tells').checked, persistTells: $('#persist-tells').checked });
    render(game);
  }
  function showReward(s) {
    currentModal = `reward${s.roomIndex}`;
    showModal('AFTER THE SILENCE // A CHOICE', 'What kept you<br>standing?',
      'Every habit was useful once. You may carry one into the next room — but each one has a cost.', '', () => {});
    $('#modal-primary').hidden = true;
    const list = document.createElement('div'); list.className = 'reward-options';
    for (const m of s.rewardOptions) {
      const btn = document.createElement('button'); btn.className = 'reward'; btn.type = 'button';
      const heading = document.createElement('strong'); heading.textContent = `${m.badge}  ${m.name}`;
      const boon = document.createElement('span'); boon.textContent = `Benefit: ${m.boon}`;
      const cost = document.createElement('small'); cost.textContent = `Cost: ${m.cost}`;
      btn.append(heading, boon, cost);
      btn.onclick = () => { if (game.takeModifier(m.id)) hideModal(); };
      list.append(btn);
    }
    $('#modal-choices').append(list);
    list.querySelector('button')?.focus();
  }
  function showEnd(s, won) {
    currentModal = won ? 'win' : 'dead';
    showModal(won ? 'HOUSE // FRAGMENT RESTORED' : 'MEMORY // LOOP REPEATED',
      won ? 'The ringing<br>stops.' : 'The house<br>starts again.',
      won ? 'For a moment, the room becomes quiet. The phone has not answered itself. Someone can still be called.<br><br><strong>Demo complete — all three rooms cleared.</strong> This is not the full ending of the story.'
        : 'You lose your footing, and the room folds back into the hallway.<br><br><strong>No progress is permanent in this demo.</strong> Learn the patterns, make different choices, and try again.',
      won ? 'PLAY AGAIN' : 'WAKE AGAIN', () => { currentModal = ''; hideModal(); game.startRun(); });
  }
  for (const b of document.querySelectorAll('[data-attack]')) b.addEventListener('click', () => game?.selectAttack(b.dataset.attack));
  $('#hold-btn').addEventListener('click', () => game?.hold());
  $('#comfort-btn').addEventListener('click', () => game?.comfort());
  $('#freeze-btn').addEventListener('click', () => game?.freeze());
  $('#restart-btn').addEventListener('click', () => { if (game) { currentModal = ''; hideModal(); game.startRun(); } else begin(); });
  $('#slow-tells').addEventListener('change', () => game?.setAccessibility({ slowTells: $('#slow-tells').checked }));
  $('#persist-tells').addEventListener('change', () => game?.setAccessibility({ persistTells: $('#persist-tells').checked }));
  $('#modal-primary').onclick = begin;
  $('#modal-primary').focus();
  document.addEventListener('keydown', e => {
    if (!$('#modal').hidden) {
      if (e.key === 'Tab') {
        const focusables = [...$('#modal').querySelectorAll('button:not([hidden]):not(:disabled)')];
        if (!focusables.length) { e.preventDefault(); return; }
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return; // Never let movement, attack or reset shortcuts affect a modal choice.
    }
    if (!game || (e.target instanceof HTMLInputElement)) return;
    const move = { ArrowUp: p(0,-1), ArrowDown: p(0,1), ArrowLeft: p(-1,0), ArrowRight: p(1,0) };
    if (e.key in move) {
      e.preventDefault();
      const delta = move[e.key];
      if (game.phase === 'MOVE') {
        const next = p(game.player.x + delta.x, game.player.y + delta.y);
        if (game.move(next)) tiles[next.y * SIZE + next.x].focus();
      } else if (game.phase === 'ATTACK') {
        const focused = document.activeElement instanceof HTMLElement ? document.activeElement.closest('.cell') : null;
        const origin = focused ? p(Number(focused.dataset.x), Number(focused.dataset.y)) : game.player;
        const next = p(origin.x + delta.x, origin.y + delta.y);
        if (next.x >= 0 && next.x < SIZE && next.y >= 0 && next.y < SIZE) tiles[next.y * SIZE + next.x].focus();
      }
    }
    // Let focused buttons keep native Space/Enter activation (including tile attacks).
    if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); game.hold(); }
    if (e.key === '1') game.selectAttack('Jab');
    if (e.key === '2') game.selectAttack('Sweep');
    if (e.key === '3') game.selectAttack('Burst');
    if (e.key.toLowerCase() === 'e') game.comfort();
    if (e.key.toLowerCase() === 'f') game.freeze();
    if (e.key.toLowerCase() === 'r') { hideModal(); game.startRun(); }
  });
  window.__redo = { get game() { return game; }, begin }; // Test-only inspector; not a cheat UI.
})();