# Copy-ready role assignments

## Agent A — Core & Combat
Implement the 6×6 tile model and deterministic turn-state machine in Godot 4. Define signals for move accepted, attack committed, enemy tell requested, enemy resolved, tile status changed, room completed, player died. Implement three attack shapes and status effect API. Work within `scripts/core/`, `scripts/main.gd`, `scripts/attack_patterns.gd`. Before integration, document API names and run at least five manual boundary tests. Do not edit encounter/story files.

## Agent B — Enemies & Encounters
Consume Agent A's combat contract. Define Rusted Pipe (straight/rust DoT), Melted Hanger (diagonal/slow drips), and an abstract phone/ring miniboss candidate (memory test). Each enemy uses a deterministic reusable sequence of hazard tiles and the **same exact tiles** for tell and strike. Deliver data-driven encounter definitions in `data/encounters/` and scripts in `scripts/encounters/`. Test against 6×6 bounds.

## Agent C — UX & Narrative
Create asset-light liminal-house presentation using Godot shapes and glitch effects. Ensure selected attack, player location, safe tile, persistent status and enemy tell are visually distinguishable. Build modifier selection (3 offered choices, each with cost), room transitions, and win screen. Work only in UI scene/script/text areas, using Agent A's signals. Present trauma symbolically and never as a literal abuser boss.

## Agent D — QA & Integration
Own demo acceptance tests, GitHub conventions, daily integration, and export/slide handoff. Check deterministic tell equality, terminal game states, no action races, status overlaps, modifier tradeoffs, accessibility, and fast-presentation usability. Review and merge narrowly scoped PRs. Do not silently rewrite another agent's implementation; open actionable issue with reproduction steps.