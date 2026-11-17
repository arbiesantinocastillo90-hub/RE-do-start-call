# Agent C — Quiet HUD and pre-game setup: acceptance checks

## Scope / source of truth

This change is a presentation-layer refinement of the existing 6×6 three-room browser and Godot demos. No attack shape, deterministic warning-cell set, lingering-effect damage, or coping reward probabilities are redesigned. Browser UI: `web/index.html`, `web/app.js`, `web/style.css`; Godot UI: `scripts/main.gd`. Browser timer cancellation: `Game.dispose()`.

### Always-visible game HUD (right rail)

Only **phase/status**, **player and enemy HP**, **cardinal move/hold**, **attack selection**, **unlocked combat actions** (Comfort/Freeze), and **equipped modifier names** appear in the live rail. Room number/name/turn and a one-line symbolic room atmosphere appear near the board, not in the rail.

**Forbidden in live rail:** pattern names (e.g. `STATIC: PIPE / HORIZONTAL`), per-room tactical hints, `events` history/recent logs, setting toggles, appearance controls, visual-effect controls, and verbose keyboard instructions.

### Optional memory trace

- On cold start and on every new run, `#clue-panel` is DOM-`hidden`, and `#clue-trigger` has `aria-expanded=false`. Exact pattern name, next-step instructions, room hints, and the latest log remain inside this panel only.
- Pointer hover on the small **MEMORY TRACE** trigger reveals the panel. Leaving the panel's hover area conceals it unless pinned or focused.
- Keyboard Tab to the trigger reveals the panel; moving focus away conceals it unless pinned. Enter/Space pins it; pressing again closes it. Escape closes and prevents immediate re-open until focus/hover re-enters.
- Touch tap toggles pinned visibility. The trigger's `aria-controls` and `aria-expanded` must match the panel state. Toggling the panel must not advance a turn.
- The optional panel is deliberately **not** a live region. Screen reader announcements are limited to non-spoiler room/turn/phase/HP summary via `#screenreader-status`.
- Godot: the **MEMORY TRACE** button reveals upon mouse hover or keyboard focus, and pins/unpins on activation. It contains room subtitle guidance, phase instructions, the previous event log, and keyboard reference.

### Pre-game setup

- Before a new browser run, the modal opens with native focus on the currently selected shape.
- Select Circle / Diamond / Star, and Moss / Lamp / Dusk color. Confirm the player tile changes **glyph/color only**, not coordinates, HP, damage, or attack pattern.
- Select **Longer warnings**, **Keep warning outlines**, **Subtle scanlines**, and **Warning pulse** before starting; no such control appears in the live rail. Effects are purely decorative.
- Press **OPEN YOUR EYES** to begin; the background must be inert while modal is open.
- Press the header **SETUP / NEW LOOP** or R in play to return to setup. The previous pending warning timer must be invalidated; no stale turn may run behind the menu.
- Reward modal has exactly three distinct boon/cost buttons, all reachable by Tab/Shift+Tab; the rest of the game must be inert during the choice. The demo-win/death action returns to setup.

### Accessibility / keyboard regression matrix

| Context | Action | Expected |
| --- | --- | --- |
| Setup modal | Tab to all radio buttons, select, checkboxes, start; Shift+Tab wraps backward | No focus leaves dialog; no attack/move |
| Setup modal | Press arrows while focused on native radio/select | Native control changes; gameplay is inert |
| Live board, MOVE | Arrow keys or click neighboring tile; Space/hold | Cardinal movement/hold only, no diagonal moves |
| Live board, ATTACK | 1/2/3 selects shape; arrows focus target; Enter/Space attacks | Visible focus and correct geometry; invalid attack stays ATTACK |
| Live board, TELL | Click/press movement or attack | No movement before tell resolves |
| Memory trace | Hover, focus, tap, Escape | Hidden by default; reveal/pin/dismiss with correct `aria-expanded` |
| Modal reward | R/arrow keys/number keys while choice open | No gameplay shortcut, no setup reset; only reward selection |
| Reduced motion | OS prefers-reduced-motion active | No pulse animation or decorative scanlines |
| Accessibility | Long warnings selected | At least 2.5 s; ~3.0 s baseline with modifier time deltas |
| Accessibility | Persist outlines selected | Exact threatened-cell set remains outlined; strike resolution unchanged |
| Resize | 375×667, 768×1024, 1024×768, 1280×720 | Board stays 6×6, no hidden focus target / horizontal overflow, setup controls reachable |
| Zoom / projector | Browser 200% zoom / classroom projector | Warnings, move targets, HP, 3 attack shapes visually distinguishable |

### Automated commands

```bash
node --check web/engine.js
node --check web/app.js
node --check tests/ui_contract.test.js
node tests/engine.test.js
node tests/autoplay.test.js
node tests/ui_contract.test.js
```

The new `ui_contract.test.js` validates static HUD structure, hidden optional content, setup controls, accessibility hooks, and cancellation of a stale tell. It does **not** replace manual keyboard/screen-reader/projector tests.

### Native Godot gate (not validated by JS CI)

```bash
godot --headless --path . --editor --quit
godot --headless --path . --script res://tests/test_geometry.gd
godot --path .
```

In the editor, verify the pre-game setup focus cycle, hover/focus MEMORY TRACE button, gamepad/keyboard focus, room-clear reward buttons, and the effects toggle on an actual Godot runtime. Confirm custom avatar is presentation-only and the right rail never displays logs/tips. **Do not declare Godot runtime validated without performing this step.**
