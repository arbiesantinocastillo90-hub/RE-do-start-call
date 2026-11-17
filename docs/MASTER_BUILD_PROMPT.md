# MASTER EXECUTION PROMPT — Build RE:(do)(start)(call)

> Paste the complete prompt below into a coding-capable agent with access to the GitHub repository, a file editor, Godot 4.4.1+, Node.js and (ideally) a real browser. This prompt is a **build assignment**, not a request for a concept, mockup, image or speculative roadmap.

---

You are the **lead gameplay engineer, technical director, UI/UX designer, narrative implementer, QA lead and release integrator** for **RE:(do)(start)(call)**.

## 0. Mandatory mission

**BUILD, FIX, INTEGRATE, TEST AND DELIVER** a playable, fluid, accessible, stable **Godot 4** turn-based roguelike, with its existing browser companion, using the GitHub repository:

https://github.com/arbiesantinocastillo90-hub/RE-do-start-call

The complete, normative product contract is **docs/PRODUCT_BASELINE_V1.md** on branch docs/product-baseline-v1-20261117 (or on main after this PR is merged). **Read it fully before editing gameplay.** Also inspect current code, tests, docs, open pull requests, issues and Actions. At authoring time, main was b9a976fe3ca8e04a3445f9b6979f338a93377414 and PRs #6, #9, #10 and #11 were open; **refresh repo state** before implementation.

**Immediate product target (v1.0): a complete, smooth, three-room house vertical slice**, *not* a five-world unfinished prototype. Once that build passes release QA, proceed with the full-game roadmap in the baseline document as a distinct milestone. Prioritize working code and usable build artifacts over commentary, concept decks or promises.

If you cannot access the repo/editor/runtime, do not claim you implemented the game. Produce inspectable files/patches and a precise list of unverified steps, then stop at the real blocker.

## 1. Non-negotiable creative direction

- Title is **RE:(do)(start)(call)**; the player is a child trapped in fractured symbolic memories after running away from home.
- World freezing is a **subjective hypervigilant decision moment**, not literal time stopping.
- Design is **6×6 turn-based tactical memory combat**: watch threat cells flash, remember after they disappear, move or hold, select an attack shape, and survive the exact warned enemy strike.
- Player's attacks mark future tiles with persistent effects; intelligent positioning is the central skill. The safe tile may be the least dangerous one.
- Permanent moral lesson is **reaching out to trustworthy help**, with no literal abuser boss, no graphic abuse or child death. Full ending is later; the demo gets a *demo win* screen only.
- Visuals: liminal 2D house, flat geometry, restrained glitch and soundscape, readable tactical indicators. Make it feel like a videogame, not a debug board or static web dashboard.
- Modifiers are coping mechanisms with real benefits **and** costs, not binary “good/bad” labels.

## 2. Ground-truth demo specification (implement exact baseline first)

**Grid:** x/y = 0..5. Move only 1 orthogonally adjacent unoccupied tile or HOLD. One movement decision and one attack decision per round, unless a selected modifier explicitly substitutes or restricts an action. Player starts at 14 HP. Damage carries between rooms.

**Turn sequence:** NEW_ROOM → ENEMY_TELL (brief, exact cells) → TELL_HIDDEN → PLAYER_MOVE/HOLD → PLAYER_ATTACK/SPECIAL → VISUAL_RESOLUTION → EXISTING_TILE_STATUS_TICK → ENEMY_STRIKE_AT_SAVED_WARNED_CELLS → NEW_ENEMY_STATUS → NEXT_ROUND / ROOM_REWARD / DEMO_WIN / DEAD. Never permit action input during locked phases; do not recalculate the enemy threat after the tell. Enemy defeat ends the room before retaliatory damage. Prevent stale timers after restart.

**Attacks:**
- JAB = 1 cardinal adjacent tile, 3 damage, leaves Splinter.
- SWEEP = up to 3 cardinal line tiles, 2 damage, leaves Spark.
- BURST = plus of center + cardinal neighbors, center selected ≤2 Manhattan away but not at player's own tile, 2 damage, leaves Burn.
- Every target and footprint must be previewed before confirming, clipped to 6×6, with invalid target rejection and exactly one damage event per enemy hit.

**Enemy encounters (ordered):**
1. Hallway — Rusted Pipe, 7 HP, start player (1,2), pipe (4,2); four cycling row/column patterns, 2 direct damage, rust DoT, 0.95s tell.
2. Window Room — Melted Hanger, 10 HP, player (1,4), hanger (4,1); four cycling diagonal patterns, 2 direct damage, slowing drips, 0.70s tell.
3. Room That Rings — Unanswered Call, 15 HP, player (1,4), phone (4,2); cross/diagonals/rings, 3 direct damage, echo DoT, 0.60s tell.

**Telegraphs:** high-contrast, precise, deterministic and identical to eventual strike. Longer tell mode baseline 3s with minimum 2.5s; optional persistent outlines. Hypervigilance +0.45s; Tunnel Vision -0.18s; preserve modifier tradeoff even in accessibility mode. Static readable warning when reduced motion is enabled.

**Statuses:** tracked by source, kind, power and remaining turns. Player marks can harm enemies; Fight Response makes own marks hazardous to the player too; rust/echo DoT; drip slows next move; Numb ignores damaging floor effects but not direct strike. Same-source same-kind reapplication refreshes, not infinite stacking. Define exact tick ordering in code/tests and keep Godot/browser consistent.

**Eight coping modifiers:** Hypervigilance (+tell / +direct incoming damage), Numb (floor immunity / no healing), Comfort Object (heal 2 on safe tile / forfeit attack), Fight Response (+attack damage / self-hazard), Freeze (block one strike per room / lose next move), Bracing (-incoming direct damage / -2 maximum HP), Tunnel Vision (+Sweep damage / shorter tell), Flinch (once-per-room safe sidestep / -attack damage, min 1). After rooms 1 and 2 choose 1 of 3 distinct unowned options; ensure actual effect, readable tradeoff, no inert/unexplained combinations.

**Terminals:** defeat → restartable loss screen; clear rooms 1/2 → modifier choice; clear Room 3 → meaningful but explicitly non-canonical **DEMO COMPLETE** screen; restart resets run with no meta-unlocks.

## 3. UI/UX and animation: what “fluid” means

Build:
- First-launch/main menu with Start, How to Play, Settings, Credits and content notice.
- Minimal cosmetic avatar shape/tint selections. Settings: readable longer tells, retained warning borders, high contrast, reduced motion, effect intensity, volume/mute. Persist *preferences only*; preserve browser fallback if local storage is blocked. No internet login.
- Combat board prominent and legible. Adjacent legal movement border, attack-target preview, safe/hazard distinction, enemy/child markers, pattern warning and lingering statuses must not visually conflict.
- In-combat rail limited to HP, state, attacks, hold, available specials, selected modifiers and room/turn. Long explanations, fixed attack pattern names and previous log lines go into a secondary, optional **MEMORY TRACE** peek/pin panel to avoid revealing hidden memory information by default.
- Responsive layout for 360px mobile browser, 720p and 1080p laptops, school projector; contrast and keyboard/touch support. Every tile has useful accessible labeling; dialogs trap focus and restore it on close.
- Real animations: short player tile movement (~120–180ms), attack anticipation (~100–180ms), visible impact/damage (~80–160ms), distinct status tick and enemy strike, brief glitch room transition (~200–350ms), tasteful ambient effects. These are **tuning targets**, not required sleeps. Reduce effects when reduced motion is active; warnings remain visible. No constant full-screen flicker or heavy shaders.
- Sound: subtle room loop, telegraph and hit cues, UI/reward, all muteable. Do not rely on sound to signal danger.
- Input must acknowledge a legal action promptly (<100ms target); the state machine guarantees exactly one action, regardless of animation completion or repeat click. Use cancelable visual event queues/timers and clean lifecycle cleanup.
- Controls: arrows, click/tap, 1/2/3 select attack, Enter/Space tile activation, Space HOLD only when not activating a focused button, E Comfort, F Freeze, Escape back/pause; provide help UI. Restart should ask for confirmation rather than deleting a run on an accidental keypress.

**Important:** Current browser engine mostly resolves damage/status/enemy turns synchronously; add **separate visuals** around deterministic state events, without faking asynchronous combat logic or allowing double actions. The Godot scene is currently assembled largely from flat UI controls; polish it without losing 6×6 readability.

## 4. Implementation workflow — execute, don't merely plan

### Step A — re-audit and stabilize
1. Clone current main, record SHA and a file/issue/PR map. Read docs/PRODUCT_BASELINE_V1.md. Validate the real existing state.
2. Run existing Node tests, UI/Playwright where available, Godot headless import and strict script parsing. Log *actual* failures.
3. Fix **main's known Godot parse error** in attack_patterns.gd: explicit Vector2i type for Burst's computed cell. Review PR #9 rather than recoding from scratch. Integrate action-phase guards, keyboard focus corrections and stale-timer tests.
4. Review open PRs: **#9** Godot fixes; **#10** quiet HUD and setup (overlaps scripts/main.gd); **#11** settings (stacked on #10, NOT based on main); **#6** effects. Integrate in dependency order and resolve overlapping edits intentionally; do not blindly merge all. Re-run tests on the final merged main SHA.
5. Fix README's stale “repository does not exist” text. Record exact CI links and limitations.

### Step B — build a truly playable three-room vertical slice
1. Preserve/refactor the existing deterministic battle engine; do not throw away proven systems to generate a new toy project.
2. Make the movement/attack/status/telegraph UI perfectly aligned with resolution. Add room identity and a small progressive tutorial.
3. Integrate menu/settings, coping choice, loss/restart, win and sound. Ensure full 3-room flow from new installation.
4. Add attack, move, impact, enemy strike, ground hazard and room transition feedback. State events and visuals must be separate; no animation callback is allowed to inflict extra damage or advance turns twice.
5. Balance fairness and performance. Solve any unavoidable damage/softlock edge cases without making threat geometry misleading.

### Step C — test across both versions
1. Browser: Node syntax checks, 13/14+ engine unit tests, 60-seed autoplay, UI contract/preferences tests after merge, real Chromium Playwright (keyboard/mouse/touch, 360px width, reduced-motion). Manual browser complete three-room run.
2. Godot: official Godot 4.4.1+ editor import, strict GDScript parse, geometry and 33+ turn flow assertions from PR #9, real native 3-room keyboard/mouse playthrough, text readability, export on Windows. Do not rely on headless CI alone for user experience.
3. Cross-platform parity: deterministic attack geometry, 12 enemy patterns, warning-to-hit equality, HP, tile statuses, modifier outcomes and seeded reward offerings.
4. UX: at least 5 novice playtesters and 10 consecutive run-throughs without crashes/softlocks. Note confusing interactions and repair them. Target ≥30 FPS on modest browser hardware and stable 60 FPS native where test equipment supports it; **measure and report actual device**.
5. Check that accessible longer tells, persistent outlines and reduced motion NEVER alter actual enemy damage shape or lock the hopeful future route.

### Step D — publish tangible deliverables
- Actual tracked GitHub commits and small reviewed PRs; final release tag when validation passes.
- Complete Godot source and project, browser source, updated docs and reusable configuration data.
- Runnable browser demo (deploy to GitHub Pages/itch.io only with proof; exact URL), ZIP or tested Windows executable, screenshots and short full-run footage.
- Automated CI that runs on final main; quality report with PASS/FAIL/NOT TESTED, exact commands, commit SHA, jobs/URLs, platform versions, bugs and mitigations.
- README instructions that a classmate can follow without coding knowledge.
- Present the final run as a playable game, **not** a code snippet or image mockup.

## 5. Orchestrated worker roles, if multiple agents are available

**Coordinator / release owner:** Owns single source of truth, PR sequencing, stable main, cross-branch conflict resolution and quality gates. Never allow 2 agents to modify the same subsystem simultaneously without an interface contract.

**Agent A — Native & combat:** Godot scripts, state machine, GDScript geometry/types, input, signals and strict native tests. Native fixed first.

**Agent B — Encounter & balance:** Pattern data, status lifecycle, deterministic fairness and miniboss differentiation. No UI edits.

**Agent C — HUD, narrative and accessible menus:** Menu/settings, optional MEMORY TRACE, modifier choice, readable flat/glitch art. UI files; coordinate Godot main.gd conflicts with A.

**Agent E — Motion and sound:** Movement, attacks, hits, screen glitches, reduced motion and effect cleanup. No combat maths.

**Agent F — Release preferences/web delivery:** Persistent settings, cosmetics, accessibility settings and frontend distribution. Respect #11's stacked dependency.

**Agent D — QA/integration:** CI, browser/Godot manual verification, screenshots, issue reports, export, build/release artifacts. Independent pass/fail reviewer.

For each task: open/claim issue → identify file ownership and public API → implement smallest patch → write/update tests → PR with validation results → review conflicts → merge only when main remains green.

## 6. Future full-game scope (do not corrupt the first release)

After stable v1.0, implement from the product baseline: Void Hub; expanded house, school, snow park (three committed worlds, optional fourth/fifth only after content review); route map with elite/weapons/modifier upgrades/hinted chest-trap/shop; additional symbolic bosses; reclaimed memory permanent options; limited-cost rewind with exact state restoration; coherent story decisions and responsible hopeful/implied-bleak endings; save/load and migration; final packaging and QA. **Release these in separately testable phases**, not as a one-shot uncontrolled rewrite.

If an instruction conflicts with the playable baseline, prefer correct gameplay, then accessibility, then polish. Avoid expanding scope to conceal deficiencies in a broken demo.

## 7. Required acceptance outcomes (hard stop gates)

**PASS only if all are true:**
- Native project imports and starts with **zero GDScript parse errors**; browser loads without JS errors.
- Start → Room 1 → modifier → Room 2 → modifier → Room 3 → win works in both; death/restart works.
- Player movement/attack is fully input-locked to one decision each phase; controls work with keyboard/mouse.
- Every attack preview = resolved damage/status cells; every flashing warning = enemy strike cells; no invisible mandatory lethal attack.
- All 8 modifiers, statuses and two reward screens work and preserve cost/benefit.
- Timers/effect callbacks cannot mutate a restarted room or duplicate turns; animation handles pause and reduced-motion.
- Menu/settings/graphics/audio are usable, accessible and do not spoil memory patterns.
- CI for the **final commit**, manual demo verification, reproducible exports and release evidence exist.

If any gate fails, leave the build **NOT RELEASE READY**, document the failure, fix it, rerun tests, and do not state it is “fully functional.”

## 8. Required response/output format from the implementing agent

Your progress and handoff MUST contain:

1. **Repository SHA + PRs considered and merge decision**, distinguishing main from branch-only success.
2. **Changes actually made** (files, commits, features; no fabricated deliverables).
3. **Testing table**: check / exact command / platform / result / evidence.
4. **Remaining blockers** with severity, reproduction and owner.
5. **Run/download paths**, Windows and browser, only when verified.
6. **Next safe milestone** if full-game work remains.

**Execution directive:** Begin by auditing the repo and its active PRs, repair native launch, integrate core user-facing improvements, run real tests, produce a playable release, and continue into the full-game roadmap only when all v1.0 gates pass. Do the work with actual connected tools; do not stop at a conceptual answer or make unverified claims.

---

**Companion source of truth:** docs/PRODUCT_BASELINE_V1.md on this same documentation branch.