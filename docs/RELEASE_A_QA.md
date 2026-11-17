# Release A — independent QA, integration and release gate

## Latest verified integration — 2026-11-17 (Agent D, UTC+08)

**Release verdict: NO-GO for human release sign-off.** The integration head independently verified below is `d863ec80eb13a1f92f6d390ad01e794d2dd8f13c`. The pre-integration state was `52b4d47d858c502b816675eeb26b6546cd3be4ab`. Historical entries below remain as dated context; their prior `main` SHAs are **not** the current baseline. The QA-only seeded-test/report PR based on `d863ec80` requires its own passing CI before integration and is not included in the evidence below.

### Reviewed integration decisions and precise diffs

| PR | Review, merge result, risk |
| --- | --- |
| [#32](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/32) | **MERGED FIRST**, `c3a6d6049c7df92e50c7f5ffc9462ced52baf600`. +37 lines in `tests/encounter_fairness.test.js` only. Covers Freeze blocking 12 exact warned patterns, the *one* forced skipped move with HOLD/next ATTACK still legal, and manually injected Numb+Comfort refusing heal without trapping ATTACK. No gameplay engine mutation. |
| [#31](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/31) | **MERGED SECOND**, current `main` `d863ec80eb13a1f92f6d390ad01e794d2dd8f13c`. +148-line Playwright `tests/release_full_run_browser.spec.cjs` and one workflow spec-list addition. Starts actual setup screen, uses 36 rendered tiles and real buttons, waits for *natural* tell timers, reaches two reward screens and demo WIN. It **reads** engine state and pure geometry to choose moves; it does not mutate combat state or fast-forward tells. Automated solver is not novice/manual play. |
| [#23](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/23) | **CLOSED UNMERGED** as outdated after #28's newer 27-pair/11,340-position coverage, #29 Numb/Flinch parity and #32 narrow Freeze/Comfort test port. Do not overwrite the updated floor/Flinch assumptions with older 15,120-case code merely to increase a numerical count. |
| [#24](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/24) | **CLOSED UNMERGED** as stale/overlapping. Its safe-reset, accessible menu and mute/volume work were integrated via [#30](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/30). Merging its 13 older files risks rewinding E's effects and C's accessibility work. |

**Determinism review:** The full-DOM Playwright bot takes a varying `Math.random`-derived reward offer by default, and a test run may therefore take a different modifier route. The new QA-only PR pins a test-local seeded RNG *before the page loads* for reproducibility, without scripting any move, enemy hit or reward choice. The separate 60-seed engine autoplay still tests reward diversity. Review/CI must validate this QA-only adjustment before merging.

### Evidence on the *final integrated main*, not only PR heads

| Verification / what was actually executed | Run/job or artifact | Result |
| --- | --- | --- |
| Node syntax, **15** engine assertions, **60** seeded three-room victories, **840** exact warned-to-strike cases, **27 compatible modifier pairs / 11,340** strike-status positions, preferences and UI contracts | [Release A 44009646378](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44009646378), job `133793344941` | **PASS** |
| Official **Godot 4.4.1** headless editor import, strict script parse, geometry, turn flow, HUD focus/telegraph checks | Same run, job `133793345207` | **PASS (headless, not GUI)** |
| Real Chromium Playwright UI suite: **12 tests passed (25.2s)** including actual DOM full three-room journey, **15 turns, 12 HP remaining**; browser loaded a local `file://` asset, not live Pages | Same run, job `133793345290`, artifact `release-a-browser-qa` (`14296680338`) | **PASS (automated local UI)** |
| Windows x64 Godot cross-export plus actual Windows 2022 **headless** PE/`.pck` startup | Same run, jobs `133793756730` and `133794078191`, artifacts `release-a-windows-x64-cross-export` (`14296236738`) and `release-a-windows-runner-evidence` (`14296655603`) | **PASS (not Windows GUI play)** |
| Additional independent browser accessibility and deterministic web checks | [UI 44009646385](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44009646385), [web 44009646493](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44009646493) | **PASS** |
| Actual Pages `build`, `deploy` and `report-build-status` jobs for this SHA | [Pages 44009646832](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44009646832), jobs `133793315246`, `133793464264`, `133793464328` | **PASS (deployment, not live gameplay)** |
| Earlier #31/#32 standalone PR acceptance jobs | [#31 44007037995](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44007037995), [#32 44007240721](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44007240721) | **PASS on feature PRs; superseded by final-main run above** |

**Evidence boundaries:** Chromium automated UI successfully completes all three rooms, but **the deployed public Pages URL has not been followed through a real live full run**. Windows CI loads the executable *headlessly* and cannot establish graphics, keyboard/gamepad/mouse interactions, audio, actual GPU frame pacing, or a three-room Windows GUI finish. A successful Pages workflow proves a deployment job, not browser behavior from the deployed URL. The full-DOM solver uses internal read-only state for navigation, so it is not evidence of an inexperienced player independently understanding warnings.

### Still-blocking release acceptance

- **P0, Agent D / release owner:** Run the *live* deployed Pages URL in an actual browser through Title → Rusted Pipe → reward → Melted Hanger → reward → Unanswered Call → demo WIN, including reset/death; capture browser/OS, URL, dated video/screenshots and errors.
- **P0, Agent D + A:** Download the exact Windows CI artifact, launch visibly on actual Windows hardware, complete three rooms with mouse and keyboard, inspect audio/settings/restart, and record actual machine, Windows build, observed FPS, crashes and media evidence. Headless runner smoke cannot substitute.
- **P0, Agent D + testers:** Record **10 consecutive complete guided manual playthroughs** without crash/softlock plus **5 first-time novice player evaluations**, with participants' comprehension problems and actual results. Neither gate has been performed or claimed.
- **P1, C/F:** Review 360px touch/keyboard, screenreader and projector legibility *manually*, though headless automated coverage is green. Avoid full-game scope until all P0 acceptance gates pass.

**Next safe milestone:** merge the reproducible QA-test/ledger PR only if its own CI passes; then capture live-browser and actual Windows GUI/human evidence. **Do not tag this as a verified consumer release.**

---

> **CURRENT INTEGRATION ADDENDUM (2026-11-17 UTC+08).** The historical audit below captures the earlier pre-integration state. **Merged main after PRs #12, #9, #14, #17, and #18:** `384a6605ec0f922fba0c91d2d16a648f7206f32d`. Source-of-truth baseline, native Godot parse and turn-lock repairs, C/F pre-game menus and quiet HUD, B encounter parity/fairness, and E motion/audio + D cross-platform release workflow are now integrated. **Integrated PR #18's job [44004263671](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004263671) passed** Linux Godot 4.4.1 import/turn tests, Node, real Chromium, Windows x64 cross-export and Windows 2022 headless launch. **The integrated `main` SHA `384a6605ec0f922fba0c91d2d16a648f7206f32d` has now PASSED the complete automated Release A workflow [run 44004831634](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004831634): Node rules, Chromium keyboard/touch/360px/reduced-motion, Godot 4.4.1 native import/turn tests, Windows x64 cross-export, and actual Windows 2022 headless startup.** The same main SHA's GitHub Pages build [run 44004831360](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004831360) succeeded. **MANUAL WINDOWS GUI GAMEPLAY, ten consecutive complete runs and five novice testers are still NOT VERIFIED.** **Release verdict remains CONDITIONAL / NOT HUMAN SIGNED OFF** until Windows GUI three-room gameplay, five first-time-player evaluations and the 10-run manual softlock check are recorded. Older PR references in the historical log describe superseded integration paths, not current main defects. 


**Owner:** Agent D (QA / CI / integration / release), 2026-11-17 (UTC+08).  
**Status:** **BLOCKED — NOT RELEASE READY.** This is an evidence ledger, not a certification.  
**Initial audited `main` at 10:28 UTC+08:** `b9a976fe3ca8e04a3445f9b6979f338a93377414`. **Refreshed `main` at 10:34 UTC+08:** `a40decae0f6035b56eb7df69713a7094acddef8d` (merged #12 and #9).  
**Source of truth:** `docs/PRODUCT_BASELINE_V1.md` and `docs/MASTER_BUILD_PROMPT.md` merged to `main` from PR #12, plus `docs/DEMO_SPEC.md`, `docs/GAMEPLAY_IMPLEMENTATION.md`, `docs/FULL_GAME_ROADMAP.md` on `main`.

> The reports below describe evidence observed on named commits, **not tests executed by the author on a Windows PC**. Update the SHA and this ledger after each integration. Never transfer a green status from a feature branch to `main`.

## 1. Verified repository snapshot and open PR dependencies

| PR | Actual branch relationship / changed area | Latest checked evidence | Gate decision |
| --- | --- | --- | --- |
| [#12](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/12) | `docs/product-baseline-v1-20261117` → `main`; canonical baseline + build prompt | [Web job 43994279590](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43994279590), green, docs-only | **Review/merge docs first**; docs job is not native proof |
| [#9](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/9) | `agent-a/native-turn-lock-regression-tests` → `main`; `scripts/main.gd`, `attack_patterns.gd`, native tests/workflow | [Godot job 43992244510](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992244510), green Godot 4.4.1 on PR head `18db1d80` | **Hold for integration** with #10's conflicting `scripts/main.gd`; no native main pass |
| [#10](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/10) | `agent-c/quiet-hud-and-pregame-setup` → `main`; native setup and browser HUD | [Chromium 43992804581](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992804581), green on `0a91a548` | **Draft; do not overwrite #9**; native full-run not verified |
| [#11](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/11) | `agent-f/release-setup-preferences` → **`agent-c/quiet-hud-and-pregame-setup`** (NOT `main`); cosmetics, audio/preferences/browser Playwright | [Chromium 43992929423](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992929423), green on `a06354a6` | **Merge to its #10 base first**, then retest final integrated branch |
| [#6](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/6) | `agent-e/v0.3-in-game-effects` → `main`; effects overlapping `web/app.js`, `web/index.html`, `web/style.css` with #10/#11 | [Node 43991305015](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43991305015), green on `07b1f8a6` | **Review and reconcile effects after UX**; no dedicated Chromium evidence |

The table above is the **initial** 10:28 snapshot; by 10:34, #12 and #9 had merged into main, and #11 merged into #10's feature branch (not main). #10 and #6 remain open; new integration PRs #13 and #14 are active. GitHub's `mergeable: true` does **not** show behavioral compatibility. A merged Git tree is not sufficient proof of correct in-game phase and animation lifecycles.

**Remaining integration order:** #12 and #9 are merged into main; #11 is merged into #10's branch. Review #13's native reconciliation into #10 and #14's integration attempt; select one conflict-resolved integration path without duplicate changes. Port/rebase #6 effects last, and rerun all release jobs on the resulting **`main` SHA**. Do not blindly merge these PRs, do not merge Agent D's QA PR over known failures, and do not start full-game worlds.

## 2. GitHub CI evidence on exact commits

| Source | Check / evidence link | Result | What it proves |
| --- | --- | --- | --- |
| `main` `b9a976f` | [Verify playable web demo — 43991257285](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43991257285) | **PASS** | Existing Node syntax / unit / autoplay jobs on legacy main |
| `main` `b9a976f` | [Pages build/deployment — 43991324565](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43991324565) | **PASS (deployment job)** | Deployment job completed; **live URL, asset loads and full browser playthrough NOT VERIFIED** |
| Pre-#9 native version | [Godot issue reproduced — 43992040805](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992040805) | **FAIL** | Reported `scripts/attack_patterns.gd:30` Burst `cell` inference parse error. Import can exit 0 despite script errors |
| PR #9 head | [Native Godot — 43992244510](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992244510) | **PASS on PR** | Official 4.4.1 headless import, strict parse, geometry + 33 native turn-flow assertions |
| PR #10 head | [Browser UI — 43992804581](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992804581) | **PASS on PR** | Headless Chromium quiet HUD and mobile accessibility tests |
| PR #11 head | [Browser UI — 43992929423](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/43992929423) | **PASS on PR** | Headless Chromium setup, persistence, touch and reduced-motion tests |
| Refreshed `main` `a40decae` | [Godot native — 44003401279](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44003401279) | **PASS (main)** | Strict import and turn tests after #9 merge; Windows remains **NOT TESTED** |
| Refreshed `main` `a40decae` | [Web Node — 44003401348](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44003401348); [Pages — 44003401415](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44003401415) | **PASS (main)** | Native/main baseline and Pages job do **not** prove #10/#11 UI present or live browser end-to-end |
| All revisions | 10 full native/browsers runs, 5 novice playtesters, actual Windows GUI playthrough | **NOT TESTED** | Release cannot be signed off |

A workflow file authored in this QA branch is **not itself a successful test**. Check the GitHub Actions URL for the **specific PR SHA** before updating these statuses.

## 3. Implemented QA gates on this branch

`.github/workflows/release-a.yml` provides **hard, independently failing checks** on PR, main push or manual dispatch:

1. **Node:** syntax checks for engine, view and optional preferences; engine assertions; 60 seeded autoplay runs; integrated UI/preferences tests when files exist.
2. **Native Godot 4.4.1:** pin + SHA256 verify official editor, bounded `--editor --quit` import, scan for importer script errors, strict `--check-only` GDScript compilation, geometry and **required** `tests/test_turn_flow.gd`. Missing #9 tests **fail**, not skip.
3. **Real Chromium:** Playwright test suite `tests/release_browser.spec.cjs` exercises TELL input lock, keyboard move/attack, exact 36-cell board, 360px overflow, OS reduced motion, touch HOLD+attack, and required pre-game menu / preferences / optional MEMORY TRACE. Automatically includes #10/#11's browser test specs when merged. Screenshots and failure traces become run artifacts.
4. **Windows x64 cross-export:** runs only after all three automated jobs pass; pinned Godot 4.4.1 templates and `export_presets.cfg`; publishes `.exe`, sidecar `.pck`, source SHA and checksums. **Cross-export is not a Windows playthrough**.
5. **Windows 2022 runner smoke:** downloads the artifact, checks PE header and sidecar, launches the actual `.exe` in **headless mode** with a bounded timeout, and uploads log evidence. **This does not validate graphics, mouse/keyboard UI, audio, GPU or gameplay.**

Because the **initial** main lacked #9's native regression suite and latest `main` still lacks the unmerged #10/#11 UX, a failing Release A PR job is an accurate **NO-GO**, not a flaky check to disable. Do not use a conditional skip to mark a missing required component green.

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
| Native import | Clean editor import and actual scene launch with **zero parse errors** | **Headless CI PASS on `a40decae`; actual native GUI launch NOT TESTED** |
| Three-room flow | Title → Pipe → choice → Hanger → choice → Unanswered Call → **DEMO COMPLETE** on native **and** browser; loss/restart | **NOT TESTED as full guided runs** |
| 6×6 core rules | All 12 patterns warned cells = strike cells; Jab/Sweep/Burst preview matches resolution at edges; tile statuses and source ticks exact | **Partial automated branch-only evidence** |
| Coping | All eight benefit/cost pairs work, distinct three-choice rewards, no Numb/Comfort silent dead option | **Manual integration pending** |
| Input | Mouse, keyboard, touch; no duplicate actions; focused Enter/Space; Esc pause/restart confirmation; no stale effects after restart | **Automated partial; manual pending** |
| Accessibility | 360px, desktop resolutions, projector, reduced-motion, high contrast, retained outlines, static danger labels, focus trap and screen-reader audit | **Automated partial; manual pending** |
| A/V | Attack anticipation, movement, status cues, restrained glitch, mute, volume, no hidden warn, no stalled animations | **NOT TESTED on merged code** |
| Browser release | Live Pages URL checked in actual Chrome/Firefox/Edge/mobile with full 3-room run; capture URL/video | **NOT VERIFIED** |
| Windows | Download specific CI export; check checksums; **real Windows GUI full playthrough**, restart, input, settings and sound | **NOT VERIFIED** |
| Stability | 10 consecutive completed full runs, 5 independent novice testers; report FPS/hardware, exceptions, accessibility problems | **NOT TESTED** |

**Refreshed main-commit `a40decae` decision: NO-GO.** Passing individual PR actions or successful Pages deployment does not satisfy this matrix. The release owner must rerun CI after integration and record real-device evidence before tag, announcement, or any full-game work.

## 6. Triage and ownership

- **P0 / Agent A + C:** The original native Burst parse error is fixed by #9 in current main with Godot CI green. **Integration risk remains**: #10/#11 native setup must preserve phase/keyboard locks. Review #13/#14 and retest final main.
- **P0 / Agent C + F:** #11 has merged into #10's branch, **not main**. Integrate the combined UI with native guards through #13/#14 and validate preferences, accessibility and quiet HUD on final main. Missing features are release failures.
- **P1 / Agent E + F:** Reconcile #6's overlapping `web/app.js`, `web/index.html`, `web/style.css`; ensure effects do not reveal hidden pattern names, break preferences or advance turns.
- **P0 / Agent D:** Preserve native and browser gates; inspect Actions check results and exported `.exe` / `.pck`; collect real Windows and browser playthrough evidence before approval.
- **P1 / release owner:** Correct outdated README “remote not created” section in a separate reviewed docs change. Keep existing main history auditable.

No gameplay balance or full-game content changes are made in the QA gate PR.

## 7. Live update — 2026-11-17, 10:34 UTC+08

- `main` advanced from the original audit `b9a976f` to **`a40decae0f6035b56eb7df69713a7094acddef8d`** through merged source-of-truth #12 and native fix #9. [Main Godot CI 44003401279](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44003401279) and [Node 44003401348](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44003401348) are green. This supersedes the **original** main-native parse blocker, not the manual GUI release gates.
- **#11 merged to #10's branch**; #10 remains open. **#13** [native reconciliation into C](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/13) is open; its [native CI 44003618617](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44003618617) reports 46 headless assertions passing on its own commit. **#14** [C/F + A integration proposal](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/14) is open against main. Preserve #13's additional focused-HUD/SETUP regressions when choosing the integration strategy.
- **Agent D PR #15** [release-a workflow on branch](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/15): [Actions 44003874724](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44003874724) showed Node and native jobs green while Chromium was still executing at this update. These PR checks are **not yet main-commit verification**. Windows cross-export and real Windows playthrough remain unverified.

## 8. Final-main integration update — 2026-11-17, 10:35 UTC+08

- **Main moved again**: [#14](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/14) has been **merged**; latest audited main is **`300f5de2c571656dcc4bbcfe3b48faf34ef20dd6`**. This integrates C/F pre-game UX with A native turn locks. The above initial tables are retained as a timestamped historical record, **not** current PR states.
- On SHA `300f5de2`, [native Godot 4.4.1 — 44004039108](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004039108) and [Node engine — 44004039113](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004039113) show **PASS**. [Chromium UI — 44004039063](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004039063) and [Pages deployment — 44004038450](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004038450) were **IN PROGRESS** at the check; inspect the links for final conclusions.
- New/overlapping work: [#13](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/13) (additional native focused HUD/SETUP tests into C) and [#10](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/10) remain open on diverged branches; reconcile any unported assertions without duplicating #14. [#6](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/6) original effects remains open. Independently confirm effects before merging. An independent Agent E integration branch may supersede #6; check exact source first.
- [QA PR #15](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/pull/15) now tests a **synthetic PR merge commit** built against updated `main`. Its Node and native jobs pass in [run 44004041468](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004041468); Chromium was still executing at this audit. The earlier [QA run 44003874724](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44003874724) against legacy main deliberately identified a **real** `Illegal invocation` during browser `setTimeout` plus missing pre-game settings; the integrated C/F browser fixes must now be verified by fresh tests. Original failures are not grounds to delete coverage.
- **Release remains NO-GO** until independent QA workflow completes on the integrated code, Windows export + actual Windows GUI playthrough exist, browser live 3-room journey is observed, effects are integrated and real-human acceptance is recorded. No release tag or full-game scope.
