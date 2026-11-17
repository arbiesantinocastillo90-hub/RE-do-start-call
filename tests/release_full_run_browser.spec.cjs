// Browser full-run acceptance: actual DOM buttons/tile clicks only.
// Read deterministic state to plan a fair strategy, but never call Game's
// phase/movement/attack/reward methods. Enemy tells expire via real timers.
// This is a bot-powered UI verification, NOT a novice human playtest.
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const url = pathToFileURL(path.resolve(__dirname, '../web/index.html')).href;

test('finish all three rooms via real browser controls without injecting gameplay state', async ({ page }) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push('console: ' + message.text());
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url);
  await expect(page.locator('#setup-options')).toBeVisible();
  await page.locator('#modal-primary').click(); // A genuine first-run Start.
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('.cell')).toHaveCount(36);

  let actions = 0;
  let completedRooms = 0;
  let priorRoom = 0;
  const limit = 90;

  while (actions < limit) {
    const state = await page.evaluate(() => {
      const s = window.__redo.game;
      return { phase: s.phase, room: s.roomIndex, turn: s.turn,
        hp: s.hp, enemyHp: s.enemyHp, warnings: [...s.warningIds],
        rewards: s.rewardOptions.map(m => m.id) };
    });
    expect(state.hp, 'player must remain alive during verified run').toBeGreaterThan(0);
    if (state.phase === 'DEAD') throw new Error('UI bot died in room ' + state.room);
    if (state.phase === 'WIN') break;

    if (state.phase === 'REWARD') {
      expect(state.room).toBe(completedRooms);
      await expect(page.locator('.reward')).toHaveCount(3);
      const preferred = ['numb','fight','bracing','comfort','flinch','tunnel','freeze','hyper'];
      const chosen = preferred.find(id => state.rewards.includes(id));
      expect(chosen, 'reward options must have a legal offer').toBeTruthy();
      await page.locator('.reward').nth(state.rewards.indexOf(chosen)).click();
      await expect.poll(() => page.evaluate(() => window.__redo.game.phase)).toBe('TELL');
      completedRooms++;
      expect(await page.evaluate(() => window.__redo.game.roomIndex)).toBe(completedRooms);
      continue;
    }

    expect(state.phase).toBe('TELL');
    expect(state.room).toBeGreaterThanOrEqual(priorRoom);
    expect(state.room).toBeLessThanOrEqual(2);
    priorRoom = state.room;
    const tell = await page.evaluate(() => {
      const s = window.__redo.game;
      return [...s.warningIds];
    });
    expect(tell.length).toBeGreaterThan(0);
    // The DOM must expose *the same* cells that the deterministic engine saved.
    await expect(page.locator('.cell.telegraph')).toHaveCount(tell.length);
    const actual = await page.locator('.cell.telegraph').evaluateAll(els =>
      els.map(e => e.dataset.x + ',' + e.dataset.y).sort());
    expect(actual).toEqual(tell.slice().sort());

    // Let the real timer hide the warning. No finishTell() injection.
    await expect.poll(() => page.evaluate(() => window.__redo.game.phase), {
      timeout: 8000, intervals: [100,200,250]
    }).toBe('MOVE');
    await expect(page.locator('.cell.telegraph')).toHaveCount(0);

    // Calculate one legal movement and attack using READ-ONLY rules/state.
    // All actual commands are dispatched through physical browser buttons.
    const plan = await page.evaluate(() => {
      const s = window.__redo.game;
      const {p, id, cellsFor, distance, inside} = window.RedoEngine;
      function bestAttack(loc) {
        let best = null;
        for (const attack of ['Jab','Sweep','Burst']) for (let y=0;y<6;y++) for(let x=0;x<6;x++) {
          const target = p(x,y), hit = cellsFor(attack,loc,target);
          if (!hit.length) continue;
          const direct = hit.some(c => id(c) === id(s.enemy));
          const amount = (attack === 'Jab' ? 3 : 2) +
            Number(s.has('fight')) + Number(attack === 'Sweep' && s.has('tunnel'))*2 -
            Number(s.has('flinch'));
          const points = direct ? Math.max(1,amount)*10 : 0;
          const risk = hit.some(c => id(c) === id(loc)) && s.has('fight') ? 1.2 : 0;
          const value = points-risk;
          if (!best || value > best.value) best = {attack,target,value};
        }
        return best;
      }
      const player = s.player;
      const moves = [player, p(player.x-1,player.y),p(player.x+1,player.y),
        p(player.x,player.y-1),p(player.x,player.y+1)]
        .filter(c => inside(c) && id(c) !== id(s.enemy));
      const value = c => bestAttack(c).value -
        (s.warningIds.has(id(c)) ? 25 : 0) -
        (s.harmful(c) ? 6 : 0) - distance(c,s.enemy)*.25;
      moves.sort((a,b)=>value(b)-value(a));
      const move = (s.skipMove || s.slowed) ? player : moves[0];
      return {player: {...player}, move: {...move}, attack: bestAttack(move).attack,
        target: bestAttack(move).target, room:s.roomIndex,turn:s.turn,
        hold:id(move)===id(player) };
    });
    if (plan.hold) await page.locator('#hold-btn').click();
    else await page.locator('.cell[data-x="' + plan.move.x + '"][data-y="' + plan.move.y + '"]').click();
    await expect.poll(() => page.evaluate(() => window.__redo.game.phase)).toBe('ATTACK');
    await page.locator('[data-attack="' + plan.attack + '"]').click();
    await page.locator('.cell[data-x="' + plan.target.x + '"][data-y="' + plan.target.y + '"]').click();

    const after = await page.evaluate(() => {
      const s = window.__redo.game;
      return {phase:s.phase, room:s.roomIndex,turn:s.turn,hp:s.hp,
        effects:[...s.tiles.entries()].flatMap(([key,records]) => records
          .filter(e => e.owner === 'enemy').map(e => ({key,kind:e.kind}))),
        effect:s.room.effect };
    });
    expect(['TELL','REWARD','WIN']).toContain(after.phase);
    if (after.phase === 'TELL') {
      expect(after.turn).toBe(plan.turn+1);
      // Every saved threat cell leaves the matching after-strike residue.
      for (const key of tell) {
        expect(after.effects.some(e => e.key === key && e.kind === after.effect),
          'missing matching enemy residue on previously warned tile ' + key).toBe(true);
      }
    }
    actions++;
  }

  expect(actions, 'the run must not loop forever').toBeLessThan(limit);
  const result = await page.evaluate(() => ({
    phase:window.__redo.game.phase,room:window.__redo.game.roomIndex,
    hp:window.__redo.game.hp,owned:[...window.__redo.game.owned]
  }));
  expect(result.phase).toBe('WIN');
  expect(result.room).toBe(2);
  expect(result.hp).toBeGreaterThan(0);
  expect(result.owned.length).toBe(2);
  expect(completedRooms).toBe(2);
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modal-title')).toContainText('ringing');
  await page.screenshot({path:'release-qa-full-run.png',fullPage:true});
  expect(errors).toEqual([]);
  console.log('PASS: browser UI full three-room run, ' + actions + ' real turns, HP ' + result.hp);
});
