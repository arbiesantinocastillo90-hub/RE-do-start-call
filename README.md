# RE:(do)(start)(call)

> **A 6×6 turn-based psychological roguelike about memory, hypervigilance, and learning to reach out.**

**Current delivery:** three-room **house demo, implemented in Godot 4 and as a playable browser companion**, with deterministic game-engine tests. The official repository is **[arbiesantinocastillo90-hub/RE-do-start-call](https://github.com/arbiesantinocastillo90-hub/RE-do-start-call)**. The game title retains its distinctive punctuation; GitHub uses a compatible repository slug.

## Play it now

### Instant browser demo — no Godot required

Open **`web/index.html`** in a modern browser after extracting this archive. No installation, network access, or third-party libraries are required.

Select **OPEN YOUR EYES**. Memorize the briefly flashed attack squares. When the tell disappears, move once and then attack. After clearing a room choose one of three offered coping modifiers. Survive all three rooms to win the demo.

### Godot 4 project

1. Open Godot 4.x → Import → `project.godot`.
2. Run the project (F5) or `scenes/main.tscn` (F6).
3. Arrow keys / clicking adjacent squares to move; Space to hold; 1/2/3 select Jab/Sweep/Burst; click an attack target; E/F trigger ability when unlocked; R restarts.
4. **Godot editor import/runtime testing is still required.** The Godot binary was not available here, and the authoring environment could not run it.

## Pitch

A boy runs away from home in a burst of emotion. When he opens his eyes, a fractured dimension has rebuilt places from his memory. The turn-by-turn world is not literal time stop; it dramatizes hypervigilance: learned attention to danger. Enemies have fixed attack sequences; warning squares flash briefly before the child's movement decision, and the player must recall them. Attacks poison future tile choices, and powerful upgrades always involve a tradeoff. `(call)` foreshadows that the full game's hopeful conclusion is about accepting help — not destroying another person.

**Content note:** The story references childhood distress, abuse, and isolation. Its environments portray distress through symbolism, not graphic scenes. No abuser appears as a literal boss.

## Delivered demo mechanics

| System | Implementation |
|---|---|
| Board and turns | 6×6, cardinal move or hold, then attack, then enemy strike |
| Attack shapes | Jab (single), Sweep (three-tile line), Burst (plus) |
| Memory tells | Fixed, learnable attacks: show tiles → hide → player acts → same tiles strike |
| Persistent tile effects | Player splinter/spark/burn traces and enemy rust/drip/echo |
| Room 1 | Rusted Pipe, horizontal/vertical attacks |
| Room 2 | Melted Hanger, diagonal attacks and slowdown |
| Room 3 | Unanswered Call miniboss, crosses/diagonals/rings |
| Modifier rewards | Choose one of 3 random options after rooms 1 and 2, from 8 mechanisms |
| Life cycle | Room transitions, HP, death/restart, demonstration win screen |
| Browser accessibility | Longer warnings, optionally retaining threat outlines |

The **browser build** includes a responsive UI, hover attack previews, accessible tile labels, a warning phase display, combat log, modifier-choice overlays, and keyboard controls. The **Godot build** includes a simple generated flat-shape UI and scrollable rewards panel.

## Run the tests

Requires Node.js (for tests only):

```bash
node --check web/engine.js
node --check web/app.js
node tests/engine.test.js
node tests/autoplay.test.js
```

The browser game engine has **13 unit tests** and a **60-seed complete-run autoplay plus exhaustive baseline attack safety** test. Those tests were executed successfully at creation. Browser UI screenshot validation and Godot runtime validation were blocked by the environment, so neither is claimed as completed.

For Godot, after installing version 4:

```bash
godot --headless --path . --editor --quit
godot --headless --path . --script res://tests/test_geometry.gd
```

## Files

```text
RE-do-start-call/
├── project.godot
├── scenes/main.tscn
├── scripts/
│   ├── main.gd                 Godot UI and battle loop
│   ├── attack_patterns.gd      Attack geometry
│   ├── encounter_data.gd       Three rooms / deterministic threats
│   └── modifiers.gd            Eight boon-with-cost options
├── web/
│   ├── index.html              Play locally
│   ├── style.css               Flat/glitch visual system
│   ├── engine.js               Pure, testable game state machine
│   └── app.js                  Browser UI
├── tests/
│   ├── engine.test.js          13 JS unit tests
│   ├── autoplay.test.js        60 full-run reachability tests
│   └── test_geometry.gd        Godot geometry assertions
├── docs/
│   ├── GAMEPLAY_IMPLEMENTATION.md
│   ├── DEMO_SPEC.md
│   ├── GPT_INTERFACES.md
│   ├── FULL_GAME_ROADMAP.md
│   ├── ORCHESTRATION.md
│   └── QA_CHECKLIST.md
└── .github/workflows/tests.yml
```

## What is not in the current demo

The full game’s void hub, branching room map, school, snow park, up-to-five worlds, ice-cream shop, rewind, permanent memory skills and canonical endings are **designed but not playable** in this demo. See [full game roadmap](docs/FULL_GAME_ROADMAP.md). The house demo ends on a non-canonical completion message.

## GPT development interfaces

Four independent GPT chat interfaces were created inside the user-shared Canvas Live workspace and given implementation assignments. They are separate GPT conversations, **not guaranteed autonomous filesystem/GitHub agents**. The source directory here is the tested integration artifact; a chat response isn't automatically merged code. See [GPT_INTERFACES.md](docs/GPT_INTERFACES.md).

## GitHub

The remote repo name is **`RE-do-start-call`**. The GitHub connector on this account did not expose repository creation, and the browser requested GitHub sign-in, so no remote repository can be honestly claimed yet. You can upload the extracted contents to a new repo; the GitHub Actions workflow will verify the JS game engine after upload.