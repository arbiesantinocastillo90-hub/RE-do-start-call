'use strict';
/* Agent B Release A parity/fairness: canonical 12-pattern fixture, real JS
 * resolution, status ownership, reward compatibility, and escape availability.
 * Run: node tests/encounter_fairness.test.js (also run by autoplay.test.js).
 */
const assert = require('node:assert/strict');
const spec = require('./encounter_patterns.json');
const {Game, SIZE, ROOMS, MODS, cellsFor, patternFor, inside, id, p, distance} = require('../web/engine.js');

const silent = (rng = () => 0.5) => new Game({
  timer: () => 0, clearTimer: () => {}, rng
});
const ids = cells => cells.map(id).sort();
const legal = (here, enemy) => [here, p(here.x + 1, here.y), p(here.x - 1, here.y),
  p(here.x, here.y + 1), p(here.x, here.y - 1)]
  .filter(cell => inside(cell) && id(cell) !== id(enemy));

assert.equal(spec.schema, 1);
assert.equal(spec.board_size, SIZE);
assert.equal(spec.rooms.length, 3);
assert.equal(MODS.length, 8);
assert.deepEqual(ROOMS.map(room => room.enemy),
  ['RUSTED PIPE', 'MELTED HANGER', 'THE UNANSWERED CALL']);

let positions = 0;
let directChecks = 0;
let doublePressure = 0;
for (let r = 0; r < 3; r++) {
  const room = ROOMS[r], expected = spec.rooms[r];
  assert.equal(room.title, expected.title);
  assert.equal(room.enemy, expected.enemy);
  assert.equal(room.hp, expected.hp);
  assert.equal(room.tell, expected.tell);
  assert.equal(room.damage, expected.damage);
  assert.equal(room.effect, expected.effect);
  assert.equal(room.effectDamage, expected.effect_damage);
  assert.deepEqual([room.pos.x, room.pos.y], expected.pos);
  assert.deepEqual([room.spawn.x, room.spawn.y], expected.spawn);
  assert.equal(expected.patterns.length, 4);
  for (let t = 0; t < 8; t++) {
    const pattern = patternFor(r, t), golden = expected.patterns[t % 4];
    assert.equal(pattern.name, golden.name, 'unexpected pattern name at r' + r + '/t' + t);
    assert.deepEqual(ids(pattern.cells), golden.tiles.slice().sort(),
      'attack/warning footprint differs from frozen baseline at r' + r + '/t' + t);
    assert.equal(new Set(pattern.cells.map(id)).size, pattern.cells.length);
    const danger = new Set(pattern.cells.map(id));
    const former = new Set(t === 0 ? [] : patternFor(r, t - 1).cells.map(id));
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const here = p(x, y);
      if (id(here) === id(room.pos)) continue;
      positions++;
      const options = legal(here, room.pos);
      assert.ok(options.some(cell => !danger.has(id(cell))),
        'no direct-strike dodge/hold at r' + r + '/t' + t + '/' + id(here));
      // This is diagnostic, NOT an assertion of zero damage: old enemy floor
      // traces may create an openly signalled "least-bad" decision.
      if (t > 0 && !options.some(cell => !danger.has(id(cell)) && !former.has(id(cell))))
        doublePressure++;

      // Exercise actual Game.resolveEnemy() at every position; the damage cell
      // set must equal the memorized warning, not a recomputed/new shape.
      const s = silent();
      s.startRoom(r);
      s.turn = t;
      s.announceTell();
      assert.deepEqual([...s.warningIds].sort(), [...danger].sort());
      s.player = here;
      s.finishTell();
      assert.equal(s.phase, 'MOVE');
      assert.equal(s.hold(), true);
      const target = legal(here, room.pos).find(cell => id(cell) !== id(here));
      assert.ok(target && distance(here, target) === 1);
      s.selectAttack('Jab');
      assert.equal(s.attackAt(target), true);
      const expectedHp = 14 - (danger.has(id(here)) ? room.damage : 0);
      assert.equal(s.hp, expectedHp, 'warning/strike mismatch at r' + r +
        '/t' + t + '/' + id(here));
      assert.equal(s.phase, 'TELL', 'resolution must not deadlock');
      for (const cell of pattern.cells) {
        const effects = s.tiles.get(id(cell)) || [];
        assert.ok(effects.some(e => e.owner === 'enemy' && e.kind === room.effect &&
          e.turns === 2 && e.power === room.effectDamage),
        'missing post-strike floor warning status at r' + r + '/t' + t + '/' + id(cell));
      }
      directChecks++;
    }
  }
}

// Ground pressure is deliberately a separate risk from direct-warning geometry.
// The 2-turn nominal duration means a newly applied enemy mark first ticks on
// the following action; it cannot damage retroactively on the same strike.
for (let r = 0; r < 3; r++) {
  const room = ROOMS[r];
  const s = silent();
  s.startRoom(r);
  s.player = p(0, 0);
  s.tiles.clear();
  s.addStatus(s.player, room.effect, 'enemy', 2, room.effectDamage);
  s.addStatus(s.player, room.effect, 'enemy', 2, room.effectDamage);
  assert.equal(s.tiles.get('0,0').length, 1, 'same source/kind must refresh');
  const startHp = s.hp;
  s.tickGround();
  assert.equal(s.tiles.get('0,0')[0].turns, 1);
  if (room.effect === 'drip') {
    assert.equal(s.slowed, true, 'drip must disable movement');
    assert.equal(s.hp, startHp, 'drip cannot deal direct floor damage');
  } else assert.equal(s.hp, startHp - 1, 'rust/echo ticks once');
  s.tickGround();
  assert.equal(s.tiles.has('0,0'), false, 'floor mark must expire');
  const numb = silent();
  numb.owned = ['numb'];
  numb.addStatus(numb.player, room.effect, 'enemy', 2, room.effectDamage);
  const hp = numb.hp;
  numb.tickGround();
  assert.equal(numb.hp, hp, 'Numb must prevent floor damage');
  if (room.effect === 'drip') assert.equal(numb.slowed, true, 'Numb cannot cancel slow');
}

// A drip acquired from an old Hanger diagonal cannot force a direct strike
// two turns later on the same tile, after the slow flag becomes active.
for (let t = 0; t < 4; t++) {
  const previousDrips = new Set(patternFor(1, t).cells.map(id));
  const futureWarning = new Set(patternFor(1, t + 2).cells.map(id));
  assert.equal([...previousDrips].filter(key => futureWarning.has(key)).length, 0,
    'forced slow would overlap the t+2 Hanger direct strike');
}

// Forced HOLD is always a route to a legal attack even when an effect or
// Freeze's declared downside disabled the move; never trap the input phase.
for (let r = 0; r < 3; r++) for (let t = 0; t < 4; t++) {
  for (const state of ['slowed', 'skipMove']) {
    const s = silent();
    s.startRoom(r);
    s.turn = t;
    s.announceTell();
    s.finishTell();
    s[state] = true;
    assert.equal(s.move(legal(s.player, s.enemy).find(c => id(c) !== id(s.player))), false);
    assert.equal(s.phase, 'MOVE');
    assert.equal(s.hold(), true);
    assert.equal(s.phase, 'ATTACK');
    const target = legal(s.player, s.enemy).find(c => id(c) !== id(s.player));
    assert.equal(s.attackAt(target), true);
    assert.notEqual(s.phase, 'ATTACK');
  }
}

// After the first chosen modifier, a second reward must never be inert:
// Numb prevents healing, making Comfort Object useless, and vice versa.
for (const owned of MODS.map(m => m.id)) for (const rng of [0, 0.16, 0.5, 0.99]) {
  const s = silent(() => rng);
  s.owned = [owned];
  s.startRoom(1);
  s.enemyHp = 0;
  s.winRoom();
  assert.equal(s.phase, 'REWARD');
  assert.equal(s.rewardOptions.length, 3);
  const options = s.rewardOptions.map(m => m.id);
  assert.equal(new Set(options).size, 3);
  assert.ok(!options.includes(owned));
  assert.ok(s.rewardOptions.every(m => m.boon && m.cost));
  if (owned === 'numb') assert.ok(!options.includes('comfort'));
  if (owned === 'comfort') assert.ok(!options.includes('numb'));
  const accepted = options[0];
  assert.equal(s.takeModifier(accepted), true);
  assert.equal(s.phase, 'TELL');
  assert.equal(s.roomIndex, 2);
}

// Illegal origins are invalid on both Godot and browser; this was an
// engine-parity regression caught in Godot's merged native core PR #9.
assert.deepEqual(cellsFor('Sweep', p(-1, 2), p(2, 2)), []);
assert.deepEqual(cellsFor('Burst', p(6, 2), p(4, 2)), []);

console.log('PASS: 12 frozen encounter patterns (8-cycle checks), ' + directChecks +
  ' exact warned-to-strike position cases, no base direct-hit traps, ' +
  'status/slow/hold checks and compatible reward offerings.');
console.log('INFO: ' + doublePressure + ' known previous-mark + current-warning ' +
  'double-pressure positions across two cycles; this counts disclosed floor risk, not hidden strikes.');
