# Agent F — Browser release UX verification

The browser implementation is `web/index.html`. Repository root `index.html`
redirects to `./web/` for HTTP static hosts. No backend is required.

## Run locally and verify

From the repository root:

```sh
python -m http.server 8000
# Open http://localhost:8000/ to follow the root redirect.
node --check web/engine.js
node --check web/preferences.js
node --check web/app.js
node tests/engine.test.js
node tests/autoplay.test.js
node tests/ui_contract.test.js
node tests/preferences.test.js
npm install --no-save @playwright/test@1.56.1
npx playwright install chromium
npx playwright test tests/ui_browser.spec.cjs tests/setup_browser.spec.cjs tests/effects_browser.spec.cjs tests/release_menu_browser.spec.cjs --workers=1
```

The root redirect is source-inspected. Production Pages HTTP behavior is
**not verified**; do not advertise a live URL until the published revision and
complete three-room browser playthrough have been tested.

## Release acceptance

- Menu before gameplay: three avatar shapes and tints, How to Play, content
  notice and credits, extended tells/retained warnings, reduced motion,
  high contrast, decorative effects, discrete sound preset, independent
  0–100% volume and mute. All accessible via keyboard, with trapped focus.
- Confirmed reset: SETUP/NEW LOOP, R and Escape open a confirmation
  during active gameplay. Cancel/Escape returns to the same run.
  If the dialog covered a tell, cancellation replays that turn's same
  predetermined warning footprint; confirming cancels the old timer.
- Preferences: allowlisted appearance/accessibility/audio persist across
  reloads. HP, room and modifiers do not. Blocked storage still permits
  settings in memory for the current page and a new run.
- Combat: right rail stays live-only; optional MEMORY TRACE is hidden until
  reveal. Warnings stay legible regardless of visual/audio preferences.
- Test 360 px layout, OS reduced-motion, keyboard, pointer/touch, mute,
  three-room progression, defeat/restart and browser console manually.

## Integration and evidence

This patch is the **main-targeted Agent F follow-up PR #24**. PR #11 was
originally stacked on C's #10; its changes were subsequently integrated
into main via PR #14. PR #9 brought native turn-lock regression fixes.
Agent E's effects integration #18 is **already part of the reviewed base**.
PR #24's explicit merge commit preserves `web/effects.js`,
`web/effects.css`, `effects.observe`, `effects.reset` and
`effects.armAudio`, while adding F-only menu/reset/preferences.
The combined Playwright suite must include the existing UI, effects, and
release-menu tests.

**Verified on PR #24 branch, head `70159ebf`:**
- Node Actions run **44005265711**: syntax checks, 14 engine tests, 60
  deterministic complete-room seeds, frozen encounter/warning parity,
  UI contract and 8 preferences assertions — PASS.
- Chromium Actions run **44005265885**: 10 Playwright browser tests,
  including E combat effects, C 360 px/quiet HUD, F menu/reset,
  blocked storage and saved audio/cosmetics — PASS.

Check exact branch SHA and rerun on **merged main** before release. C's
additional native HUD/360 px work in PR #21 must be reviewed against the
shared `tests/ui_browser.spec.cjs` and UI workflow; never drop its
accessibility coverage. Agent D owns Windows executable/real native
launch, manual game QA and public browser URL verification. Neither
this branch's green CI nor a successful Pages deploy job proves that a
public game URL/Windows build was manually tested. Release A still
requires signed-off end-to-end verification.
