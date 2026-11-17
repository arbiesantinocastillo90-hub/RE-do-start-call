# RE:(do)(start)(call)

**A 6×6, turn-based tactical-memory roguelike.** A child navigates a fractured house built from memories. Brief, exact danger-tile warnings disappear before decisions; the player moves to safety, attacks in shapes, and adapts to lingering hazards. Time is not literally stopped: the turn rhythm represents hypervigilance.

> **Release A status: AUTOMATED RELEASE CANDIDATE, not a fully verified consumer release.** Code for the three-room house demo, its Godot 4 project and a playable browser companion is on `main`. Automated tests verify core mechanics, real Chromium keyboard/touch/accessibility scenarios, Godot 4.4.1 headless startup and a Windows executable headless launch. **Human Windows GUI gameplay, ten complete native manual runs, and five novice playtesters are not yet documented.** Do not claim those gates have passed.

## Play in a browser

**[PLAY THE THREE-ROOM DEMO](https://arbiesantinocastillo90-hub.github.io/RE-do-start-call/)** (GitHub Pages; no account or installation needed).

For offline browser use, download this repository as ZIP, extract it and open `web/index.html`. On the first screen, customize your signal/avatar, choose warning visibility, motion, contrast, optional sound and volume, then choose **START NEW LOOP**. Cosmetic and accessibility preferences can persist locally; health/level progress does not. Your browser may limit sound or local storage.

## Play the native Godot game

1. Install **Godot 4.4.1+**. Clone/download this repository.
2. In Godot select **Import → project.godot**, open the project and press **F5**.
3. A setup screen appears first. Choose visual signal and accessibility settings and start a run.
4. Observe the enemy warning before deciding. After it disappears, move one square (or hold), select an attack and commit a target.
5. Beat three encounters to see the non-canonical **DEMO COMPLETE** screen. Restart resets the three-room run.

### Windows x64 test build

The CI workflow [Release A automated acceptance](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/workflows/release-a.yml) cross-exports the native `.exe` with Godot 4.4.1 export templates and uploads `release-a-windows-x64-cross-export` as a **workflow artifact**; a Windows 2022 job checks its PE format and launches the executable headlessly. Open a successful workflow run, choose **Artifacts → release-a-windows-x64-cross-export**, download ZIP, extract and keep `RE-do-start-call.exe` and `RE-do-start-call.pck` in the same directory. No installation is required.

**Verification boundary:** the [integrated release-candidate PR's workflow](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004263671) passed Linux native, Node, Chromium, Windows cross-export and Windows headless launch. That is **not** a verified full Windows graphics, input, audio or three-room GUI playthrough. See [current QA gate](docs/RELEASE_A_QA.md) for exact evidence and remaining tasks.

## Controls and tactics

| Input | Action |
|---|---|
| Arrow keys / clicking or tapping an adjacent tile | Move one legal orthogonal square during MOVE |
| Space or HOLD | Hold position instead of moving |
| 1 / 2 / 3 | Choose **Jab / Sweep / Burst** |
| Arrow keys + Enter / click or tap a target | Aim and commit one legal attack during ATTACK |
| E / F, when unlocked | Comfort Object heal / Freeze defense |
| Setup / New Loop | Return to pre-game options, with restart safeguards |
| Focus, hover or tap MEMORY TRACE | Show optional gameplay aids and event memory |

**Turn:** ENEMY TELL → HIDE → MOVE/HOLD → ATTACK/ABILITY → STATUS TICK → SAME WARNED ENEMY STRIKE → NEXT TELL. Warnings and resolved strike coordinates must match exactly. Attack previews show their real footprints. Reduced motion does not change combat rules.

**Three rooms:** The Hallway (**Rusted Pipe**, row/column strikes and rust damage), The Window Room (**Melted Hanger**, diagonal strikes and slowing drips), The Room That Rings (**Unanswered Call**, crosses/diagonals/rings and echo hazards). The current implemented boss is **Unanswered Call**; a Light Bulb is presentation brainstorming, not yet this coded release.

**Eight coping mechanisms:** Hypervigilance, Numb, Comfort Object, Fight Response, Freeze, Bracing, Tunnel Vision and Flinch. Choose one of three distinct options after rooms 1 and 2. Every modifier has a boon and a drawback. The modifier choices can differ between runs.

## What is in the code

- Godot: `project.godot`, `scenes/main.tscn`, `scripts/*.gd`, `export_presets.cfg`.
- Browser companion: `web/engine.js` deterministic combat rules, `web/app.js` UI, `web/effects.js` and `web/effects.css` bounded motion/sound feedback, `web/preferences.js` opt-in/persisted settings, `web/index.html` entry.
- Tests: `tests/engine.test.js`, `tests/autoplay.test.js`, `tests/encounter_fairness.test.js`, `tests/encounter_patterns.json`, browser UI and effects Playwright tests, native geometry and turn-flow GDScript tests, CI definitions under `.github/workflows/`.
- Docs: [Locked baseline](docs/PRODUCT_BASELINE_V1.md), [Master build instructions](docs/MASTER_BUILD_PROMPT.md), [demo contract](docs/DEMO_SPEC.md), [code mechanics](docs/GAMEPLAY_IMPLEMENTATION.md), [QA evidence](docs/RELEASE_A_QA.md), [full-game roadmap](docs/FULL_GAME_ROADMAP.md).

### Reproduce the automated checks

```bash
node --check web/engine.js
node --check web/app.js
node --check web/preferences.js
node --check web/effects.js
node tests/engine.test.js
node tests/autoplay.test.js
node tests/encounter_fairness.test.js
node tests/preferences.test.js
node tests/effects.test.js
node tests/ui_contract.test.js
# With @playwright/test@1.56.1 and installed Chromium:
npx playwright test tests/release_browser.spec.cjs tests/ui_browser.spec.cjs tests/setup_browser.spec.cjs tests/effects_browser.spec.cjs --workers=1
# With Godot 4.4.1+:
godot --headless --path . --editor --quit
godot --headless --path . --script res://tests/test_geometry.gd
godot --headless --path . --script res://tests/test_turn_flow.gd
```

CI runs these in clean GitHub-hosted environments; manually verify frame pacing, graphics readability, game feel and first-time-player understanding on your actual school PCs.

## Content and narrative scope

The story alludes to childhood distress and abuse through symbols, warped household objects and architecture rather than graphic reenactment. There is no literal abuser boss. This demo's win is **not** the full canonical ending; the hopeful `(call)` route depends on later accepting safe help and sustained support.

The void hub, school, snow park, paths, ice-cream shop, limited-cost rewind, meta-progression and alternate endings remain **future full-game scope**, gated on Release A quality.

## Reference UI screenshot

![Annotated design feedback](assets/screenshots/ui-feedback-2026-11-17.png)

The red callouts requested optional hover/focus/tap hints and a quiet HUD with character/settings controls before combat. The source and UX tests implement this direction.

## Development orchestration

Six task-specific GPT chat interfaces are linked in the shared Canvas Live workspace (A native/core, B encounter/parity, C HUD/story, D independent QA/release, E animation/sound, F menu/preferences). GitHub PRs and source commits are the integration contract. These chats are **not guaranteed autonomous background processes**. An actual change is complete only after committed code and documented test evidence.
