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
npx playwright test tests/ui_browser.spec.cjs tests/setup_browser.spec.cjs tests/release_menu_browser.spec.cjs --workers=1
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

PR #11 is **stacked on** Agent C's #10, not main. Merge it into C's branch;
reconcile native #9 and C's overlapping `scripts/main.gd` changes before
final integration. Agent E #6 owns combat effects and should consume
`window.RedoPreferences.current()`, `soundGain(current())` and
`redo:preferenceschange` without changing this menu or gameplay rules.
Retest the final main SHA in Node, Chromium and Godot. Agent D owns Windows
artifact launch/manual QA; green web PR CI is not a release certificate.
