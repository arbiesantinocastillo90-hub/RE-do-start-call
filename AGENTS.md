# Instructions for coding agents

## Mission
Extend and verify the already implemented **RE:(do)(start)(call)** Godot 4 and browser demos described in `docs/DEMO_SPEC.md` and `docs/ORCHESTRATION.md`.

## Rules
- Protect the demo's **6×6** grid and **enemy warning flash → hide → player move → player attack → same enemy attack resolves** loop.
- Build the **house-only / three-room** vertical slice. Rewind, shop, progression, map and endings are **documentation only** this week.
- Prefer deterministic, data-driven systems; no hidden randomness in learning enemy patterns.
- Do not write to another agent's owned files without a coordinating issue or explicit handoff.
- Store numeric parameters (telegraph duration, attack damage, status duration) in one place; do not bury constants in visuals.
- Make the telegraph flash adjustable and sufficiently readable for projector/older hardware testing.
- Do not use graphic trauma scenes, literal abuser bosses, or glorify the bad ending.
- Keep all gameplay functional without external assets. Use flat color blocks and text labels until approved art arrives.
- Each PR must state: behavior changed, manual validation, risks, and next dependency.

## Branches
`feat/core-*`, `feat/encounters-*`, `feat/ux-*`, `test/*`, `docs/*` -> pull request -> `main`.

## Existing deliverables
The three-room Godot GDScript source and independent browser companion are in this repository. Preserve mechanic parity between `web/engine.js` and `scripts/`. Browser deterministic tests are already passing. The Godot editor/import has **not** been verified and remains a required QA milestone.

## Definition of done
A demo can be played from Room 1 to the Room 3 win screen without a crash, blocked state, invisible threat, or inescapable tutorial step.