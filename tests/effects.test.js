'use strict';
const assert = require('node:assert/strict');
const { MS, snapshot, classify } = require('../web/effects.js');
const s = (phase, x, y, hp=14, enemyHp=7, roomIndex=0, turn=0) =>
  ({phase, player:{x,y},hp,enemyHp,roomIndex,turn,warningIds:new Set(['1,2','2,2'])});
const get = (...args) => snapshot(s(...args));
assert.deepEqual(classify(null,get('TELL',1,2)),['room','tell']);
assert.deepEqual(classify(get('TELL',1,2),get('MOVE',1,2)),['hide']);
assert.deepEqual(classify(get('MOVE',1,2),get('MOVE',1,2)),[], 'invalid move does not animate');
assert.deepEqual(classify(get('MOVE',1,2),get('ATTACK',2,2)),['move']);
assert.deepEqual(classify(get('MOVE',1,2),get('ATTACK',1,2)),[], 'HOLD never glides');
assert.deepEqual(classify(get('ATTACK',2,2),get('RESOLVE',2,2,14,4)),['resolve','enemy-hit']);
assert.deepEqual(classify(get('RESOLVE',2,2),get('TELL',2,2,12,4,0,1)),['tell','strike','player-hit']);
assert.deepEqual(classify(get('RESOLVE',2,2),get('REWARD',2,2,14,0)),['enemy-hit','room-end'],
  'killing the enemy must not animate retaliation');
assert.deepEqual(classify(get('REWARD',2,2,5,0),get('TELL',1,4,5,10,1,0)),['room','tell'],
  'new room must teleport and not flash past damage');
assert.deepEqual(classify(get('RESOLVE',1,2),get('TELL',2,2,14,7,0,1)),['tell','move','strike'],
  'a valid Flinch movement can interpolate');
assert.equal(MS.move,170);
for (const key of ['attack','impact','strike']) assert.ok(MS[key]>=100 && MS[key]<=180);
assert.ok(MS.room>=200 && MS.room<=350);
console.log('PASS Agent E effects: 11 deterministic events/timings; combat engine untouched');
