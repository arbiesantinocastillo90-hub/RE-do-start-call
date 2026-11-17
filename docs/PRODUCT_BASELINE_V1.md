# RE:(do)(start)(call) — Product Baseline v1.0

**Status:** Proposed, reviewable source-of-truth document.  
**Date:** 2026-11-17. **Audited main SHA:** b9a976fe3ca8e04a3445f9b6979f338a93377414.  
**Game:** Single-player, 2D, turn-based, tactical-memory, tile-status roguelike.  
**Primary platform:** Godot 4.4.1+ / GDScript / desktop Windows; **secondary:** browser playable companion.  
**First release gate:** A genuinely playable, fluid, three-room house vertical slice. **Full game** follows behind that gate.

This document distinguishes **non-negotiable design**, **current source implementation**, **release acceptance**, and **future development**. Never mistake an implemented code path or green CI badge for verified gameplay or visual polish. For a change to become product policy, revise this file and its tests together; use a PR.

## 1. Vision and identity — LOCKED

**Pitch:** A boy impulsively runs away from home, cries, and wakes inside a fractured dimension constructed from traumatic memory. He is caught in a loop. The world stops in *his perception* because hypervigilance taught him to read danger; it is not literal time-stopping magic. His ability to identify the safe tile represents the player's own learned skill. Worlds communicate distress through places, objects, sound, and symbolism rather than reenactment.

**Title:** RE:(do)(start)(call). “Redo” and “restart” suggest loops; “call” quietly anticipates accepting help. Maintain the punctuation on menus and in display text; the existing GitHub slug is RE-do-start-call.

**Design pillars:**
1. **Read → remember → decide:** exact threat geometry is briefly disclosed, then hidden before action; understanding beats reflex spam.
2. **Movement is the defense:** each 6×6 tile matters; the goal is to choose the safest viable place, often the *least bad* one.
3. **Your attacks change the board:** area attacks leave statuses, including self-risk when build choices explicitly permit it.
4. **Every coping mechanism has a cost:** upgrades are powerful decisions, not unqualified stat boosts or moral judgments.
5. **Readable atmosphere over spectacle:** liminal imagery, restrained glitches, symbolism, excellent feedback; never hide necessary combat information.
6. **Hope is an action:** the full game's hopeful ending rewards accepting safe assistance, not defeating a person.

**Tone and safety:** No literal abuser boss; no graphic depiction of child abuse, self-harm, or death. Avoid framing suffering as a game score or portraying a single phone call as instantaneous healing. Optional content notice before play. Good ending: he reaches safety, can contact trusted authorities/adults, and eventually experiences ongoing care. Bleak ending: implied isolation only, no graphic scene. Assistance choices must be independent of combat difficulty/accessibility settings.

## 2. Version and scope — LOCKED

### Release A: polished house demo (v1.0, REQUIRED FIRST)

Exactly **6×6 board**, **one house world**, **three sequential rooms**:
- Room 1: **The Hallway**, Rusted Pipe tutorial.
- Room 2: **The Window Room**, Melted Hanger encounter.
- Room 3: **The Room That Rings**, Unanswered Call miniboss.
- After Rooms 1 and 2: offer three distinct coping modifiers and keep one.
- After Room 3: demo completion screen; NOT the full game's canonical ending.
- Include death/restart, game menu, settings, accessible input, audio/visual feedback, credits/content note, and verified exports.
- The user should be able to finish a run without outside guidance and without touching developer tools.

### Release B: full game (ONLY after Release A passes QA)

Void hub, expanded house, liminal school, liminal snow park, up to five total worlds (three committed worlds; world slots four/five optional after narrative validation); map choices (normal, elite, weapon, modifier upgrade, hinted chest/trap, ice-cream-man shop); broader weapons/enemies; bounded rewind costing Mental Stability; recovered memories and permanent options; story decisions with hopeful and implied bleak conclusions. Exact content count for the optional worlds is deliberately NOT locked. Do not place these systems into Release A.

**Non-goals for A:** saves of permanent meta-progress; procedural new worlds; elaborate 3D art; network multiplayer; online accounts; paid services; untelegraphed mandatory damage; full alternate endings.

## 3. Exact demo mechanics — LOCKED starting contract

### 3.1 Grid, player, and action order

- Grid: x,y integer 0..5; origin (0,0) at top-left; max one actor per cell. No wrapping, clipping, or moving through enemies.
- Player begins a room at the designated spawn; movement is **one orthogonally adjacent free tile**, or **HOLD** to skip movement. No diagonal movement by default.
- Each round has exactly one player movement decision and one attack decision (unless a modifier explicitly replaces/blocks one).
- State machine:
  **ROOM_START → ENEMY_TELL → TELL_HIDDEN → PLAYER_MOVE_OR_HOLD → PLAYER_ATTACK_OR_MODIFIER_ACTION → ACTION_ANIMATION → STATUS_TICK → ENEMY_RESOLVE → RESULT_ANIMATION → (NEXT_TELL | REWARD | WIN | DEAD)**.
- The visual animation states must NOT allow an extra input/action. Combat rules resolve at deterministic checkpoints and visuals consume emitted events, rather than changing HP based on animation frames.
- Enemy attacks are *announced before the player's decision* and resolve **after** the player's action. Reapply the exact warning cell IDs; never recompute a new pattern after the tell.
- On defeating an enemy, clear immediately into reward/win without a retaliatory attack. Timer/callback invalidation prevents old warnings from corrupting restarted rooms.
- If movement is disabled by Slow/Freeze, HOLD remains possible; no softlocks.
- No enemy body motion is required in A; enemy positions may remain fixed. Later movement should be data-driven.

### 3.2 Starter HP, attacks and targeting

- Player base HP **14**; unchanged across rooms except for damage/healing/modifiers; new room does NOT restore full HP unless a specific reward states that.
- Jab: single *cardinal adjacent* tile; base **3 direct damage**; leaves **Splinter**.
- Sweep: **up to 3 cells** in a chosen cardinal ray originating from the player; base **2 direct damage**; leaves **Spark**.
- Burst: **plus-shaped** center + four cardinal neighbors; center targeted within Manhattan distance **≤2**, but center may not equal the attacker's own tile under current implementation; base **2 direct damage**; leaves **Burn**.
- Attacks may target empty cells and still deposit effects. Target selection previews every affected cell before confirmation; never mark invalid targets as legal.
- Current enemy takes a single direct hit per attack if it is within the footprint; do not multiply direct damage by the number of marked cells.
- All footprints are clipped to the board. Unrecognized shapes and out-of-bounds *origin or target* are invalid; the core source currently needs an origin-boundary fix in PR #9.
- Attacks leave statuses for two nominal resolution ticks; the present code applies direct damage, adds player statuses, then ticks pre-existing/new player statuses and places enemy statuses afterward. Keep consistent across Godot/browser and document that a newly created player mark can tick during the current action resolution while new enemy marks tick on later turns.
- Status record: {kind, owner, turns_left, potency}. Reapplying same (tile, owner, kind) refreshes remaining duration/potency rather than stacking unbounded duplicate copies. Different kinds may coexist. Enemy rust/echo damage on standing tile; Hanger drip prevents next movement; player marks hurt the enemy standing on them; player marks only harm the child when **Fight Response** is active. Numb suppresses damaging floor effects, not direct strikes; slow still applies unless specifically overridden.
- Incoming direct damage may be reduced to zero by modifiers, never negative. Ground damage/death checks must happen at a deterministic stage.

### 3.3 Memory telegraphs — fairness is mandatory

- All 12 baseline patterns (four per room) are **deterministic, learnable and repeat cyclically**.
- Warn with high-contrast pattern footprint; hide; then let the player act; strike the **same cells**. Persistent warn outlines are optional accessibility mode, OFF by default.
- Baseline tell durations: Room 1 **0.95s**; Room 2 **0.70s**; Room 3 **0.60s**. Adjustable constants, not frame-count assumptions. Accessibility: longer tells **at least 2.5s**, with modifier deltas preserved, and optional retained outlines. No hidden-telegraph mandatory attacks in A.
- Hypervigilance adds 0.45s; Tunnel Vision removes 0.18s; normal lower bound 0.30s. In extended timing mode use baseline 3.0s + deltas, floor 2.5s.
- Telegraph readability takes priority over scanlines, motion effects, decorative overlay, text and audio. If reduced motion is enabled, warning stays perceptible with static color/symbol instead of pulsing.

### 3.4 Encounters — baseline data

| Room | Enemy | HP | Position | Player spawn | Direct strike | Threats, cycling 4 patterns |
|---|---|---:|---|---|---:|---|
| 1 | Rusted Pipe | 7 | (4,2) | (1,2) | 2 | row 2, col 1, row 4, col 4; rust |
| 2 | Melted Hanger | 10 | (4,1) | (1,4) | 2 | sum diagonal 5, difference diagonal 0, sum 3, difference 2; drips |
| 3 | Unanswered Call | 15 | (4,2) | (1,4) | 3 | cross at (2,2), dual diagonals, near radius-2 ring, far radius-3 ring around (3,2); echo |

Indices are 0-based; arrays and symbols already exist in source. A stronger boss phase or additional telegraph variation is an *optional post-stabilization* design change; must preserve learnability and pass fairness tests. Do not introduce new attacks just to increase difficulty.

### 3.5 Modifiers — all 8 required in A

| ID | Name | Benefit | Drawback |
|---|---|---|---|
| hyper | Hypervigilance | +0.45 s tell time | +1 direct strike damage |
| numb | Numb | Ignore damaging floor statuses | Cannot regain HP |
| comfort | Comfort Object | Spend attack to heal up to 2 HP on safe cell | Forgo attack |
| fight | Fight Response | +1 direct attack damage | Player-created lingering tiles harm player |
| freeze | Freeze | Block one enemy strike per room | Lose next movement |
| bracing | Bracing | -1 direct strike damage | -2 max HP |
| tunnel | Tunnel Vision | +2 Sweep direct damage | -0.18 s tell time |
| flinch | Flinch | Once per room auto-step to safe adjacent cell if threatened | -1 direct attack damage, min 1 |

Rewards: after each of the first two rooms, present exactly 3 distinct *unowned* modifiers, display both benefit and cost BEFORE choice, and offer a selectable fallback if a modifier is temporarily inapplicable. Do not silently grant an unoffered reward. Replays vary the choices via seeded RNG for reproducible tests; no persistence in A. Numb + Comfort is an inert pairing; filter mutually incompatible offerings or explain the interaction clearly. Do not change meaning of tradeoffs during UX polish.

## 4. Product experience and visual direction — REQUIRED

**Art:** restrained 2D minimalist geometric silhouettes, ash blue/charcoal rooms with selective amber telegraph and distinct danger hues; liminal household shapes, slight visual wrongness (size, perspective, repeated props). Atmosphere through typography, environmental motion, audio and lighting rather than expensive illustrations. No stock/watermarked dependency, no visual plagiarism.

**UI:**
- Title/Start, How to Play, Settings, Credits, Content Notice; menu before gameplay.
- Player avatar cosmetic **three simple silhouettes × three tints**. Cosmetic only; does not modify collision, stats, or threat readability.
- Game HUD: prominent 6×6 grid; player/enemy HP; room/turn; action state; 3 attack choices; HOLD; unlocked abilities; owned modifiers. Keep lore, logs, hints and pattern names in an **optional, non-spoiling MEMORY TRACE** disclosure, reveal by hover/focus/tap and pin/unpin.
- Prefer gameplay target and status visibility over lengthy prose during battle. Give distinctive affordances for movement, attack footprint, active warning, prior warning (optional), lingering damage, slow, enemy and player occupancy.
- Mouse, keyboard and touch should work where platform permits. Keyboard: arrows move or change focused target by phase, 1/2/3 attack, Space HOLD when not activating focused button, Enter/Space commit focused target, E Comfort, F Freeze, Esc pause/back. Reset/restart via confirmation to prevent accidental loss. Screenreader labels for 36 tiles, menu focus trapping, visible focus ring.
- Settings: longer tells, persistent warnings, contrast, reduced motion (system preference takes precedence), graphics effects, sound volume/mute. Persist **cosmetic and accessibility settings only**, never health/progress/cheat state for A. Respect restricted/blocked browser storage.
- On narrow screens board scales/reflows without tile overlap and controls retain touch targets. Old school hardware and projectors must remain legible at reduced resolution.

**Motion:** Rules are discrete, presentation is fluent. Move **120–180 ms**, attack anticipation **100–180 ms**, impact flash **80–160 ms**, room fade **200–350 ms** as initial tuning targets. Show enemy strike and status tick separately, each with a readable cue, without extending the user's turn unnecessarily. UI should acknowledge input within about **100 ms**. Disable/shorten nonessential motion on reduced-motion mode. Avoid perpetual heavy shaders and screen shake as default; cap intensity and never obscure telegraph. Avoid animation-driven gameplay bugs by using one phase owner and a cancelable effect queue.

**Audio:** minimal room ambience; distinct tell, swing, strike, hazard, reward, and win cues; volume/mute. Audio is optional feedback, never the only warning signal. Optional decorative audio must not autoplay until the player initiates interaction on the web.

## 5. Technical architecture and implementation constraints

1. **Godot 4.4.1+ with GDScript**, Compatibility renderer, desktop-first. Existing files: project.godot, scenes/main.tscn, scripts/main.gd, attack_patterns.gd, encounter_data.gd, modifiers.gd.
2. Existing browser companion: web/index.html, web/engine.js, web/app.js, web/style.css; Node tests + browser UI automation. Browser runs with no account/backend. GitHub Pages entry at root index.html.
3. **One canonical rules specification** (this document, followed by executable tests), shared event naming, parity fixtures and serialized deterministic inputs across both. Do not let two implementations silently diverge. For later phases, evaluate using Godot's browser export to remove duplicate engines only *after* parity and browser compatibility have been proven. Do not swap implementations midway through A.
4. Separate presentation (UI, animation/audio) from combat calculations and state transitions. Pure battle layer should own grid coordinates, seed, enemy patterns, damage/status lifecycle, modifiers, terminal states.
5. Engine should produce phase events: TELL_STARTED, TELL_HIDDEN, MOVE_ACCEPTED, ATTACK_COMMITTED, DAMAGE_APPLIED, STATUS_APPLIED, ENEMY_STRIKE, ROOM_CLEARED, REWARD_CHOSEN, PLAYER_DEAD, RUN_WON, RUN_RESTARTED. Consumers observe only; callbacks must never double-advance battle state.
6. Invalidation tokens cancel old timers and animations on restart/room change/pause. Prevent input during RESOLVE, reward modal and terminal states. Every decision path must be keyboard reachable.
7. No secrets committed, no trackers, no multiplayer/network calls; safe, locally runnable project. Export configurations should be reproducible and documented.
8. Keep ownership boundaries: core gameplay, encounters, UX, effects, release QA; integrate through small PRs with tests.

## 6. Repo audit and integration gate (snapshot 2026-11-17)

**Current main:** b9a976f…; browser JS gameplay automation green, plus successful Pages deploy workflow. These results do NOT constitute manual playthrough or native release validation.

**Known blocker on main:** Godot scripts/attack_patterns.gd line 30 lacks an explicit Vector2i annotation in Burst footprint construction, producing an inference parse error on Godot 4.4.1. PR **#9** fixes it and adds native headless tests; its Godot CI is green but it has not been merged. Native 33 regression assertions are **on the PR branch**, not main. Never call main's Godot implementation release-ready until fixed and validated.

**Other open work:**
- **PR #6**: in-game movement/attack effects, reduced-motion handling, optional SIGNAL.
- **PR #10** (draft): quieter combat HUD, MEMORY TRACE, pre-game customization and Godot UI work; edits scripts/main.gd (conflicts functionally with #9).
- **PR #11**: title/settings/preferences on top of #10; **base branch is #10's branch**, not main. Must integrate in dependency order, not cherry-pick blindly.
- Existing accepted PR #5 altered accessibility and Godot UI.

**Required merge discipline:** protect main from unreviewed changes; inspect changed filenames and branch base; integrate native fixes (#9) with native setup (#10) deliberately; then chain #11; merge/port #6 effects after checking UI ownership. Re-run both platforms' test suites against the final merged **main** commit. PR branch success alone is insufficient. No new features while native parse errors remain.

**Documentation to correct:** current README includes stale language saying GitHub repo is not created. The repo now exists; update README after confirming release status.

## 7. Acceptance matrix — “practical and fluent” means objectively verified

### Essential function (no exceptions)
- Fresh Git clone → Godot import → launch **without parse errors** or missing assets.
- Starting a browser playthrough renders the main menu and exactly 36 correctly positioned tiles.
- All legal keyboard/mouse inputs yield precisely one state transition. Illegal/out-of-turn inputs yield no action.
- Attack preview footprint = committed damage/status footprint, including board-edge cases.
- Every telegraph footprint = actual enemy direct-strike footprint. Every room has at least one fair survival plan; no mandatory invisible damage.
- Rust, drip, echo, player traces have deterministic ownership, duration, tick timing and correct death/win priority.
- All 8 modifiers apply real benefit/cost, and offered choices never softlock.
- Room 1 → choice → Room 2 → choice → Room 3 → demo win works; loss → restart works; restart cancels pending timers.
- Completion screen is non-canonical; game does not imply the child can defeat abuse by combat.

### Fluency, polish, accessibility
- 6×6 board, health, threat, action and status meanings legible at 720p, 1080p and projector.
- No misleading affordance, missed action, doubled click, stuck modal, unexpected menu reset, or softlock in 10 consecutive guided playthroughs.
- Input feedback target <100ms on test hardware; animation never blocks a decision indefinitely.
- Desktop goal: stable 60 FPS on target school PC. Browser goal: stable ≥30 FPS on a modest laptop. Record actual measured results and hardware; never invent them.
- No horizontal overflow at browser width 360px; browser keyboard and touch playable; OS reduced-motion respected; controls usable without mouse.
- Tell longer-mode and retained outlines demonstrably preserve exactly the same damage coordinates.
- At least 5 first-time playtesters should independently understand the tutorial and finish an ordinary run; record confusing moments and improve them before release.
- No uncaught JS exceptions, no native script errors, no serious accessibility regressions, no browser console error during happy-path play.

### Automated and manual verification
- Node: check web/engine.js and web/app.js syntax; run tests/engine.test.js and tests/autoplay.test.js (presently 13/14 tests depending on branch, 60-seed autoplay). On new UI branch, also run UI contract, preferences and Chromium Playwright suites.
- Godot: headless editor import; strict script parse; tests/test_geometry.gd and new tests/test_turn_flow.gd from PR #9; manual native three-room playthrough including keyboard focus, reward, death, restart, resize.
- Cross-platform parity fixtures for all 12 enemy patterns, attack shape edge cases, damage/status ticks, modifier combos and seeded reward choices.
- Publish evidence: tested commit SHA, green CI links, full-run screen recording/screenshots, known limitations, Windows export launch evidence, browser URL/device evidence.

**Release blockers:** crash/parse error, incorrect tell, invisible lethal effect, impossible progress, action race, no keyboard path, broken Windows launch, unresolved branch conflicts. Cosmetics may remain simple if all gates pass.

## 8. Definition of done and deliverables

Deliver, in the actual GitHub repo, fully tracked project source, Godot scene scripts/resources, browser demo, test suites and passing CI, editable config/balance tables, onboarding + controls + accessibility instructions, updated README, content notice, tested Windows build/release asset, a public browser-play URL (if deployed), a short full playthrough clip, issue/PR audit and known limitations. No “implemented” claim without committed code; no “verified” claim without test evidence.

**Immediate next milestone:** Resolve the native compilation blocker and integrate open PRs with conflict checks, then validate all 3 rooms, motion and exports. Do NOT spend the next milestone on additional worlds.

## 9. Full product sequence after Release A

1. Expand house into branching tactical variations, add weapon augmentations and elite encounters while preserving safe learning progression.
2. Build Void Hub with memory recovery and persistent unlock choices (knowledge/option growth prioritized over stat inflation).
3. Branching encounter map with telegraphed gambles, weapon nodes, modifier upgrades and ice-cream-man shop (comforting but unsettling, never exploitative).
4. Snow Park and School (both liminal; distinct hazards and symbolic bosses); ship these three worlds before optional 4/5.
5. Unlock limited rewind (1–2 charges per fight, costs Mental Stability; not free infinite undo); show true consequences and restore exact previous battle state.
6. Layer symbolic narrative decisions and accessibility-neutral assistance path; implement hopeful and implied bleak conclusions responsibly.
7. Add save/load, migrations, platform packaging, benchmarked performance, input/device/accessibility test plan and full QA evidence.

**Change-control principle:** Proposed ideas are not “implemented,” and planned worlds are not “done” merely because they are documented. Release A is the required foundation and release gate.

---
This document is intended to be paired with **docs/MASTER_BUILD_PROMPT.md**.