'use strict';
const assert = require('node:assert/strict');
const { Game, SIZE, ROOMS, MODS, cellsFor, patternFor, inside, id, p } = require('../web/engine.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
const game = () => new Game({ timer: () => 0, clearTimer: () => {}, rng: () => 0.5 });
test('board geometry is 6 by 6', () => { assert.equal(SIZE, 6); assert.equal(ROOMS.length, 3); assert.equal(MODS.length, 8); });
test('Jab targets only cardinal adjacent cells', () => {
  assert.deepEqual(cellsFor('Jab', p(2,2),p(3,2)), [p(3,2)]);
  assert.deepEqual(cellsFor('Jab',p(2,2),p(3,3)), []);
});
test('Sweep and Burst attack shapes stay on board', () => {
  assert.deepEqual(cellsFor('Sweep',p(1,1),p(4,1)),[p(2,1),p(3,1),p(4,1)]);
  assert.equal(cellsFor('Burst',p(0,0),p(1,0)).length,4);
});
test('all 12 enemy attack patterns fit inside board and leave safety', () => {
  for (let r=0;r<3;r++) for(let t=0;t<4;t++) {
    const arr=patternFor(r,t).cells;
    assert.ok(arr.length >= 3 && arr.length < 36);
    assert.ok(arr.every(inside)); assert.equal(new Set(arr.map(id)).size,arr.length);
  }
});
test('warning must finish before movement is allowed', () => {
  const s=game(); assert.equal(s.phase,'TELL'); assert.equal(s.move(p(1,1)),false);
  s.finishTell(); assert.equal(s.phase,'MOVE'); assert.equal(s.move(p(1,1)),true); assert.equal(s.phase,'ATTACK');
});
test('attacks leave lingering status and enemy resolves matching warned tiles', () => {
  const s=game();s.finishTell();s.move(p(2,2));s.selectAttack('Sweep');
  assert.equal(s.attackAt(p(4,2)),true);assert.equal(s.enemyHp,4); // 2 direct + 1 lingering tick
  assert.equal(s.turn,1);assert.equal(s.phase,'TELL');assert.ok(s.tiles.size>0);
});
test('invalid attacks do not advance turn', () => {
  const s=game();s.finishTell();s.hold();assert.equal(s.attackAt(p(5,5)),false);
  assert.equal(s.phase,'ATTACK');assert.equal(s.turn,0);
});
test('tile effects have duration and expire after ticks', () => {
  const s=game();s.tiles.clear();s.addStatus(p(0,0),'rust','enemy',2,1);
  s.tickGround();assert.equal(s.tiles.get('0,0')[0].turns,1);
  s.tickGround();assert.ok(!s.tiles.has('0,0'));
});
test('clearing room opens 3 distinct boon/cost choices', () => {
  const s=game();s.enemyHp=0;s.winRoom();assert.equal(s.phase,'REWARD');assert.equal(s.rewardOptions.length,3);
  assert.ok(s.rewardOptions.every(m=>m.boon && m.cost));
  const choice=s.rewardOptions[0].id;assert.equal(s.takeModifier(choice),true);
  assert.equal(s.roomIndex,1);assert.equal(s.phase,'TELL');assert.equal(s.owned.length,1);
});
test('all three rooms lead to demo victory', () => {
  const s=game();for(let r=0;r<3;r++){
    s.enemyHp=0;s.winRoom();if(r<2)s.takeModifier(s.rewardOptions[0].id);
  }assert.equal(s.phase,'WIN');assert.equal(s.endTitle,'THE SOUND STOPS');
});
test('death resets the loop and preserves no meta-progression', () => {
  const s=game();s.owned=['fight'];s.hp=0;s.die();assert.equal(s.phase,'DEAD');s.startRun();assert.deepEqual(s.owned,[]);assert.equal(s.hp,14);assert.equal(s.roomIndex,0);
});
test('modifier tradeoffs impact calculations and health caps', () => {
  const s=game();s.owned=['bracing'];s.maxHp=12;s.hp=12;s.startRoom(0);
  s.finishTell();s.hold();s.selectAttack('Jab');s.attackAt(p(1,1));
  assert.equal(s.hp,11); // Room 1 2-dmg strike, bracing -1.
});
test('Numb ignores harmful floor damage', () => {
  const s=game();s.owned=['numb'];s.addStatus(s.player,'rust','enemy',2,2);
  const before=s.hp;s.tickGround();assert.equal(s.hp,before);
});
console.log(`\n${passed} game-engine tests passed.`);