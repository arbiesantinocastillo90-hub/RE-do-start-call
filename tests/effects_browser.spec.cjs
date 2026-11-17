const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const url = pathToFileURL(path.resolve(__dirname, '../web/index.html')).href;

test('finite combat feedback, exact warning visibility and setup cancellation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await expect(page.locator('#sound-level')).toHaveValue('off');
  await page.locator('#modal-primary').click();
  await expect(page.locator('.cell')).toHaveCount(36);
  await expect(page.locator('.redo-fx-player')).toHaveCount(1);
  await expect(page.locator('.cell.telegraph').first()).toBeVisible();
  await expect(page.locator('.cell.telegraph').first()).toHaveCSS('animation-iteration-count','1');
  await expect(page.locator('#clue-panel')).toBeHidden();
  await page.evaluate(() => window.__redo.game.finishTell());
  await page.locator('.cell[data-x="1"][data-y="1"]').click();
  const moveState = await page.evaluate(() => ({
    x: window.__redo.game.player.x, y: window.__redo.game.player.y,
    phase: window.__redo.game.phase,
    marker: document.querySelector('.redo-fx-player').className
  }));
  expect(moveState).toMatchObject({ x:1, y:1, phase:'ATTACK' });
  expect(moveState.marker).not.toContain('redo-fx-no-glide');
  const afterAttack = await page.evaluate(() => {
    document.querySelector('.cell[data-x="2"][data-y="1"]').click();
    const game = window.__redo.game;
    return {
      phase: game.phase, turn: game.turn,
      attack: document.querySelectorAll('.redo-fx-mark.redo-fx-attack').length,
      strike: document.querySelectorAll('.redo-fx-mark.redo-fx-strike').length
    };
  });
  expect(afterAttack).toMatchObject({phase:'TELL',turn:1,attack:1});
  expect(afterAttack.strike).toBeGreaterThan(0);
  await page.locator('#setup-btn').click();
  expect(await page.evaluate(() => ({
    marks: document.querySelectorAll('.redo-fx-mark').length,
    markerHidden: document.querySelector('.redo-fx-player').hidden,
    gamePhase: window.__redo.game?.phase ?? null
  }))).toEqual({ marks:0, markerHidden:true, gamePhase:null });
  await page.waitForTimeout(240);
  await expect(page.locator('.redo-fx-mark')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('user and OS reduced motion retain non-strobing exact danger', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.goto(url);
  await page.locator('#reduce-motion').check();
  await page.locator('#modal-primary').click();
  await expect(page.locator('.cell.telegraph').first()).toBeVisible();
  await expect(page.locator('.cell.telegraph').first()).toHaveCSS('animation-name','none');
  await page.evaluate(() => window.__redo.game.finishTell());
  await page.locator('.cell[data-x="1"][data-y="1"]').click();
  await expect(page.locator('.redo-fx-player')).toHaveCSS('transition-duration','0s');
  const marks = await page.evaluate(() => {
    document.querySelector('.cell[data-x="2"][data-y="1"]').click();
    return [...document.querySelectorAll('.redo-fx-mark')].map(n => getComputedStyle(n).animationName);
  });
  expect(marks.length).toBeGreaterThan(0);
  expect(marks.every(name => name === 'none')).toBe(true);
});
