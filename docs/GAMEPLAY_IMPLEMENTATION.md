# Vertical slice implementation — RE:(do)(start)(call)

## Delivered

This folder contains **two self-contained playable implementations** of the same three-room demo:

- **Godot 4** — `project.godot` → `scenes/main.tscn`; typed GDScript logic in `scripts/`.
- **Browser** — `web/index.html`; vanilla JavaScript deterministic combat engine in `web/engine.js` plus UI in `web/app.js`. No web dependencies. Open the HTML locally after extraction.

The browser engine has been verified by `node tests/engine.test.js` (13 tests passed). The Godot project was authored without access to the Godot editor in this environment; import and runtime validation remain necessary before calling it a tested build.

## Mechanic contract (implemented)

1. At **the start of each round**, the enemy attack's exact tiles flash for a tunable duration.
2. The warning hides. The player can move **one cardinal tile or hold position**.
3. The player chooses Jab, Sweep, or Burst, then chooses a legal target tile.
4. The player attacks, dealing instant damage and leaving a trace for two rounds.
5. Existing ground hazards tick, the enemy's **same prerecorded warned tile set** strikes, and new enemy hazards are placed (active on later round ticks).
6. Survive to the next tell, clear a room for a boon-with-cost choice, or restart the loop after death.
7. Clearing room 3 displays a demo completion screen; it **does not present the canonical good ending**.

### Geometry

| Move / attack | Area | Damage to enemy | Residue |
|---|---|---|---|
| Move | One horizontal/vertical tile | 0 | None |
| Jab | Single orthogonally adjacent target | 3 | Splinter, 1 damage per tick |
| Sweep | Ray of up to 3 straight tiles | 2 | Spark, 1 damage per tick |
| Burst | Plus centered within 2 Manhattan distance | 2 | Burn, 1 damage per tick |

Residual marks deal one damage to enemies occupying a marked cell at subsequent resolution ticks; own residual damage does **not** affect the player unless **Fight Response** is active. Enemy rust and echo marks damage the player on later ticks; Hanger's drips prevent moving during the next available movement phase, requiring Hold.

### Encounters

| Room | Enemy | HP | Attack shape cycle | Status | Tell (before options) |
|---|---|---:|---|---|---:|
| 1 | Rusted Pipe | 7 | Alternating rows and columns | Rust | 0.95 s |
| 2 | Melted Hanger | 10 | Alternating diagonals | Slow drip | 0.70 s |
| 3 | Unanswered Call | 15 | Cross, diagonals, near ring, far ring | Echo | 0.60 s |

The player must **see the tell before making a move**, otherwise a brief flash after committing to movement cannot be meaningfully avoided. This is the central fairness repair relative to the initial concept. The player still acts before the enemy's strike resolves.

### Coping modifiers

Eight included: Hypervigilance, Numb, Comfort Object, Fight Response, Freeze, Bracing, Tunnel Vision, Flinch. After clearing rooms 1 and 2 the player receives three randomly selected distinct choices. Modifiers persist to the end of that run, with no permanent unlock system in the demo.

### Accessibility

The browser build supports longer warning flashes and optional retained danger outlines. Godot tell times are tunable in `scripts/encounter_data.gd`, but the in-game accessibility settings panel is not implemented there yet.

### Input

- Godot: arrow keys or click neighbor; `Space` hold; `1/2/3` select attack; click target; `E` Comfort, `F` Freeze; `R` restart.
- Browser: same mapping, plus attack/hold/heal/freeze/restart buttons and accessible warnings.

## Known limits

- Full game additions (five worlds, void hub, snow park, school, loop progression, rewind charges, route shop and canonical endings) remain future scope under `docs/DEMO_SPEC.md`.
- Enemy sprites use **symbols, not art assets**; styling is intentionally flat and abstract.
- The Godot runtime was not installed here: GDScript project requires **Godot 4 verification**, especially desktop import, scroll layouts, keyboard interactions and export presets.
- Browser layout was code-reviewed and JS logic tested; Chromium UI screenshot was blocked by the current environment's enforced URL blocklist, so visual browser testing remains a deployment QA step.

## Verification commands

```bash
node --check web/engine.js
node --check web/app.js
node tests/engine.test.js
# If Godot 4 is installed:
godot --headless --path . --editor --quit
godot --headless --path . --script res://tests/test_geometry.gd
```