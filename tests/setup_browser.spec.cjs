const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = pathToFileURL(path.resolve(__dirname, '../web/index.html')).href;

test('settings persist through reload, apply before a run, and never persist game state', async ({ page }) => {
  await page.setViewportSize({width: 1280, height: 800});
  await page.goto(url);
  await expect(page.locator('#modal')).toBeVisible();
  await page.locator('input[name="avatar-shape"][value="star"]').check();
  await page.locator('#avatar-tint').selectOption('lilac');
  await page.locator('#reduce-motion').check();
  await page.locator('#high-contrast').check();
  await page.locator('#slow-tells').check();
  await page.locator('#sound-level').selectOption('off');
  await expect(page.locator('#avatar-preview')).toHaveText('✦');
  await expect(page.locator('#sound-test')).toBeDisabled();
  await page.screenshot({path:'release-setup-desktop.png',fullPage:true});

  await page.locator('#modal-primary').click();
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('.cell.you .symbol')).toHaveText('✦');
  await expect(page.locator('body')).toHaveClass(/high-contrast/);
  await expect(page.locator('body')).toHaveClass(/user-reduced-motion/);
  await expect(page.locator('.cell.telegraph').first()).toHaveCSS('animation-name','none');
  await expect(page.locator('#clue-panel')).toBeHidden();
  const state = await page.evaluate(() => ({
    settings: window.RedoPreferences.current(),
    turn: window.__redo.game.turn,
    stored: JSON.parse(localStorage.getItem(window.RedoPreferences.key))
  }));
  expect(state.settings.sound).toBe('off');
  expect(state.stored.avatar).toBe('star');
  expect(state.stored).not.toHaveProperty('hp');
  expect(state.stored).not.toHaveProperty('roomIndex');
  expect(state.turn).toBe(0);
  await page.reload();
  await expect(page.locator('input[name="avatar-shape"][value="star"]')).toBeChecked();
  await expect(page.locator('#sound-level')).toHaveValue('off');
  await expect(page.locator('#reduce-motion')).toBeChecked();
  await expect(page.locator('#high-contrast')).toBeChecked();
  await expect(page.locator('#slow-tells')).toBeChecked();
  await expect(page.locator('#modal')).toBeVisible();
  expect(await page.evaluate(() => window.__redo.game)).toBeNull();
});

test('touch prompt opens on first tap and closes on second tap', async ({ browser }) => {
  const context = await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:375,height:667}});
  const page = await context.newPage();
  try {
    await page.goto(url);
    await page.screenshot({path:'release-setup-mobile.png',fullPage:true});
    await page.locator('#modal-primary').tap();
    const trigger = page.locator('#clue-trigger');
    const trace = page.locator('#clue-panel');
    await expect(trace).toBeHidden();
    await trigger.tap();
    await expect(trace).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded','true');
    await trigger.tap();
    await expect(trace).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded','false');
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewport+1);
  } finally { await context.close(); }
});
