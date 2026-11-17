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
  await expect(page.locator('#modal-primary')).toBeInViewport({ ratio: 1 });
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
  await expect(page.locator('#modal-title')).toContainText('Leave this loop?');
  await page.locator('#modal-primary').click(); // Confirmation keeps the previous run safe until accepted.
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

test('360px touch: visible warning symbols, silent hidden trace and no overflow', async ({ browser }) => {
  const context = await browser.newContext({
    isMobile: true, hasTouch: true, viewport: { width: 360, height: 740 }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const width = () => page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth
  }));
  try {
    await page.goto(gameUrl);
    await expect(page.locator('#setup-options')).toBeVisible();
    await page.locator('#slow-tells').check();
    await page.locator('#persist-tells').check();
    let size = await width();
    expect(size.content).toBeLessThanOrEqual(size.viewport + 1);
    await page.locator('#modal-primary').tap();
    await expect(page.locator('#modal')).toBeHidden();
    await expect(page.locator('.cell')).toHaveCount(36);
    await expect(page.locator('.cell.telegraph')).toHaveCount(6);
    // Agent C: the 360px legend must identify both trace owners without color
    // or an optional MEMORY TRACE reveal. Icons are decorative for screen readers.
    const legend = page.getByRole('group', { name: 'Board symbols and lingering-mark ownership' });
    const legendMarkers = await legend.locator('span').evaluateAll(items => items.map(item => ({
      text: item.textContent.replace(/\s+/g, ' ').trim(),
      glyph: item.querySelector('b')?.textContent ?? null
    })));
    expect(legendMarkers).toEqual([
      { text: 'YOU', glyph: null },
      { text: 'MEMORY', glyph: null },
      { text: '! THREAT', glyph: '!' },
      { text: '▒ ENEMY MARK', glyph: '▒' },
      { text: '∙ YOUR MARK', glyph: '∙' }
    ]);
    expect(await legend.evaluate(el => el.getBoundingClientRect().right)).toBeLessThanOrEqual(361);
    await expect(page.locator('#clue-panel')).toBeHidden();
    const warningCues = await page.locator('.cell.telegraph').evaluateAll(elements =>
      elements.map(cell => ({
        label: cell.getAttribute('aria-label'),
        visible: cell.querySelector('.symbol').textContent,
        occupancy: cell.classList.contains('you') || cell.classList.contains('enemy'),
        overlay: getComputedStyle(cell, '::after').content
      }))
    );
    for (const cue of warningCues) {
      expect(cue.label).toContain('next enemy strike');
      // Occupied tiles use a separate ! overlay, not a warning color alone.
      expect(cue.occupancy ? cue.overlay.includes('!') : cue.visible.includes('!')).toBe(true);
    }
    await page.evaluate(() => window.__redo.game.finishTell());
    await expect(page.locator('.cell.ghost')).toHaveCount(6);
    await expect(page.locator('#clue-panel')).toBeHidden();
    await page.locator('[data-step="up"]').tap();
    expect(await page.evaluate(() => window.__redo.game.phase)).toBe('ATTACK');
    await page.locator('[data-attack="Burst"]').tap();
    await page.locator('.cell[data-x="3"][data-y="1"]').tap();
    expect(await page.evaluate(() => window.__redo.game.phase)).toBe('TELL');
    // Actual lingering tiles retain the exact non-color glyphs explained by the legend.
    expect(await page.locator('.cell.danger-ground .symbol').allTextContents()).toContain('▒');
    expect(await page.locator('.cell.player-ground .symbol').allTextContents()).toContain('∙');
    size = await width();
    expect(size.content).toBeLessThanOrEqual(size.viewport + 1);
    await page.screenshot({ path: 'quiet-ui-360.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
