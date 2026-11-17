// Independent Release A browser regression suite.
// Tested by .github/workflows/release-a.yml against the exact checked-out commit.
// A failing expectation is a release gate, not permission to weaken a game contract.
const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const gameUrl = pathToFileURL(path.resolve(__dirname, '../web/index.html')).href;

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push('console: ' + message.text());
  });
  return errors;
}

async function startFreshRun(page) {
  await page.goto(gameUrl);
  await expect(page.locator('#modal')).toBeVisible();
  await page.locator('#modal-primary').click();
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('.cell')).toHaveCount(36);
  await expect(page.locator('#board')).toBeVisible();
}

test('precisely one keyboard movement/attack and locked input during the next tell', async ({ page }) => {
  const errors = trackErrors(page);
  await startFreshRun(page);
  const first = await page.evaluate(() => ({
    phase: window.__redo.game.phase,
    player: { ...window.__redo.game.player },
    turn: window.__redo.game.turn,
    warned: window.__redo.game.warned.map(c => c.x + ',' + c.y)
  }));
  expect(first.phase).toBe('TELL');
  expect(first.turn).toBe(0);
  expect(first.warned.length).toBeGreaterThan(0);

  await page.keyboard.press('ArrowUp'); // No action is legal while the tell is visible.
  expect(await page.evaluate(() => window.__redo.game.player)).toEqual(first.player);
  await page.evaluate(() => window.__redo.game.finishTell());
  await expect.poll(() => page.evaluate(() => window.__redo.game.phase)).toBe('MOVE');
  await page.locator('#board').focus();
  await page.keyboard.press('ArrowUp');
  const moved = await page.evaluate(() => ({
    player: window.__redo.game.player,
    phase: window.__redo.game.phase
  }));
  expect(moved.player).toEqual({ x: first.player.x, y: first.player.y - 1 });
  expect(moved.phase).toBe('ATTACK');
  await page.keyboard.press('ArrowDown'); // Aim only, cannot move again.
  expect(await page.evaluate(() => window.__redo.game.player)).toEqual(moved.player);
  await page.locator('#board').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__redo.game.turn)).toBe(1);
  const committed = await page.evaluate(() => ({
    phase: window.__redo.game.phase,
    turn: window.__redo.game.turn,
    player: window.__redo.game.player
  }));
  expect(committed.phase).toBe('TELL');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.__redo.game.turn)).toBe(1);
  expect(errors).toEqual([]);
});

test('360px browser has no overflow; OS reduced motion keeps the warning legible', async ({ page }) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startFreshRun(page);
  const geometry = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    cells: document.querySelectorAll('.cell').length,
    warning: document.querySelectorAll('.cell.telegraph').length,
    animations: [...document.querySelectorAll('.cell.telegraph')].map(el => getComputedStyle(el).animationName)
  }));
  expect(geometry.cells).toBe(36);
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.warning).toBeGreaterThan(0);
  expect(geometry.animations.every(name => name === 'none')).toBe(true);
  await page.screenshot({ path: 'release-qa-360.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('real touch input can hold and attack at 360px without duplicating a turn', async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true, isMobile: true, viewport: { width: 360, height: 740 },
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  try {
    const errors = trackErrors(page);
    await page.goto(gameUrl);
    await page.locator('#modal-primary').tap();
    await expect(page.locator('.cell')).toHaveCount(36);
    await page.evaluate(() => window.__redo.game.finishTell());
    await page.locator('#hold-btn').tap();
    expect(await page.evaluate(() => window.__redo.game.phase)).toBe('ATTACK');
    // Spawn is (1,2): (2,2) is a legal Jab target, even if empty.
    await page.locator('.cell[data-x="2"][data-y="2"]').tap();
    expect(await page.evaluate(() => window.__redo.game.turn)).toBe(1);
    expect(await page.evaluate(() => window.__redo.game.phase)).toBe('TELL');
    await page.screenshot({ path: 'release-qa-touch.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('Release A requires pre-game preferences, optional trace and uncluttered combat rail', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(gameUrl);
  // These mandatory controls are deliberately missing on legacy main.
  // This test stays red until #10 then #11 have been integrated and retested.
  await expect(page.locator('#setup-options')).toBeVisible();
  await expect(page.locator('#sound-level')).toBeVisible();
  await expect(page.locator('#reduce-motion')).toBeVisible();
  await expect(page.locator('#high-contrast')).toBeVisible();
  await page.locator('#reduce-motion').check();
  await page.locator('#high-contrast').check();
  await page.locator('#modal-primary').click();
  await expect(page.locator('#modal')).toBeHidden();
  const rail = page.locator('aside.control-column');
  await expect(rail.locator('#instruction, #log, #room-hint')).toHaveCount(0);
  await expect(page.locator('#clue-panel')).toBeHidden();
  await expect(page.locator('#clue-trigger')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('body')).toHaveClass(/high-contrast/);
  await expect(page.locator('body')).toHaveClass(/user-reduced-motion/);
  await page.locator('#clue-trigger').focus();
  await expect(page.locator('#clue-panel')).toBeVisible();
  expect(errors).toEqual([]);
});
