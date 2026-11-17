(function () {
  'use strict';
  const { Game, SIZE, MODS, cellsFor, p, id, distance } = window.RedoEngine;
  const $ = sel => document.querySelector(sel);
  const boardEl = $('#board');
  const tiles = [];
  let game = null;
  let hover = null;
  let showStart = true;
  let currentModal = 'intro';
  const phaseText = {
    TELL: 'STATIC / WATCH', MOVE: 'READ / MOVE', ATTACK: 'ACT / ATTACK',
    RESOLVE: 'STRIKE / RESOLVE', REWARD: 'REFLECTION / CHOOSE', WIN: 'DEMO / COMPLETE', DEAD: 'LOOP / RESET'
  };
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = p(x, y);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'cell'; button.dataset.x = String(x); button.dataset.y = String(y);
      button.setAttribute('role', 'gridcell');
      button.innerHTML = `<span class="coord">${'ABCDEF'[x]}${y + 1}</span><span class="symbol"></span><span class="name"></span>`;
      button.addEventListener('click', () => {
        if (!game) return;
        if (game.phase === 'MOVE') game.move(c);
        else if (game.phase === 'ATTACK') game.attackAt(c);
      });
      button.addEventListener('mouseenter', () => { hover = c; if (game) drawBoard(game); });
      button.addEventListener('mouseleave', () => { hover = null; if (game) drawBoard(game); });
      boardEl.append(button); tiles.push(button);
    }
  }
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
        + (s.phase === 'MOVE' && distance(c, s.player) === 1 && !info.enemy ? ' safe-option' : '');
      tile.disabled = !['MOVE', 'ATTACK'].includes(s.phase);
      tile.querySelector('.symbol').textContent = info.player ? '◉' : info.enemy ? s.room.symbol : shown ? '!' : enemyGround ? '▒' : playerGround ? '∙' : '';
      tile.querySelector('.name').textContent = info.player ? 'YOU' : info.enemy ? 'MEMORY' : shown ? 'DANGER' : '';
      tile.setAttribute('aria-label', `${'ABCDEF'[x]}${y + 1}: ${info.player ? 'you' : info.enemy ? s.room.enemy : shown ? 'incoming danger' : enemyGround ? 'harmful ground' : playerGround ? 'your lingering attack' : 'empty'}`);
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
      : s.phase === 'MOVE' ? (s.skipMove || s.slowed ? 'Movement unavailable this turn. Use HOLD.' : 'Choose one neighboring tile, or hold position. Recall the vanished danger tiles.')
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
    $('#modal').hidden = false;
    $('#modal-primary').focus();
  }
  function hideModal() { $('#modal').hidden = true; currentModal = ''; }
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
      const boon = document.createElement('span'); boon.textContent = `+ ${m.boon}`;
      const cost = document.createElement('small'); cost.textContent = `– ${m.cost}`;
      btn.append(heading, boon, cost);
      btn.onclick = () => { currentModal = ''; hideModal(); game.takeModifier(m.id); };
      list.append(btn);
    }
    $('#modal-choices').append(list);
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
  document.addEventListener('keydown', e => {
    if (!game || (e.target instanceof HTMLInputElement)) return;
    const move = { ArrowUp: p(0,-1), ArrowDown: p(0,1), ArrowLeft: p(-1,0), ArrowRight: p(1,0) };
    if (e.key in move) { e.preventDefault(); if (game.phase === 'MOVE') game.move(p(game.player.x + move[e.key].x, game.player.y + move[e.key].y)); }
    if (e.key === ' ') { e.preventDefault(); game.hold(); }
    if (e.key === '1') game.selectAttack('Jab');
    if (e.key === '2') game.selectAttack('Sweep');
    if (e.key === '3') game.selectAttack('Burst');
    if (e.key.toLowerCase() === 'e') game.comfort();
    if (e.key.toLowerCase() === 'f') game.freeze();
    if (e.key.toLowerCase() === 'r') { currentModal = ''; hideModal(); game.startRun(); }
  });
  window.__redo = { get game() { return game; }, begin }; // Test-only inspector; not a cheat UI.
})();