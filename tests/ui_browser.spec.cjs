const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const gameUrl = pathToFileURL(path.resolve(__dirname, '../web/index.html')).href;

test('setup, optional memory trace, and keyboard movement remain accessible', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(gameUrl);

  const modal = page.locator('#modal');
  const trace = page.locator('#clue-panel');
  const trigger = page.locator('#clue-trigger');
  await expect(modal).toBeVisible();
  await expect(page.locator('#setup-options')).toBeVisible();
  await expect(page.locator('input[name="avatar-shape"]:checked')).toBeFocused();
  await expect(page.locator('.shell')).toHaveAttribute('inert', '');

  await page.getByLabel('DIAMOND').check();
  await page.locator('#avatar-tint').selectOption('amber');
  await expect(page.locator('#avatar-preview-glyph')).toHaveText('◆');
  await expect(page.locator('#avatar-preview-glyph')).toHaveCSS('color', 'rgb(214, 179, 123)');
  await page.locator('#slow-tells').check();
  await page.locator('#persist-tells').check();
  await page.locator('#effect-scanlines').uncheck();
  await page.locator('#effect-pulse').uncheck();
  await page.locator('#modal-primary').click();
  await expect(modal).toBeHidden();
  await expect(page.locator('.cell')).toHaveCount(36);
  await expect(trace).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('body')).toHaveClass(/no-scanlines/);
  await expect(page.locator('body')).toHaveClass(/no-pulse/);
  await expect(page.locator('.cell.you .symbol')).toHaveText('◆');
  // During a warning, threatened cells intentionally override the avatar tint.
  expect(await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--avatar-fill').trim()
  )).toBe('#d6b37b');

  const rail = page.locator('aside.control-column');
  await expect(rail.locator('#phase-pill')).toHaveText('WATCH');
  await expect(rail.locator('#player-hp')).toHaveText('14 / 14');
  await expect(rail.locator('#instruction, #log, #room-hint, #slow-tells, #effect-pulse')).toHaveCount(0);
  const duration = await page.evaluate(() => window.__redo.game?.tellDuration ?? null);
  expect(duration, pageErrors.join('\n')).not.toBeNull();
  expect(pageErrors).toEqual([]);
  expect(duration).toBeGreaterThanOrEqual(2.5);

  // A viewer should not encounter the exact pattern name until deliberately revealing notes.
  await trigger.hover();
  await expect(trace).toBeVisible();
  await expect(trace).toContainText('STATIC: PIPE / HORIZONTAL');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#room-name').hover();
  await expect(trace).toBeHidden();
  await trigger.focus();
  await expect(trace).toBeVisible();
  await page.keyboard.press('Enter'); // Pin an already-focused reveal.
  await page.locator('#board').focus();
  await expect(trace).toBeVisible();
  await trigger.focus();
  await page.keyboard.press('Enter'); // Unpin.
  await expect(trace).toBeHidden();
  await page.locator('#board').focus();

  await page.evaluate(() => window.__redo.game.finishTell());
  await expect(page.locator('.cell.you')).toHaveCSS('background-color', 'rgb(214, 179, 123)');
  await page.keyboard.press('ArrowUp');
  expect(await page.evaluate(() => window.__redo.game.phase)).toBe('ATTACK');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.__redo.game.phase)).toBe('TELL');

  // Reward flow blocks gameplay shortcuts and never leaks the event log into the rail.
  await page.evaluate(() => { const g = window.__redo.game; g.enemyHp = 0; g.winRoom(); });
  await expect(modal).toBeVisible();
  await expect(page.locator('.reward')).toHaveCount(3);
  await expect(page.locator('.reward').first()).toBeFocused();
  await page.keyboard.press('r');
  expect(await page.evaluate(() => window.__redo.game.phase)).toBe('REWARD');
  await page.locator('.reward').first().click();
  expect(await page.evaluate(() => window.__redo.game.roomIndex)).toBe(1);

  await page.locator('#setup-btn').click();
  await expect(page.locator('#setup-options')).toBeVisible();
  await expect(rail.locator('#instruction, #log')).toHaveCount(0);
  await page.screenshot({ path: 'quiet-ui-setup.png', fullPage: true });
});

test('mobile layout, reduced motion and optional notes remain accessible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(gameUrl);
  await expect(page.locator('#setup-options')).toBeVisible();
  await page.locator('#modal-primary').click();
  await expect(page.locator('#setup-btn')).toBeVisible();
  await expect(page.locator('.cell')).toHaveCount(36);
  const geometry = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth
  }));
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  await expect(page.locator('.scanlines')).toHaveCSS('display', 'none');
  await expect(page.locator('.cell.telegraph').first()).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#clue-panel')).toBeHidden();
  await page.screenshot({ path: 'quiet-ui-mobile.png', fullPage: true });
});
