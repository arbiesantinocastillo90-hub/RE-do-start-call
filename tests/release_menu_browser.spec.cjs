const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = pathToFileURL(path.resolve(__dirname, '../web/index.html')).href;

test('menu disclosures have keyboard focus, tab wrapping, and an explicit playable start', async ({page}) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('input[name="avatar-shape"]:checked')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#modal-primary')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('input[name="avatar-shape"]:checked')).toBeFocused();
  await page.locator('#menu-howto summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#menu-howto')).toHaveAttribute('open', '');
  await expect(page.locator('#menu-howto')).toContainText('Watch the amber warning cells');
  await page.locator('#menu-content summary').click();
  await expect(page.locator('#menu-content')).toContainText('childhood distress');
  await page.locator('#menu-credits summary').click();
  await expect(page.locator('#menu-credits a')).toBeVisible();
  await page.locator('#modal-primary').click();
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('.cell')).toHaveCount(36);
  expect(errors).toEqual([]);
});

test('reset confirms; cancel preserves run and warning; Escape and R work', async ({page}) => {
  await page.goto(url);
  await page.locator('#modal-primary').click();
  await page.evaluate(() => { window.__initialGame = window.__redo.game; });
  const initial = await page.evaluate(() => ({
    phase: window.__redo.game.phase,
    turn: window.__redo.game.turn,
    threat: [...window.__redo.game.warningIds].sort()
  }));
  expect(initial.phase).toBe('TELL');
  await page.locator('#setup-btn').click();
  await expect(page.locator('#modal-title')).toContainText('Leave this loop?');
  await expect(page.locator('#modal-secondary')).toBeVisible();
  await expect(page.locator('#modal-primary')).toBeFocused();
  await page.keyboard.press('r'); // A modal cannot start a second reset.
  await expect(page.locator('#modal-title')).toContainText('Leave this loop?');
  await page.keyboard.press('Escape'); // Cancel; warning replays for fairness.
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('#setup-btn')).toBeFocused();
  const resumed = await page.evaluate(() => ({
    sameGame: window.__redo.game === window.__initialGame,
    phase: window.__redo.game.phase,
    turn: window.__redo.game.turn,
    threat: [...window.__redo.game.warningIds].sort()
  }));
  expect(resumed.sameGame).toBe(true);
  expect(resumed.turn).toBe(initial.turn);
  expect(resumed.phase).toBe('TELL');
  expect(resumed.threat).toEqual(initial.threat);
  await page.evaluate(() => window.__redo.game.finishTell());
  await page.keyboard.press('r');
  await expect(page.locator('#modal-title')).toContainText('Leave this loop?');
  await page.locator('#modal-secondary').click();
  await expect(page.locator('#modal')).toBeHidden();
  expect(await page.evaluate(() => window.__redo.game === window.__initialGame)).toBe(true);
  await page.keyboard.press('Escape');
  await page.locator('#modal-primary').click();
  await expect(page.locator('#setup-options')).toBeVisible();
  expect(await page.evaluate(() => window.__redo.game)).toBeNull();
  await page.locator('#modal-primary').click();
  expect(await page.evaluate(() => window.__redo.game.hp)).toBe(14);
  expect(await page.evaluate(() => window.__redo.game.turn)).toBe(0);
});

test('blocked localStorage getter cannot break pregame selection or launch', async ({page}) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Storage blocked', 'SecurityError'); }
    });
  });
  await page.goto(url);
  await page.locator('input[name="avatar-shape"][value="diamond"]').check();
  await page.locator('#avatar-tint').selectOption('amber');
  await page.locator('#sound-level').selectOption('full');
  await page.locator('#sound-volume').evaluate(el => { el.value = '30'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.locator('#mute-sound').check();
  await expect(page.locator('#sound-test')).toBeDisabled();
  await page.locator('#modal-primary').click();
  await expect(page.locator('.cell.you .symbol')).toHaveText('◆');
  expect(await page.evaluate(() => window.RedoPreferences.current())).toMatchObject({
    avatar:'diamond',tint:'amber',sound:'full',volume:30,muted:true
  });
  expect(errors).toEqual([]);
});
