/* RE:(do)(start)(call) — portable, deterministic 6x6 turn engine.
 * Browser build and Node tests share this exact source. No DOM dependencies.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RedoEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SIZE = 6;
  const p = (x, y) => ({ x, y });
  const id = c => `${c.x},${c.y}`;
  const inside = c => c.x >= 0 && c.x < SIZE && c.y >= 0 && c.y < SIZE;
  const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const same = (a, b) => a.x === b.x && a.y === b.y;
  const row = y => Array.from({ length: SIZE }, (_, x) => p(x, y));
  const col = x => Array.from({ length: SIZE }, (_, y) => p(x, y));
  const diag = (sum, n) => Array.from({ length: SIZE * SIZE }, (_, k) => p(k % SIZE, Math.floor(k / SIZE)))
    .filter(c => sum ? c.x + c.y === n : c.x - c.y === n);
  const ring = (center, radius) => Array.from({ length: SIZE * SIZE }, (_, k) => p(k % SIZE, Math.floor(k / SIZE)))
    .filter(c => distance(c, center) === radius);
  const unique = a => [...new Map(a.map(c => [id(c), c])).values()];

  function cellsFor(attack, origin, target) {
    if (!inside(origin) || !inside(target) || same(target, origin)) return [];
    const delta = p(target.x - origin.x, target.y - origin.y);
    if (attack === 'Jab') return distance(origin, target) === 1 ? [target] : [];
    if (attack === 'Sweep') {
      if (!((delta.x === 0 && delta.y !== 0) || (delta.y === 0 && delta.x !== 0))) return [];
      const step = p(Math.sign(delta.x), Math.sign(delta.y));
      return [1, 2, 3].map(i => p(origin.x + step.x * i, origin.y + step.y * i)).filter(inside);
    }
    if (attack === 'Burst') {
      if (distance(origin, target) > 2) return [];
      return [p(0, 0), p(1, 0), p(-1, 0), p(0, 1), p(0, -1)]
        .map(offset => p(target.x + offset.x, target.y + offset.y)).filter(inside);
    }
    return [];
  }

  const ROOMS = [
    { title: 'THE HALLWAY', enemy: 'RUSTED PIPE', symbol: '╎', hp: 7, pos: p(4, 2), spawn: p(1, 2), tell: .95, damage: 2, effect: 'rust', effectDamage: 1,
      line: 'The corridor remembers a sound dragged across the floor.', hint: 'Its strikes follow straight lines.' },
    { title: 'THE WINDOW ROOM', enemy: 'MELTED HANGER', symbol: '⌁', hp: 10, pos: p(4, 1), spawn: p(1, 4), tell: .70, damage: 2, effect: 'drip', effectDamage: 0,
      line: 'Sunlight leaves a crooked shadow where a coat should be.', hint: 'Diagonal shadows never stand still.' },
    { title: 'THE ROOM THAT RINGS', enemy: 'THE UNANSWERED CALL', symbol: '◎', hp: 15, pos: p(4, 2), spawn: p(1, 4), tell: .60, damage: 3, effect: 'echo', effectDamage: 1,
      line: 'A phone rings in a room where no one speaks.', hint: 'Crosses, diagonals, and rings. Remember the rhythm.' }
  ];
  const MODS = [
    { id: 'hyper', name: 'Hypervigilance', boon: '+0.45 seconds to read danger', cost: '+1 damage from a direct strike', badge: '◉' },
    { id: 'numb', name: 'Numb', boon: 'Ignore floor damage', cost: 'Cannot regain health', badge: '◇' },
    { id: 'comfort', name: 'Comfort Object', boon: 'Exchange an attack for 2 HP on a safe tile', cost: 'Lose the attack that turn', badge: '♡' },
    { id: 'fight', name: 'Fight Response', boon: '+1 attack damage', cost: 'Your attack traces hurt you too', badge: '✳' },
    { id: 'freeze', name: 'Freeze', boon: 'Block one enemy strike per room', cost: 'Lose movement next turn', badge: '❄' },
    { id: 'bracing', name: 'Bracing', boon: '-1 direct strike damage', cost: '-2 maximum health', badge: '▣' },
    { id: 'tunnel', name: 'Tunnel Vision', boon: '+2 Sweep damage', cost: '-0.18 seconds warning time', badge: '▭' },
    { id: 'flinch', name: 'Flinch', boon: 'Once per room, dodge to an adjacent safe tile', cost: '-1 to all attack damage', badge: '↗' }
  ];

  function patternFor(room, turn) {
    const t = turn % 4;
    if (room === 0) return [
      { name: 'PIPE / HORIZONTAL', cells: row(2) },
      { name: 'PIPE / VERTICAL', cells: col(1) },
      { name: 'PIPE / HORIZONTAL', cells: row(4) },
      { name: 'PIPE / VERTICAL', cells: col(4) }
    ][t];
    if (room === 1) return [
      { name: 'HANGER / DIAGONAL', cells: diag(true, 5) },
      { name: 'HANGER / DIAGONAL', cells: diag(false, 0) },
      { name: 'HANGER / DIAGONAL', cells: diag(true, 3) },
      { name: 'HANGER / DIAGONAL', cells: diag(false, 2) }
    ][t];
    return [
      { name: 'CALL / CROSS', cells: unique([...row(2), ...col(2)]).filter(c => !same(c, p(2, 2))) },
      { name: 'CALL / DIAGONAL', cells: unique([...diag(true, 5), ...diag(false, 0)]) },
      { name: 'CALL / NEAR RING', cells: ring(p(3, 2), 2) },
      { name: 'CALL / FAR RING', cells: ring(p(3, 2), 3) }
    ][t];
  }

  class Game {
    // Bind default browser timers through closures; calling detached window.setTimeout
    // as this.timer(...) raises "Illegal invocation" in Chromium.
    constructor({ onUpdate = () => {}, rng = Math.random, timer = (fn, ms) => setTimeout(fn, ms), clearTimer = handle => clearTimeout(handle), slowTells = false, persistTells = false } = {}) {
      this.onUpdate = onUpdate;
      this.rng = rng;
      this.timer = timer;
      this.clearTimer = clearTimer;
      this.slowTells = slowTells;
      this.persistTells = persistTells;
      this.pendingTimer = null;
      this.generation = 0;
      this.startRun();
    }
    notify() { this.onUpdate(this); }
    log(message) {
      this.events.push(message);
      while (this.events.length > 5) this.events.shift();
    }
    has(id) { return this.owned.includes(id); }
    startRun() {
      this.generation++;
      if (this.pendingTimer) this.clearTimer(this.pendingTimer);
      this.hp = 14; this.maxHp = 14; this.owned = []; this.events = [];
      this.attackName = 'Jab'; this.score = 0;
      this.log('You open your eyes. A house that remembers you is waiting.');
      this.startRoom(0);
    }
    startRoom(index) {
      this.generation++;
      if (this.pendingTimer) this.clearTimer(this.pendingTimer);
      this.roomIndex = index;
      this.room = ROOMS[index];
      this.player = { ...this.room.spawn };
      this.enemy = { ...this.room.pos };
      this.enemyHp = this.room.hp;
      this.enemyMaxHp = this.room.hp;
      this.turn = 0;
      this.tiles = new Map();
      this.flinchReady = this.has('flinch');
      this.freezeReady = this.has('freeze');
      this.freezeArmed = false;
      this.skipMove = false;
      this.slowed = false;
      this.rewardOptions = [];
      this.endTitle = '';
      this.log(`ROOM ${index + 1}: ${this.room.title}. ${this.room.line}`);
      this.announceTell();
    }
    announceTell() {
      this.phase = 'TELL';
      this.warning = patternFor(this.roomIndex, this.turn);
      this.warningIds = new Set(this.warning.cells.map(id));
      this.tellVisible = true;
      const seconds = Math.max(.30, this.room.tell + (this.has('hyper') ? .45 : 0) - (this.has('tunnel') ? .18 : 0));
      // Use a readable baseline before modifier deltas, so Hypervigilance and
      // Tunnel Vision keep their promised ±time tradeoffs in accessibility mode.
      this.tellDuration = this.slowTells
        ? Math.max(2.5, 3 + (this.has('hyper') ? .45 : 0) - (this.has('tunnel') ? .18 : 0))
        : seconds;
      const ticket = ++this.generation;
      this.log(`STATIC: ${this.warning.name}. Remember the amber squares.`);
      this.notify();
      this.pendingTimer = this.timer(() => { if (ticket === this.generation) this.finishTell(); }, this.tellDuration * 1000);
    }
    finishTell() {
      if (this.phase !== 'TELL') return;
      this.tellVisible = false;
      this.phase = 'MOVE';
      this.log('The warning vanishes. You have to remember where it was.');
      this.notify();
    }
    move(cell) {
      if (this.phase !== 'MOVE') return false;
      if (this.skipMove || this.slowed) { this.log('Your feet refuse to move. HOLD to continue.'); this.notify(); return false; }
      if (!inside(cell) || same(cell, this.enemy) || distance(cell, this.player) !== 1) {
        this.log('Move one orthogonal square into an unoccupied tile.'); this.notify(); return false;
      }
      this.player = { ...cell };
      this.phase = 'ATTACK';
      this.log('You have moved. Choose your attack and a target.');
      this.notify(); return true;
    }
    hold() {
      if (this.phase !== 'MOVE') return false;
      this.skipMove = false; this.slowed = false;
      this.phase = 'ATTACK'; this.log('You hold your position.'); this.notify(); return true;
    }
    selectAttack(name) {
      if (!['Jab', 'Sweep', 'Burst'].includes(name) || !['MOVE', 'ATTACK'].includes(this.phase)) return false;
      this.attackName = name; this.notify(); return true;
    }
    attackAt(cell) {
      if (this.phase !== 'ATTACK') return false;
      const hit = cellsFor(this.attackName, this.player, cell);
      if (!hit.length) { this.log('That attack has no valid squares. Select another target.'); this.notify(); return false; }
      let damage = this.attackName === 'Jab' ? 3 : 2;
      if (this.has('fight')) damage += 1;
      if (this.has('tunnel') && this.attackName === 'Sweep') damage += 2;
      if (this.has('flinch')) damage = Math.max(1, damage - 1);
      if (hit.some(c => same(c, this.enemy))) {
        this.enemyHp -= damage; this.score += damage;
        this.log(`${this.attackName.toUpperCase()} connects for ${damage} damage.`);
      } else this.log(`${this.attackName.toUpperCase()} leaves a trace on the empty floor.`);
      const effect = this.attackName === 'Jab' ? 'splinter' : this.attackName === 'Sweep' ? 'spark' : 'burn';
      for (const c of hit) this.addStatus(c, effect, 'player', 2, 1);
      this.finishAction(); return true;
    }
    comfort() {
      if (this.phase !== 'ATTACK' || !this.has('comfort')) return false;
      if (this.has('numb')) { this.log('Numbness makes comfort impossible.'); this.notify(); return false; }
      if (this.warningIds.has(id(this.player)) || this.harmful(this.player)) {
        this.log('Not a safe square. You cannot heal here.'); this.notify(); return false;
      }
      const gain = Math.min(2, this.maxHp - this.hp);
      this.hp += gain; this.log(`You hold something familiar. +${gain} HP. Attack forfeited.`);
      this.finishAction(); return true;
    }
    freeze() {
      if (!['MOVE', 'ATTACK'].includes(this.phase) || !this.has('freeze') || !this.freezeReady) return false;
      this.freezeReady = false; this.freezeArmed = true;
      this.log('FREEZE armed. Block this strike, lose next movement.'); this.notify(); return true;
    }
    finishAction() {
      this.phase = 'RESOLVE'; this.notify();
      if (this.enemyHp <= 0) return this.winRoom();
      this.resolveEnemy();
    }
    addStatus(cell, kind, owner, turns, power) {
      const key = id(cell); const entries = this.tiles.get(key) || [];
      const found = entries.find(e => e.owner === owner && e.kind === kind);
      if (found) { found.turns = Math.max(found.turns, turns); found.power = Math.max(found.power, power); }
      else entries.push({ kind, owner, turns, power });
      this.tiles.set(key, entries);
    }
    harmful(cell) {
      return (this.tiles.get(id(cell)) || []).some(e => e.owner === 'enemy' || (e.owner === 'player' && this.has('fight')));
    }
    tickGround() {
      const survivor = new Map();
      for (const [key, entries] of this.tiles.entries()) {
        const next = [];
        for (const e of entries) {
          if (key === id(this.player) && (e.owner === 'enemy' || this.has('fight'))) {
            if (e.kind === 'drip') { this.slowed = true; this.log('Melted drips slow your next movement.'); }
            else if (!this.has('numb')) { this.hp -= e.power; this.log(`The floor hurts you. −${e.power} HP.`); }
          }
          if (key === id(this.enemy) && e.owner === 'player') {
            this.enemyHp -= e.power;
            this.score += e.power;
            this.log(`The enemy stands on your lingering mark. −${e.power} HP.`);
          }
          e.turns -= 1;
          if (e.turns > 0) next.push(e);
        }
        if (next.length) survivor.set(key, next);
      }
      this.tiles = survivor;
    }
    flinchEscape() {
      for (const delta of [p(0, -1), p(1, 0), p(0, 1), p(-1, 0)]) {
        const c = p(this.player.x + delta.x, this.player.y + delta.y);
        if (inside(c) && !same(c, this.enemy) && !this.warningIds.has(id(c)) && !this.harmful(c)) return c;
      }
      return null;
    }
    resolveEnemy() {
      this.tickGround(); // Today’s enemy marks only become active on the NEXT tick.
      if (this.hp <= 0) return this.die();
      if (this.enemyHp <= 0) return this.winRoom();
      let hit = this.warningIds.has(id(this.player));
      if (hit && this.flinchReady) {
        const escape = this.flinchEscape();
        if (escape) { this.player = escape; this.flinchReady = false; hit = false; this.log('FLINCH saves you from the marked square.'); }
      }
      if (hit) {
        if (this.freezeArmed) this.log('FREEZE blocks the incoming memory.');
        else {
          const amount = Math.max(0, this.room.damage + (this.has('hyper') ? 1 : 0) - (this.has('bracing') ? 1 : 0));
          this.hp -= amount;
          this.log(`The memory strikes you. −${amount} HP.`);
        }
      } else this.log('You remembered correctly. The strike missed.');
      if (this.freezeArmed) { this.skipMove = true; this.freezeArmed = false; }
      for (const c of this.warning.cells) this.addStatus(c, this.room.effect, 'enemy', 2, this.room.effectDamage);
      if (this.hp <= 0) return this.die();
      this.turn++; this.score += 2;
      this.announceTell();
    }
    winRoom() {
      this.generation++;
      if (this.pendingTimer) this.clearTimer(this.pendingTimer);
      this.enemyHp = 0; this.tellVisible = false;
      this.log('The room is quiet. A choice waits in the doorway.');
      if (this.roomIndex === 2) {
        this.phase = 'WIN'; this.endTitle = 'THE SOUND STOPS'; this.notify(); return;
      }
      this.phase = 'REWARD';
      // Numb forbids healing, so offering Comfort with Numb (or vice versa) creates an inert reward.
      const pool = MODS.filter(m => !this.owned.includes(m.id)
        && !(this.has('numb') && m.id === 'comfort')
        && !(this.has('comfort') && m.id === 'numb'));
      this.rewardOptions = [];
      while (this.rewardOptions.length < 3 && pool.length) {
        const i = Math.min(pool.length - 1, Math.floor(this.rng() * pool.length));
        this.rewardOptions.push(pool.splice(i, 1)[0]);
      }
      this.notify();
    }
    takeModifier(modId) {
      if (this.phase !== 'REWARD' || !this.rewardOptions.some(m => m.id === modId)) return false;
      this.owned.push(modId);
      if (modId === 'bracing') { this.maxHp = Math.max(4, this.maxHp - 2); this.hp = Math.min(this.hp, this.maxHp); }
      const mod = MODS.find(m => m.id === modId);
      this.log(`You choose ${mod.name}. It protects you and changes you.`);
      this.startRoom(this.roomIndex + 1); return true;
    }
    die() {
      this.generation++;
      if (this.pendingTimer) this.clearTimer(this.pendingTimer);
      this.hp = 0; this.phase = 'DEAD'; this.tellVisible = false;
      this.endTitle = 'THE LOOP RESTARTS'; this.log('The house goes quiet. Another attempt remains.'); this.notify();
    }
    // UI lifecycle only: leaving combat for pre-game setup must not fire a stale tell.
    dispose() {
      this.generation++;
      if (this.pendingTimer != null) this.clearTimer(this.pendingTimer);
      this.pendingTimer = null;
      this.onUpdate = () => {};
      this.phase = 'STOPPED';
    }
    setAccessibility({ slowTells = this.slowTells, persistTells = this.persistTells }) {
      this.slowTells = slowTells; this.persistTells = persistTells; this.notify();
    }
    tileInfo(cell) {
      const key = id(cell);
      return { player: same(this.player, cell), enemy: this.enemyHp > 0 && same(this.enemy, cell),
        warned: this.warningIds ? this.warningIds.has(key) : false,
        showWarning: this.phase === 'TELL' || (this.persistTells && ['MOVE', 'ATTACK'].includes(this.phase)),
        statuses: this.tiles.get(key) || [] };
    }
  }
  return { Game, SIZE, ROOMS, MODS, cellsFor, patternFor, inside, distance, id, same, p };
});