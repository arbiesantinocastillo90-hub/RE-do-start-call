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
  // Agent F confirmation intentionally preserves both gameplay and transient
  // FX until the user explicitly chooses to discard the current run.
  await expect(page.locator('#modal-title')).toContainText('Leave this loop?');
  expect(await page.evaluate(() => window.__redo.game?.phase)).toBe('TELL');
  await page.locator('#modal-primary').click();
  await expect(page.locator('#setup-options')).toBeVisible();
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

test('lethal hit uses subdued defeat cue, never reward tone; no audio before Start', async ({ page }) => {
  // Fake Web Audio makes oscillator pitches deterministic in headless Chromium;
  // gameplay actions still use the actual DOM controls and engine.
  await page.addInitScript(() => {
    window.__fxAudioStarts = [];
    class FakeAudioContext {
      constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
      createOscillator() {
        return {
          frequency: {
            setValueAtTime(value) { window.__fxAudioStarts.push(value); },
            exponentialRampToValueAtTime() {}
          },
          connect() {}, disconnect() {}, start() {}, stop() {}
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {}, disconnect() {}
        };
      }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext });
  });
  await page.goto(url);
  await expect(page.locator('#sound-level')).toHaveValue('off');
  expect(await page.evaluate(() => window.__fxAudioStarts)).toEqual([],
    'passive page load must not construct or play audio');
  await page.locator('#sound-level').selectOption('full');
  expect(await page.evaluate(() => window.__fxAudioStarts)).toEqual([],
    'choosing a preference alone must not autoplay audio');
  await page.locator('#modal-primary').click();
  await expect(page.locator('.cell.telegraph')).toHaveCount(6);
  // Seed only low HP to reach a lethal outcome in one genuine UI turn.
  // Start tile (1,2) is in the exact Pipe warning; hold and an empty-floor
  // Jab cannot kill the enemy or avoid the precommitted strike.
  await page.evaluate(() => {
    window.__redo.game.hp = 1;
    window.__redo.game.finishTell();
    window.__fxAudioStarts = [];
  });
  await page.locator('#hold-btn').click();
  await page.locator('.cell[data-x="2"][data-y="2"]').click();
  await expect(page.locator('#modal-title')).toContainText('starts again');
  expect(await page.evaluate(() => window.__redo.game.phase)).toBe('DEAD');
  const played = await page.evaluate(() => window.__fxAudioStarts);
  expect(played).toContain(110); // impact
  expect(played).toContain(164); // subdued defeat, not positive reward
  expect(played).toContain(470); // accepted attack
  expect(played).not.toContain(523); // never reward on defeat
});
