# GPT interface orchestration — live Canvas Live conversations

**Project:** RE:(do)(start)(call) — Godot 4 + browser demo
**Workspace:** Canvas Live, four 2×2 chat interface panels and four enabled orchestration bot slots.

Four separate GPT chats were initialized through the Canvas Live workspace with scoped implementation requests. Their URLs were persisted as the embed card sources, and the chat cards were bookmarked to the matching bot slots.

| Role | ChatGPT interface | Owned system | Canvas bot slot |
|---|---|---|---|
| A — Godot core | https://chatgpt.com/c/6afb96e8-d8d4-83ec-9660-cb1b3e0a1b2a | State machine, movement, attacks, statuses | `bot-512c2a6a` |
| B — Encounters | https://chatgpt.com/c/6afb96f0-337c-83ec-bee5-b63da387bc66 | Pipe, hanger, phone and danger tells | `bot-75798fbf` |
| C — UX/narrative | https://chatgpt.com/c/6afb96f6-c634-83ec-8f4b-b6a807a25442 | Glitch interface, symbolic writing, modifiers | `bot-bd314c4a` |
| D — QA/release | https://chatgpt.com/c/6afb96fc-d5dc-83ec-890d-f4544e140d7e | Tests, CI, review, release checks | `bot-a86fd5a2` |

## Actual execution status

- GPT interface cards **exist and have individually received their role-specific development prompts**. Responses were initiated inside their own conversations.
- Canvas bot slots and bookmarks exist. Canvas Live's bot controls **do not automatically run other ChatGPT conversations** merely because slots exist.
- All actual local source integrations in this package were carried out in the coordinator session. Web game engine tests were run locally; Godot runtime build wasn't possible in this environment.
- Chat proposals may contain alternative mechanics. The authoritative shipped mechanics are in `docs/GAMEPLAY_IMPLEMENTATION.md` and the source files, **not the unfinished or unreviewed suggestions in separate chats**.

## Shared development contract

Every incoming GPT patch must list: target file(s), exact functions changed, reason for change, tests to run, and known dependencies. Do not allow simultaneous agents to rewrite the same file. Freeze the API before asking agents to continue. Use one owner for each source directory. Run `node tests/engine.test.js` and `node tests/autoplay.test.js` after JS changes. Test the Godot project in the installed engine before calling it export-ready.

## Suggested continuation prompt for any chat

> Your source of truth is the project in `RE-do-start-call`. The complete 3-room browser demo and Godot vertical-slice source exist, with an 8-modifier system and 6×6 board. Review the current source file I provide. Do not redesign the full combat contract or duplicate a separate engine. Produce a minimal, testable patch only in your assigned ownership area and list concrete verification instructions.