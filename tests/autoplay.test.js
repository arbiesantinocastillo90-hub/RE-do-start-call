'use strict';
/* A deterministic player-bot tests that each three-room encounter can actually be cleared.
 * This is a functional reachability smoke test, not a difficulty/balance score.
 */
const assert = require('node:assert/strict');
const {Game, cellsFor, p, id, distance, patternFor, ROOMS} = require('../web/engine.js');
function bestAttack(s, loc) {
  let best = null;
  for (const a of ['Jab', 'Sweep', 'Burst']) for(let y=0;y<6;y++) for(let x=0;x<6;x++) {
    const target=p(x,y),hit=cellsFor(a,loc,target);
    if(!hit.length)continue;
    const direct=hit.some(c=>id(c)===id(s.enemy));
    const points=(direct?(a==='Jab'?3:2)+(s.has('fight')?1:0)+(a==='Sweep'&&s.has('tunnel')?2:0)-(s.has('flinch')?1:0):0)*10;
    const risk=(hit.some(c=>id(c)===id(loc))&&s.has('fight'))?1.2:0;
    const value=points-risk;
    if(!best||value>best.value)best={a,target,value};
  }
  return best;
}
function winWithBot(seed) {
  let v=seed;
  const s=new Game({timer:()=>0,clearTimer:()=>{},rng:()=>{v=(v*1664525+1013904223)>>>0;return v/2**32;}});
  let actions=0;
  while (actions++<100) {
    if (s.phase==='WIN'||s.phase==='DEAD')break;
    if (s.phase==='REWARD') {
      const prefs=['numb','fight','bracing','comfort','flinch','tunnel','freeze','hyper'];
      const chosen=prefs.find(id=>s.rewardOptions.some(m=>m.id===id));
      s.takeModifier(chosen);continue;
    }
    if (s.phase==='TELL')s.finishTell();
    assert.equal(s.phase,'MOVE');
    const options=[s.player,p(s.player.x-1,s.player.y),p(s.player.x+1,s.player.y),p(s.player.x,s.player.y-1),p(s.player.x,s.player.y+1)]
      .filter(c=>c.x>=0&&c.x<6&&c.y>=0&&c.y<6&&id(c)!==id(s.enemy));
    const value=c=>bestAttack(s,c).value-(s.warningIds.has(id(c))?25:0)-(s.harmful(c)?6:0)-distance(c,s.enemy)*.25;
    options.sort((a,b)=>value(b)-value(a));
    if(s.skipMove||s.slowed||id(options[0])===id(s.player))s.hold();
    else s.move(options[0]);
    assert.equal(s.phase,'ATTACK');
    const at=bestAttack(s,s.player);
    s.selectAttack(at.a);
    assert.equal(s.attackAt(at.target),true);
  }
  assert.equal(s.phase,'WIN',`seed ${seed} ended at ${s.phase} room ${s.roomIndex}, hp ${s.hp}`);
  return actions;
}
for(let seed=0;seed<60;seed++) winWithBot(seed);
for(let r=0;r<3;r++) for(let turn=0;turn<4;turn++) {
  const danger=new Set(patternFor(r,turn).cells.map(id)),enemy=ROOMS[r].pos;
  for(let y=0;y<6;y++)for(let x=0;x<6;x++) {
    const here=p(x,y);if(id(here)===id(enemy))continue;
    const candidates=[here,p(x-1,y),p(x+1,y),p(x,y-1),p(x,y+1)]
      .filter(c=>c.x>=0&&c.x<6&&c.y>=0&&c.y<6&&id(c)!==id(enemy));
    assert.ok(candidates.some(c=>!danger.has(id(c))),`no dodge/hold for room ${r} turn ${turn} tile ${id(here)}`);
  }
}
console.log('PASS: 60 deterministic three-room victories and exhaustive base attack safety checks.');