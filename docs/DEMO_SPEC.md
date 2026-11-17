# Demo mechanical contract (v0.1)

## Premise & tone
Six-by-six turn-based roguelike on a liminal house board. The boy's perception creates frozen decision moments through hypervigilance, **not literal time-stop**. Threat information flashes briefly, disappears, then resolves; practice helps the player remember.

## State machine
`ROOM_START → ENEMY_TELL → TELL_HIDDEN → PLAYER_MOVE → PLAYER_ATTACK → STATUS_TICK → ENEMY_RESOLVE → (ENEMY_TELL | ROOM_CLEAR | PLAYER_DEAD)`.

- Player **moves first, then attacks**. If movement is impossible, allow an explicit `Hold Position` to avoid softlock.
- The 6×6 grid uses `Vector2i(x,y)`, where x and y are integers 0…5, with (0,0) top-left.
- Default movement proposal: one orthogonally adjacent tile; no jumping over enemies. Revisit only by explicit design decision.
- Attacks are shapes, not purely single-target: **Jab = one adjacent square**, **Sweep = up to three tiles in a cardinal ray**, **Burst = plus around a chosen nearby center** (initial proposal; balance after testing).
- The playable web and Godot implementation includes enemy phases, statuses, reward choices and three-room flow. Runtime verification of the Godot build is pending.

## Status & telemetry contract
Each marked tile records `{kind, source, duration_turns, damage}`. Statuses persist for a specified number of **turn-end ticks**, can overlap with an explicit merge rule, and must be visible even when they originated from the player. A tile can inflict `burn`, `rust/DoT`, `slow`, or direct impact according to attack data. Decide whether status ticks occur on occupancy or every turn and freeze that rule before B/C integration. Avoid a softlock caused by occupied 6×6 boards.

## Memory tells
Enemy attack patterns are deterministic and repeatable. On encounter with an unfamiliar attack: flash **the exact danger cells** for a tunable duration (implemented timings are 0.95s tutorial, 0.70s room 2, 0.60s miniboss), hide them briefly, then strike. Make durations accessible in options; test on aging hardware/projectors. Advanced no-tell variants belong **after** the demo unless clearly justified.

## Demo encounters
1. **Rusted Pipe** — tutorial; straight-line strike leaving rust DoT on hit tiles.
2. **Melted Hanger** — diagonal threat; slowing drips on hit tiles.
3. **Halfway miniboss** — distorted ringing telephone is a *candidate*, not final; combines learned pattern memories. End with a win screen, no full-story ending.

## Coping modifiers
Offer **three distinct choices** after Room 1 and Room 2, drawn from 6–9 defined modifiers. Every modifier grants a real benefit and imposes a cost. Candidate designs:
- Hypervigilance: longer flash / greater damage taken.
- Numb: ignore tile status damage / cannot heal.
- Comfort Object: healing while safe / spend attack action.
- Fight Response: bonus attack damage / player-created harmful tiles.
- Freeze: skip incoming strike once / lose next movement.
- Bracing: reduce impact damage / smaller movement reach.
- Tunnel Vision: increased single-direction damage / reduced lateral awareness.
- Flinch: emergency sidestep / attack output penalty.
- Cold Comfort: recovery in safe space / movement or damage tradeoff.

Numbers and combinations remain tuning variables, not rigid promises.

## Full game (future — not demo)
Hub void; liminal school; snow park; infinite house; up to five worlds, each with bosses. Death loops, reclaimed memories as permanent progress, limited rewind costing mental stability, branching route and ice-cream-man shop. Good ending signaled by `(call)` and accepting help. Bad ending implied rather than shown. No literal abuser-boss portrayal.