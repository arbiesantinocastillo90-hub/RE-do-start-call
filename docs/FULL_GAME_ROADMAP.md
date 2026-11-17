# Full game roadmap — beyond the one-week house demo

## Narrative spine

**RE:(do)(start)(call)** is a story about a boy who leaves home impulsively, cries, and wakes inside worlds assembled from memory fragments. He is caught in loops because fear has taught him to expect repeated danger. The player’s skill at remembering attack patterns expresses the boy’s learned hypervigilance. The story stays symbolic rather than depicting explicit abuse. Players should never be asked to defeat a literal abuser as a boss.

**Final theme:** Self-reliance and hypervigilance can help someone survive, but support from safe people is necessary for genuine recovery. The title’s `(call)` is a subtle clue that reaching out matters.

## Regions

| Region | Visual language | Fear / learned habit | Boss idea | Production scope |
|---|---|---|---|---|
| Void hub | Broken door frames, lost objects, a small light | Dissociation / uncertainty | None; a place to reflect | Full game |
| Infinite house | Wrong-size furniture, silent rooms, repeating hallways | Expecting danger where home should mean safety | An unanswered telephone / mechanical ring | Demo (3 rooms); expanded in full game |
| Liminal school | Empty desks, smeared chalk, corridors with no exits | Judgment / pressure / shame | A giant eraser that rubs safe tiles away | Full game |
| Snow park | Stopped swings, fog, snow that looks soft but stings | Numbness that can be shelter or isolation | A frozen carousel that restricts movement | Full game |
| Optional world slots 4–5 | To be decided with narrative review | New memory layers | Symbolic antagonists, not people | Not committed |

**World count cap:** Five worlds (not counting the void hub). Ship three strong worlds before adding optional ones.

## Combat roadmap

- Keep the 6×6 base board and a strict read → move → attack → strike loop. Vary the *meaning* of enemy behavior, not the input vocabulary.
- Add weapon families (improved Jab/Sweep/Burst variants) with distinct lingering statuses. Avoid two identical attacks with only bigger numbers.
- Build elite enemies from *combinations* of patterns the player already understands; avoid unexplained unavoidable damage.
- Preserve the memory tell’s accessibility controls, including adjustable timing and optional retention of outlines.
- Give each world its own tile modifier: school erasure, snow freeze, house rust/echo.
- Keep a softlock-escape route: hold, safe center, one-time block, or a guarantee of at least one non-damaging immediate placement in introductory rooms.

## Roguelike metagame

- Between fights, offer **branching path nodes**: normal combat, elite, weapon power, modifier upgrade, hinted chest/trap gamble, and ice-cream-man shop.
- Each modifier is framed as a coping habit with a boon and a cost. Avoid portraying harmful responses as moral failings or stronger responses as automatically healthier.
- The void hub stores recovered memories and selected permanent skills. Call the general stat **Mental Ability**, but represent growth primarily through new options and knowledge rather than raw damage.
- Rewind is unlocked later, **one or two charges per encounter**. Rewinding one decision costs Mental Stability; there is no costless infinite undo.
- Death returns the boy to the beginning of the dimension; some recovered memories persist, but demo deaths reset fully.

## Narrative choice and ending design

**Hopeful route:** He accepts an opportunity to contact a trustworthy adult or authorities, reaches a place of safety such as a police station, and later finds a stable, supportive foster home. Show recovery as an ongoing process, not an instant reward after boss defeat. Avoid guaranteeing outcomes where real systems are complex.

**Bleak route:** The world grows quiet and the implication is that he never reaches help. Do not stage or sensationalize a child’s death; leave this outcome indirect and give the good ending sufficient agency and accessibility.

**Ending trigger:** Repeated choices to accept safe assistance, return a symbolic call, or trust a helper matter more than perfect combat. An accessibility mode should not lock a player out of the hopeful route. Do not make one random shop option decide a life-or-death narrative resolution.

## Production sequence

1. **Vertical slice** (delivered): full three-room house flow, basic modifiers, responsive browser implementation, Godot code, unit tests.
2. **Godot stabilization**: run in installed engine, repair import/layout issues, add project export presets, test on school hardware.
3. **Combat breadth**: equipment, advanced modifiers, elites, 3-room variants, maintain deterministic tells.
4. **Roguelike structure**: branching paths, shop, chest/trap hints, persistent memory progression, void hub.
5. **Additional worlds**: school and snow park, each with legible bosses and consistent themes.
6. **Narrative endings**: assistance choices, title clue, safe portrayals and content warnings, writing review.
7. **Polish and release**: soundscape, glitch effects, controller support, saves, performance, accessibility and balance.