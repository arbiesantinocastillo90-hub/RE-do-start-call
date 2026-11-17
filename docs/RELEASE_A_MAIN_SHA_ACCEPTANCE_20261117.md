# Release A — main-commit acceptance ledger (Agent D, 2026-11-17 10:43 PHT)

**Decision: NO-GO / NOT RELEASE READY.** This is an independent snapshot and reproducibility ledger, not a manual gameplay certification.

## Authoritative revision and historical integration

Audited `main` **384a6605ec0f922fba0c91d2d16a648f7206f32d**. This ledger is pinned to that SHA; it must be reverified after each merge. The five product documents reviewed are `docs/PRODUCT_BASELINE_V1.md`, `docs/MASTER_BUILD_PROMPT.md`, `docs/DEMO_SPEC.md`, `docs/GAMEPLAY_IMPLEMENTATION.md`, and `docs/FULL_GAME_ROADMAP.md`. Release A is precisely the 6×6 three-room house, in order Rusted Pipe → Melted Hanger → Unanswered Call; no future-world implementation is authorized by this gate.

Original dependencies **as actually recorded on GitHub**: #12 docs **merged** into main; #9 native guard + Godot 4.4.1 tests **merged** into main; #11 F preferences **merged into the C branch**, not directly main; #10 C original branch **closed unmerged**, subsequently integrated/reconciled in #14; #6 E original effects **closed unmerged**, later integrated in #18. Do **not** try to merge #10 or #6 simply because historical instructions refer to them. Recheck the exact base/head and diff for every new PR. At audit, additional open PRs #20 native input, #21 HUD accessibility, #23 expanded fairness, #24 web UX and #25 release docs were **not** included in this SHA. PR #15 (original Agent D CI) remained open although its workflow changes were already integrated into main via #18; do not merge a stale duplicate.

## Evidence observed for exact main SHA

| Gate | GitHub evidence | Status on audited main | Scope of proof |
| --- | --- | --- | --- |
| Node deterministic JS | [44004831551](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004831551) | **PASS** | Existing web test workflow, not human playthrough. |
| Chromium UI | [44004831604](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004831604) | **PASS** | GitHub Actions headless browser suite. |
| Official Godot 4.4.1 strict import/parse and turn tests | [44004831634](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004831634) | **PASS** native-godot job | Headless import and assertions, not native GUI gameplay. |
| Release A independent Chromium, Node | [44004831634](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004831634) | **PASS** those jobs | Main-commit tests; Windows cross-export was **IN PROGRESS at observation**; do not treat the entire workflow as successful yet. |
| Pages build/deploy | [44004831360](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004831360) | **PASS** deployment job | Does **not** prove live browser walkthrough or endpoint verification. |
| Prior Windows cross-export + actual Windows headless smoke | [44004185023](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call/actions/runs/44004185023) | **PASS on prior PR synthetic merge, NOT this main SHA** | Export + headless executable startup only, NOT Windows keyboard/mouse/audio gameplay. |
| Manual Windows GUI three-room clear, real browser full run, ten consecutive no-softlock runs, five novice testers, performance hardware evidence | No reproducible evidence inspected | **NOT TESTED** | Mandatory release block. |

This follow-up modifies CI to **require** the existing `tests/encounter_fairness.test.js` and `tests/effects.test.js`, execute `tests/effects_browser.spec.cjs`, and run the native HUD accessibility GDScript suite *when it is integrated*. The preexisting browser and native test suites remain mandatory. Optional native HUD coverage is not a substitute for independently reviewing PR #21. The fairness suite already exists on audited main, while #23 expands its coverage only on its PR branch.

## Exact local reproduction

```bash
git clone https://github.com/arbiesantinocastillo90-hub/RE-do-start-call.git
cd RE-do-start-call
git checkout 384a6605ec0f922fba0c91d2d16a648f7206f32d
git rev-parse HEAD
node --check web/engine.js
node --check web/app.js
node --check web/effects.js
node tests/engine.test.js
node tests/autoplay.test.js
node tests/encounter_fairness.test.js
node tests/ui_contract.test.js
node tests/preferences.test.js
node tests/effects.test.js
npm install --no-save --no-package-lock @playwright/test@1.56.1
npx playwright install --with-deps chromium
npx playwright test tests/release_browser.spec.cjs tests/ui_browser.spec.cjs tests/setup_browser.spec.cjs tests/effects_browser.spec.cjs --workers=1 --reporter=line
godot --version # must be 4.4.1 or newer; pinned 4.4.1 in CI
timeout 90s godot --headless --path . --editor --quit
godot --headless --path . --check-only --script res://scripts/main.gd
timeout 45s godot --headless --path . --script res://tests/test_geometry.gd
timeout 45s godot --headless --path . --script res://tests/test_turn_flow.gd
# With 4.4.1 export templates installed:
mkdir -p dist/windows
godot --headless --path . --export-release "Windows Desktop" dist/windows/RE-do-start-call.exe
```

Local commands here are **instructions**, not a false claim that they were run in this chat. For exact CI execution inspect the job logs, not only badge color. Source-targeted tests may be green while unmerged post-integration PRs fail to apply.

## Remaining release-blocking evidence and ownership

| Severity / owner | Blocker and evidence required |
| --- | --- |
| P0 Agent D / release owner | Wait for new CI to finish on this PR then on **final merged main**. Inspect Windows export artifact ID, `.exe` and `.pck`, SHA256SUMS and Windows headless-smoke log. A produced file is not proof of correct gameplay. |
| P0 Agent A + C | Review #20 and #21, particularly focused Enter/Space ownership, 36 danger labels and hide-after-tell; integrate only after headless/native regression checks, then test actual Godot desktop setup → all 3 rooms + death/restart. |
| P0 Agent B | Review #23's exhaustive modifier-hazard coverage and known Numb/Flinch hazard-selection interaction tracked separately in issue #22. Match Godot and JS warning/hazard semantics. |
| P0 Agent F + E | Review #24 preference/reset behavior against effects, and verify sound/reduced-motion/retained warnings on deployed browser with keyboard and real touch. |
| P0 release QA | Obtain measured human native Windows GUI 3-room playthrough, browser 3-room full run, 10 consecutive runs, 5 novice testers, representative 360px/720p/1080p/projector checks, FPS/device logs and accessibility feedback. Do not mark PASS based on headless-only CI. |

**Next safe milestone:** integrate the narrow outstanding Release A fixes after review, obtain green final-main CI, attach matching Windows artifact and human GUI evidence, update this ledger with final SHA and exact run IDs, then explicitly approve/reject Release A. No full-game worlds, tags or release-ready claims until all mandatory gates pass.
