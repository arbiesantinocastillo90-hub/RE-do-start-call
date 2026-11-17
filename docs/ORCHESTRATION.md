# Agent orchestration plan — one-week demo

**Coordinator:** Product owner / integrator. Establish authoritative mechanics in `docs/DEMO_SPEC.md`, route tasks to owners, review PRs, and integrate daily. Canvas Live bots are **slots for separate active conversations**, not autonomous workers merely because slots exist.

| Agent | Mission | Owns | Hard boundaries | Deliverables |
|---|---|---|---|---|
| **A — Core & Combat** | Godot board / state machine | `scripts/main.gd`, `scripts/attack_patterns.gd`, `scripts/core/` | Avoid enemy narrative/art | Move/attack flow, tile status API, win/lose events, tests |
| **B — Enemies & Encounters** | Three rooms and deterministic threats | `scripts/encounters/`, `data/encounters/` | Use A's API; do not rewrite turn flow | Pipe, Hanger, 3rd-room miniboss, telegraphs |
| **C — UX & Narrative** | Symbolic house and readable feedback | `scenes/ui/`, `scripts/ui/`, `data/text/` | No changes to damage maths | Attack selector, modifier picks, transitions, glitch UI, win screen |
| **D — QA & Integration** | Merge safety and demo delivery | `tests/`, `docs/QA_CHECKLIST.md`, `.github/` | Reuse source API; do not fork gameplay logic | Testing, triage, PR integration, final export |

## Dependency order
1. A defines coordinate convention, combat events, and status-data contract (day 1).
2. B builds enemy patterns as data against that contract (days 2–4).
3. C binds UI to combat events and room progression (days 2–5).
4. D tests on each merge; merges only reviewed compatible PRs (all week).

## Seven-day gates
| Day | Expected result |
|---|---|
| **1** | Repo, Godot import, authoritative spec, interactive 6×6 board and state model |
| **2** | All three attack shapes, hit/damage logic, lasting tile effects |
| **3** | Pipe and Hanger enemy patterns; flash/hide/strike; timings configurable |
| **4** | Three sequential rooms, miniboss, death/restart/win states |
| **5** | 6–9 modifier definitions; choice of 3 after rooms 1 & 2; UI/audio readability |
| **6** | Balance, avoidance of softlocks, QA, accessibility/projector check |
| **7** | Godot export, 5-minute playable demo, backup and slide handoff |

## Daily coordination template
- **Done:** merged branch/issue and proof (screenshot or tested scenario)
- **Next:** planned small deliverable
- **Blocked:** owner and exact API/file dependency
- **Risk:** one-line issue and mitigation

## Merge gate
No merge unless main scene imports, 6×6 rendering works, action sequence is legal, states do not softlock, and UI telegraph accurately reflects resolved hit tiles.

## Failure modes to catch early
- Player is able to attack/move again while enemy tell is resolving.
- Effects appear to be safe but apply damage (or vice versa).
- Enemy resolves a pattern different from the shown/hidden tell.
- Player's self-hazards permanently seal every tile without an out.
- Repeated modifier rewards show no tradeoff or fail to apply.
- Boss is visually framed as a literal person rather than fear/symbol.