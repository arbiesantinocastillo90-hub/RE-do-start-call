# Release A — independent QA, integration and release gate

**Owner:** Agent D (QA / CI / integration / release), 2026-11-17 (UTC+08).  
**Status:** **BLOCKED — NOT RELEASE READY.** This is an evidence ledger, not a certification.  
**Audited `main`:** `b9a976fe3ca8e04a3445f9b6979f338a93377414`.  
**Source of truth:** `docs/PRODUCT_BASELINE_V1.md` and `docs/MASTER_BUILD_PROMPT.md` on `docs/product-baseline-v1-20261117` (PR #12), plus `docs/DEMO_SPEC.md`, `docs/GAMEPLAY_IMPLEMENTATION.md`, `docs/FULL_GAME_ROADMAP.md` on `main`.

> The reports below describe evidence observed on named commits, **not tests executed by the author on a Windows PC**. Update the SHA and this ledger after each integration. Never transfer a green status from a feature branch to `main`.

## 1. Verified repository snapshot and open PR dependencies

| PR | Actual branch relationship / changed area | Latest checked evidence | Gate decision |
| --- | --- | --- | --- |
| [#12](../pull/12) | `docs/product-baseline-v1-20261117` → `main`; canonical baseline + build prompt | [Web job 43994279590](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43994279590), green, docs-only | **Review/merge docs first**; docs job is not native proof |
| [#9](../pull/9) | `agent-a/native-turn-lock-regression-tests` → `main`; `scripts/main.gd`, `attack_patterns.gd`, native tests/workflow | [Godot job 43992244510](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992244510), green Godot 4.4.1 on PR head `18db1d80` | **Hold for integration** with #10's conflicting `scripts/main.gd`; no native main pass |
| [#10](../pull/10) | `agent-c/quiet-hud-and-pregame-setup` → `main`; native setup and browser HUD | [Chromium 43992804581](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992804581), green on `0a91a548` | **Draft; do not overwrite #9**; native full-run not verified |
| [#11](../pull/11) | `agent-f/release-setup-preferences` → **`agent-c/quiet-hud-and-pregame-setup`** (NOT `main`); cosmetics, audio/preferences/browser Playwright | [Chromium 43992929423](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992929423), green on `a06354a6` | **Merge to its #10 base first**, then retest final integrated branch |
| [#6](../pull/6) | `agent-e/v0.3-in-game-effects` → `main`; effects overlapping `web/app.js`, `web/index.html`, `web/style.css` with #10/#11 | [Node 43991305015](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43991305015), green on `07b1f8a6` | **Review and reconcile effects after UX**; no dedicated Chromium evidence |

All five PRs were open at audit time. PR #9/#10/#12 were draft; #6/#11 were not. GitHub's `mergeable: true` does **not** show behavioral compatibility. A merged Git tree is not sufficient proof of correct in-game phase and animation lifecycles.

**Order of integration:** (1) review #12 canonical docs, (2) reconcile #9's strict native guards with #10's setup transitions and R/keyboard focus rules, (3) land #11 **onto #10**, (4) port/rebase #6 effects without replacing setup/preferences/hidden memory, (5) run all release jobs against the resulting **`main` SHA**. Do not blindly merge these PRs, do not merge Agent D's QA PR over known failures, and do not start full-game worlds.

## 2. GitHub CI evidence on exact commits

| Source | Check / evidence link | Result | What it proves |
| --- | --- | --- | --- |
| `main` `b9a976f` | [Verify playable web demo — 43991257285](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43991257285) | **PASS** | Existing Node syntax / unit / autoplay jobs on legacy main |
| `main` `b9a976f` | [Pages build/deployment — 43991324565](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43991324565) | **PASS (deployment job)** | Deployment job completed; **live URL, asset loads and full browser playthrough NOT VERIFIED** |
| Pre-#9 native version | [Godot issue reproduced — 43992040805](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992040805) | **FAIL** | Reported `scripts/attack_patterns.gd:30` Burst `cell` inference parse error. Import can exit 0 despite script errors |
| PR #9 head | [Native Godot — 43992244510](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992244510) | **PASS on PR** | Official 4.4.1 headless import, strict parse, geometry + 33 native turn-flow assertions |
| PR #10 head | [Browser UI — 43992804581](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992804581) | **PASS on PR** | Headless Chromium quiet HUD and mobile accessibility tests |
| PR #11 head | [Browser UI — 43992929423](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992929423) | **PASS on PR** | Headless Chromium setup, persistence, touch and reduced-motion tests |
| Current `main` | Godot/Windows release test job | **NOT RUN / NOT AVAILABLE** | Native and Windows functionality **not** established on main |
| All revisions | 10 full native/browsers runs, 5 novice playtesters, actual Windows GUI playthrough | **NOT TESTED** | Release cannot be signed off |

A workflow file authored in this QA branch is **not itself a successful test**. Check the GitHub Actions URL for the **specific PR SHA** before updating these statuses.

## 3. Implemented QA gates on this branch

`.github/workflows/release-a.yml` provides **hard, independently failing checks** on PR, main push or manual dispatch:

1. **Node:** syntax checks for engine, view and optional preferences; engine assertions; 60 seeded autoplay runs; integrated UI/preferences tests when files exist.
2. **Native Godot 4.4.1:** pin + SHA256 verify official editor, bounded `--editor --quit` import, scan for importer script errors, strict `--check-only` GDScript compilation, geometry and **required** `tests/test_turn_flow.gd`. Missing #9 tests **fail**, not skip.
3. **Real Chromium:** Playwright test suite `tests/release_browser.spec.cjs` exercises TELL input lock, keyboard move/attack, exact 36-cell board, 360px overflow, OS reduced motion, touch HOLD+attack, and required pre-game menu / preferences / optional MEMORY TRACE. Automatically includes #10/#11's browser test specs when merged. Screenshots and failure traces become run artifacts.
4. **Windows x64 cross-export:** runs only after all three automated jobs pass; pinned Godot 4.4.1 templates and `export_presets.cfg`; publishes `.exe`, sidecar `.pck`, source SHA and checksums. **Cross-export is not a Windows playthrough**.
5. **Windows 2022 runner smoke:** downloads the artifact, checks PE header and sidecar, launches the actual `.exe` in **headless mode** with a bounded timeout, and uploads log evidence. **This does not validate graphics, mouse/keyboard UI, audio, GPU or gameplay.**

Because original `main` lacks #9's native regression suite, #10's setup and #11's controls, a failing Release A PR job is an accurate **NO-GO**, not a flaky check to disable. Do not use a conditional skip to mark a missing required component green.

## 4. Reproduction commands

Use a clean checkout and archive all standard output, exit codes, screenshots, logs, hardware/OS and the exact `git rev-parse HEAD`:

```bash
git clone https://github.com/arbiesantinocastillo90-hub/RE-do-start-call.git
cd RE-do-start-call
git rev-parse HEAD
node --check web/engine.js
node --check web/app.js
node tests/engine.test.js
node tests/autoplay.test.js
# After #10/#11 are integrated:
node tests/ui_contract.test.js
node tests/preferences.test.js
npm install --no-save --no-package-lock @playwright/test@1.56.1
npx playwright install --with-deps chromium
npx playwright test tests/release_browser.spec.cjs tests/ui_browser.spec.cjs tests/setup_browser.spec.cjs --workers=1 --reporter=line
```

With the official **Godot 4.4.1** editor installed and #9 integrated:

```bash
godot --version
timeout 90s godot --headless --path . --editor --quit
godot --headless --path . --check-only --script res://scripts/attack_patterns.gd
godot --headless --path . --check-only --script res://scripts/main.gd
timeout 45s godot --headless --path . --script res://tests/test_geometry.gd
timeout 45s godot --headless --path . --script res://tests/test_turn_flow.gd
# After installing matching Windows export templates:
mkdir -p dist/windows
godot --headless --path . --export-release "Windows Desktop" dist/windows/RE-do-start-call.exe
```

On a Windows machine, replace GNU `timeout` with a PowerShell process timeout. Check the exact artifact uploaded by the Actions run; do not use an unrecorded local export as release evidence.

## 5. Human acceptance checklist — all must pass for Release A

| Category | Required manual/evidence gate | Current status |
| --- | --- | --- |
| Native import | Clean editor import and actual scene launch with **zero parse errors** | **BLOCKED on main** |
| Three-room flow | Title → Pipe → choice → Hanger → choice → Unanswered Call → **DEMO COMPLETE** on native **and** browser; loss/restart | **NOT TESTED as full guided runs** |
| 6×6 core rules | All 12 patterns warned cells = strike cells; Jab/Sweep/Burst preview matches resolution at edges; tile statuses and source ticks exact | **Partial automated branch-only evidence** |
| Coping | All eight benefit/cost pairs work, distinct three-choice rewards, no Numb/Comfort silent dead option | **Manual integration pending** |
| Input | Mouse, keyboard, touch; no duplicate actions; focused Enter/Space; Esc pause/restart confirmation; no stale effects after restart | **Automated partial; manual pending** |
| Accessibility | 360px, desktop resolutions, projector, reduced-motion, high contrast, retained outlines, static danger labels, focus trap and screen-reader audit | **Automated partial; manual pending** |
| A/V | Attack anticipation, movement, status cues, restrained glitch, mute, volume, no hidden warn, no stalled animations | **NOT TESTED on merged code** |
| Browser release | Live Pages URL checked in actual Chrome/Firefox/Edge/mobile with full 3-room run; capture URL/video | **NOT VERIFIED** |
| Windows | Download specific CI export; check checksums; **real Windows GUI full playthrough**, restart, input, settings and sound | **NOT VERIFIED** |
| Stability | 10 consecutive completed full runs, 5 independent novice testers; report FPS/hardware, exceptions, accessibility problems | **NOT TESTED** |

**Main-commit decision: NO-GO.** Passing individual PR actions or successful Pages deployment does not satisfy this matrix. The release owner must rerun CI after integration and record real-device evidence before tag, announcement, or any full-game work.

## 6. Triage and ownership

- **P0 / Agent A + C:** Native Burst parse error and phase/keyboard guard conflict; reproduce against current main Godot 4.4.1 then reconcile #9 with #10. CI must pass on final main.
- **P0 / Agent C + F:** Merge stacked #11 into #10 and validate required setup, preference persistence and quiet HUD after base integration. Missing features are release failures.
- **P1 / Agent E + F:** Reconcile #6's overlapping `web/app.js`, `web/index.html`, `web/style.css`; ensure effects do not reveal hidden pattern names, break preferences or advance turns.
- **P0 / Agent D:** Preserve native and browser gates; inspect Actions check results and exported `.exe` / `.pck`; collect real Windows and browser playthrough evidence before approval.
- **P1 / release owner:** Correct outdated README “remote not created” section in a separate reviewed docs change. Keep existing main history auditable.

No gameplay balance or full-game content changes are made in the QA gate PR.
