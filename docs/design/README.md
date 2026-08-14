# Design

What the CLI is, and how it is specified.

| Document | Status |
| --- | --- |
| [`product-brief.md`](product-brief.md) | **Written 2026-08-14.** What it is · scaffold model · module boundary · output contract · CLI surface · upgrade story · non-goals · decisions |
| [`module-catalog.md`](module-catalog.md) | **Written 2026-08-14.** The 15-module set: rung · deps · params · what each ships · install profiles · **the corpus expectation matrix** (Phase 6's acceptance criterion) |
| `cli-surface.md` | **Never written.** Planned for Phase 5 as detailed command behaviour beyond the brief's summary; Phase 5 closed without it. The nine commands are specified in [`product-brief.md`](product-brief.md) §6 and their current behaviour is `rungs --help`. Recorded rather than deleted — a planned document that was not needed is a finding about the plan |
| [`web-design-system-prompt.md`](web-design-system-prompt.md) | **Written 2026-08-14.** Phase 7 working artifact, authoritative for nothing: the brief for a design system covering the landing page, the wiki, and contribute. The system it produces is what becomes authoritative |

Decisions live in [`../decisions/`](../decisions/README.md). The one that settles the output
contract is [ADR-0001](../decisions/ADR-0001-multi-harness-rendering.md).
