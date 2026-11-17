/* Agent C — quiet live HUD, opt-in memory trace, and pre-game setup.
 * This module renders the engine's existing snapshots; no attack patterns are computed here.
 */
(function () {
  'use strict';
  const { Game, SIZE, MODS, cellsFor, p, id, distance } = window.RedoEngine;
  const $ = selector => document.querySelector(selector);
  const boardEl = $('#board');
  const shellEl = $('.shell');
  const clueZone = $('#clue-zone');
  const clueTrigger = $('#clue-trigger');
  const cluePanel = $('#clue-panel');
  const tiles = [];
  const avatars = { circle: '◉', diamond: '◆', star: '✦' };
  const tints = { teal: '#79baaa', amber: '#d6b37b', lilac: '#bca0cf' };
  const directions = {
    up: p(0, -1), down: p(0, 1), left: p(-1, 0), right: p(1, 0)
  };
  const keyDirections = {
    ArrowUp: directions.up, ArrowDown: directions.down,
    ArrowLeft: directions.left, ArrowRight: directions.right
  };
  const phaseText = {
    TELL: 'WATCH', MOVE: 'MOVE', ATTACK: 'ATTACK',
    RESOLVE: 'RESOLVE', REWARD: 'CHOOSE', WIN: 'COMPLETE', DEAD: 'RESTART'
  };

  let game = null;
  let hover = null;
  let currentModal = 'setup';
  let avatar = 'circle';
  let pinned = false;
  let peekDismissed = false;
  let lastAnnouncement = '';
  shellEl.inert = true;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cell = p(x, y);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cell';
      button.dataset.x = String(x);
      button.dataset.y = String(y);
      button.innerHTML = `<span class="coord">${'ABCDEF'[x]}${y + 1}</span><span class="symbol"></span><span class="name"></span>`;
      button.addEventListener('click', () => {
        if (!game) return;
        if (game.phase === 'MOVE') game.move(cell);
        else if (game.phase === 'ATTACK') game.attackAt(cell);
      });
      button.addEventListener('mouseenter', () => { hover = cell; if (game) drawBoard(game); });
      button.addEventListener('mouseleave', () => { hover = null; if (game) drawBoard(game); });
      button.addEventListener('focus', () => { hover = cell; if (game) drawBoard(game); });
      button.addEventListener('blur', () => { hover = null; if (game) drawBoard(game); });
      boardEl.append(button);
      tiles.push(button);
    }
  }

  function drawBoard(s) {
    const preview = s.phase === 'ATTACK' && hover
      ? new Set(cellsFor(s.attackName, s.player, hover).map(id)) : new Set();
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const cell = p(x, y);
      const tile = tiles[y * SIZE + x];
      const info = s.tileInfo(cell);
      const shown = info.showWarning && info.warned;
      const playerGround = info.statuses.some(effect => effect.owner === 'player');
      const enemyGround = info.statuses.some(effect => effect.owner === 'enemy');
      tile.className = 'cell' + (playerGround ? ' player-ground' : '')
        + (enemyGround ? ' danger-ground' : '')
        + (shown && s.phase === 'TELL' ? ' telegraph' : '')
        + (shown && s.phase !== 'TELL' ? ' ghost' : '')
        + (info.enemy ? ' enemy' : '') + (info.player ? ' you' : '')
        + (preview.has(id(cell)) ? ' preview' : '')
        + (s.phase === 'MOVE' && distance(cell, s.player) === 1 && !info.enemy ? ' move-option' : '');
      tile.disabled = !['MOVE', 'ATTACK'].includes(s.phase);
      tile.querySelector('.symbol').textContent = info.player ? avatars[avatar]
        : info.enemy ? s.room.symbol : shown ? '!' : enemyGround ? '▒' : playerGround ? '∙' : '';
      tile.querySelector('.name').textContent = info.player ? 'YOU' : info.enemy ? 'MEMORY' : shown ? 'DANGER' : '';
      const details = [info.player ? 'you' : info.enemy ? s.room.enemy : 'empty'];
      if (shown) details.push(s.phase === 'TELL' ? 'next enemy strike' : 'retained warning outline');
      for (const effect of info.statuses) {
        details.push((effect.owner === 'enemy' ? 'enemy ' : 'your ') + effect.kind + ' lingering tile');
      }
      if (s.phase === 'MOVE' && distance(cell, s.player) === 1 && !info.enemy) {
        details.push('legal move; not necessarily safe');
      }
      tile.setAttribute('aria-label', 'Tile ' + 'ABCDEF'[x] + (y + 1) + ': ' + details.join('; '));
    }
  }

  function syncPeek() {
    const isFocused = clueZone.contains(document.activeElement);
    const isHovering = clueZone.matches(':hover');
    const open = !peekDismissed && (pinned || isFocused || isHovering) && $('#modal').hidden;
    cluePanel.hidden = !open;
    clueTrigger.setAttribute('aria-expanded', String(open));
  }
  clueZone.addEventListener('pointerenter', () => { peekDismissed = false; syncPeek(); });
  clueZone.addEventListener('pointerleave', () => {
    if (!clueZone.contains(document.activeElement)) peekDismissed = false;
    syncPeek();
  });
  clueZone.addEventListener('focusin', () => { peekDismissed = false; syncPeek(); });
  clueZone.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!clueZone.contains(document.activeElement)) peekDismissed = false;
      syncPeek();
    });
  });
  clueTrigger.addEventListener('click', () => {
    // First tap pins an already-hovered/focused reveal; second tap closes it.
    pinned = !pinned;
    peekDismissed = !pinned;
    syncPeek();
  });

  function announceStatus(s) {
    const summary = 'Room ' + (s.roomIndex + 1) + ', turn ' + (s.turn + 1)
      + ', ' + phaseText[s.phase] + ', health ' + Math.max(0, s.hp) + ' of ' + s.maxHp + '.';
    if (summary !== lastAnnouncement) {
      lastAnnouncement = summary;
      $('#screenreader-status').textContent = summary;
    }
  }

  function render(s) {
    if (!s) return;
    $('#fragment').textContent = String(s.roomIndex + 1).padStart(2, '0');
    $('#room-name').textContent = s.room.title;
    $('#room-line').textContent = s.room.line; // Symbolic atmosphere, not a tactical hint.
    $('#round-num').textContent = 'TURN ' + String(s.turn + 1).padStart(2, '0');
    $('#player-hp').textContent = `${Math.max(0, s.hp)} / ${s.maxHp}`;
    $('#enemy-hp').textContent = `${Math.max(0, s.enemyHp)} / ${s.enemyMaxHp}`;
    $('#enemy-label').textContent = s.room.enemy;
    $('#player-health-bar').style.width = `${Math.max(0, s.hp / s.maxHp * 100)}%`;
    $('#enemy-health-bar').style.width = `${Math.max(0, s.enemyHp / s.enemyMaxHp * 100)}%`;
    $('#phase-pill').textContent = phaseText[s.phase] || 'WAIT';
    $('#choice-step').textContent = s.phase === 'MOVE' ? 'MOVE → ATTACK'
      : s.phase === 'ATTACK' ? 'AIM → STRIKE'
      : s.phase === 'TELL' ? 'WATCH → REMEMBER' : '•••';

    // All optional mechanical explanations remain in a hidden panel, never in the live rail.
    $('#room-hint').textContent = s.room.hint;
    $('#instruction').textContent = s.phase === 'TELL'
      ? `Warning flashes for ${s.tellDuration.toFixed(2)} seconds. Remember the marked squares.`
      : s.phase === 'MOVE'
        ? (s.skipMove || s.slowed ? 'Movement unavailable this turn; hold position.'
          : (s.persistTells ? 'Amber outlines retain the next strike.' : 'Move one cardinal square or hold; recall the warning.'))
      : s.phase === 'ATTACK'
        ? 'Choose an attack shape and target. Each attack leaves a two-turn tile effect.'
      : s.phase === 'REWARD' ? 'Choose one coping modifier, each with a benefit and a drawback.'
      : s.phase === 'WIN' ? 'Three rooms cleared. This is a demonstration ending.'
      : s.phase === 'DEAD' ? 'The loop can be redrawn.' : 'The memory is resolving.';
    $('#narrative').textContent = s.events[s.events.length - 1] || 'The air does not move.';
    const log = $('#log');
    log.replaceChildren();
    for (const line of [...s.events].reverse()) {
      const li = document.createElement('li');
      li.textContent = line;
      log.append(li);
    }

    const mods = $('#mod-list');
    mods.replaceChildren();
    if (!s.owned.length) {
      const empty = document.createElement('span');
      empty.className = 'muted';
      empty.textContent = 'NONE';
      mods.append(empty);
    } else for (const modifierId of s.owned) {
      const tag = document.createElement('span');
      tag.className = 'mod-chip';
      tag.textContent = MODS.find(m => m.id === modifierId).name.toUpperCase();
      mods.append(tag);
    }
    for (const button of document.querySelectorAll('[data-attack]')) {
      button.disabled = !['MOVE', 'ATTACK'].includes(s.phase);
      button.classList.toggle('active', button.dataset.attack === s.attackName);
      button.setAttribute('aria-pressed', String(button.dataset.attack === s.attackName));
    }
    for (const button of document.querySelectorAll('[data-step]')) button.disabled = s.phase !== 'MOVE';
    $('#hold-btn').disabled = s.phase !== 'MOVE';
    $('#comfort-btn').hidden = !s.has('comfort');
    $('#comfort-btn').disabled = s.phase !== 'ATTACK' || s.has('numb');
    $('#freeze-btn').hidden = !s.has('freeze');
    $('#freeze-btn').disabled = !['MOVE', 'ATTACK'].includes(s.phase) || !s.freezeReady;
    drawBoard(s);
    announceStatus(s);
    if (s.phase === 'REWARD' && currentModal !== `reward${s.roomIndex}`) showReward(s);
    if (s.phase === 'WIN' && currentModal !== 'win') showEnd(true);
    if (s.phase === 'DEAD' && currentModal !== 'dead') showEnd(false);
    if (['TELL', 'MOVE', 'ATTACK'].includes(s.phase) && $('#modal').hidden === false && currentModal === '') hideModal();
  }

  function showModal(kicker, title, html, primary, action, setup = false) {
    $('#modal-kicker').textContent = kicker;
    $('#modal-title').innerHTML = title; // Static developer-authored copy only.
    $('#modal-text').innerHTML = html; // Static developer-authored copy only.
    $('#modal-primary').textContent = primary;
    $('#modal-primary').onclick = action;
    $('#modal-primary').hidden = false;
    $('#setup-options').hidden = !setup;
    $('#modal-choices').replaceChildren();
    shellEl.inert = true;
    $('#modal').hidden = false;
    syncPeek();
    (setup ? $('#setup-options input[name="avatar-shape"]:checked') : $('#modal-primary')).focus();
  }
  function hideModal() {
    if ($('#modal').hidden) return;
    $('#modal').hidden = true;
    currentModal = '';
    shellEl.inert = false;
    boardEl.focus({ preventScroll: true });
    syncPeek();
  }

  function begin() {
    avatar = $('input[name="avatar-shape"]:checked')?.value || 'circle';
    const tint = tints[$('#avatar-tint').value] || tints.teal;
    document.documentElement.style.setProperty('--avatar-fill', tint);
    document.body.dataset.visual = avatar;
    document.body.classList.toggle('no-scanlines', !$('#effect-scanlines').checked);
    document.body.classList.toggle('no-pulse', !$('#effect-pulse').checked);
    lastAnnouncement = '';
    pinned = false;
    peekDismissed = false;
    hideModal();
    game = new Game({
      onUpdate: render,
      slowTells: $('#slow-tells').checked,
      persistTells: $('#persist-tells').checked
    });
    render(game);
  }

  function showSetup() {
    if (game) {
      game.dispose(); // Cancel any pending tell timer before leaving combat.
      game = null;
    }
    pinned = false;
    peekDismissed = false;
    currentModal = 'setup';
    showModal('HOUSE // PREPARE', 'Before the door<br>opens.',
      'The house holds three remembered rooms. Choose how you appear and how the room feels. These settings do not alter the attack patterns.',
      'OPEN YOUR EYES', begin, true);
  }

  function showReward(s) {
    currentModal = `reward${s.roomIndex}`;
    showModal('AFTER THE SILENCE // A CHOICE', 'What kept you<br>standing?',
      'Every habit was useful once. Carry one into the next room — each has a cost.', '', () => {});
    $('#modal-primary').hidden = true;
    const list = document.createElement('div');
    list.className = 'reward-options';
    for (const modifier of s.rewardOptions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reward';
      const name = document.createElement('strong');
      name.textContent = `${modifier.badge}  ${modifier.name}`;
      const boon = document.createElement('span');
      boon.textContent = 'Benefit: ' + modifier.boon;
      const cost = document.createElement('small');
      cost.textContent = 'Cost: ' + modifier.cost;
      button.append(name, boon, cost);
      button.addEventListener('click', () => { if (game && game.takeModifier(modifier.id)) hideModal(); });
      list.append(button);
    }
    $('#modal-choices').append(list);
    list.querySelector('button')?.focus();
  }
  function showEnd(won) {
    currentModal = won ? 'win' : 'dead';
    showModal(won ? 'HOUSE // FRAGMENT RESTORED' : 'MEMORY // LOOP REPEATED',
      won ? 'The ringing<br>stops.' : 'The house<br>starts again.',
      won
        ? 'For a moment, the room becomes quiet. The phone has not answered itself. Someone can still be called.<br><br><strong>Demo complete — three rooms cleared.</strong>'
        : 'The hallway returns without blame. Another attempt is possible.<br><br><strong>This demo resets after each run.</strong>',
      'RETURN TO SETUP', showSetup);
  }

  function moveDelta(delta) {
    if (!game || game.phase !== 'MOVE') return;
    const next = p(game.player.x + delta.x, game.player.y + delta.y);
    if (game.move(next)) tiles[next.y * SIZE + next.x].focus();
  }
  for (const button of document.querySelectorAll('[data-step]')) {
    button.addEventListener('click', () => moveDelta(directions[button.dataset.step]));
  }
  for (const button of document.querySelectorAll('[data-attack]')) {
    button.addEventListener('click', () => game?.selectAttack(button.dataset.attack));
  }
  $('#hold-btn').addEventListener('click', () => game?.hold());
  $('#comfort-btn').addEventListener('click', () => game?.comfort());
  $('#freeze-btn').addEventListener('click', () => game?.freeze());
  $('#setup-btn').addEventListener('click', showSetup);
  $('#setup-options').addEventListener('submit', e => e.preventDefault());

  document.addEventListener('keydown', event => {
    if (!$('#modal').hidden) {
      if (event.key === 'Tab') {
        const focusable = [...$('#modal').querySelectorAll(
          'input:not([disabled]), select:not([disabled]), button:not([disabled]):not([hidden])'
        )].filter(element => element.getClientRects().length > 0);
        if (!focusable.length) { event.preventDefault(); return; }
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      return; // No movement, attacks, reset or hidden clues while a modal is open.
    }
    if (event.key === 'Escape' && !cluePanel.hidden) {
      pinned = false;
      peekDismissed = true;
      syncPeek();
      event.preventDefault();
      return;
    }
    if (!game || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    const delta = keyDirections[event.key];
    if (delta) {
      event.preventDefault();
      if (game.phase === 'MOVE') moveDelta(delta);
      else if (game.phase === 'ATTACK') {
        const focused = document.activeElement instanceof HTMLElement
          ? document.activeElement.closest('.cell') : null;
        const origin = focused ? p(Number(focused.dataset.x), Number(focused.dataset.y)) : game.player;
        const next = p(origin.x + delta.x, origin.y + delta.y);
        if (next.x >= 0 && next.x < SIZE && next.y >= 0 && next.y < SIZE) {
          tiles[next.y * SIZE + next.x].focus();
        }
      }
    }
    if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      game.hold();
    }
    if (event.key === '1') game.selectAttack('Jab');
    if (event.key === '2') game.selectAttack('Sweep');
    if (event.key === '3') game.selectAttack('Burst');
    if (event.key.toLowerCase() === 'e') game.comfort();
    if (event.key.toLowerCase() === 'f') game.freeze();
    if (event.key.toLowerCase() === 'r') showSetup();
  });

  function updateAvatarPreview() {
    const shape = $('input[name="avatar-shape"]:checked')?.value || 'circle';
    const tint = $('#avatar-tint').value;
    const tintNames = { teal: 'MOSS', amber: 'LAMP', lilac: 'DUSK' };
    $('#avatar-preview-glyph').textContent = avatars[shape];
    $('#avatar-preview-glyph').style.color = tints[tint] || tints.teal;
    $('#avatar-preview-copy').textContent = shape.toUpperCase() + ' / ' + (tintNames[tint] || 'MOSS');
    $('#avatar-preview').setAttribute('aria-label', 'Character preview: ' + shape + ' in ' + (tintNames[tint] || 'MOSS').toLowerCase());
  }
  for (const input of document.querySelectorAll('input[name="avatar-shape"]')) {
    input.addEventListener('change', updateAvatarPreview);
  }
  $('#avatar-tint').addEventListener('change', updateAvatarPreview);
  updateAvatarPreview();
  showSetup();
  window.__redo = { get game() { return game; }, begin, showSetup }; // Test-only inspector.
})();
