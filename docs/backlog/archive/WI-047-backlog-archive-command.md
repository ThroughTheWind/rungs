---
id: WI-047
title: Implement `rungs backlog archive`
type: feature
status: done
branch: feature/WI-047-backlog-archive
created: 2026-08-16
updated: 2026-08-16
related: [WI-044, F-015]
epic:
children: []
---

## Proposal (rationale)

Promoted from [F-015](../FINDINGS.md), 2026-08-16.

Three files shipped into **every consumer repo** name `rungs backlog archive`, and the command did
not exist — `rungs backlog` answered *"unknown command"*:

| File | Says |
| --- | --- |
| `modules/backlog/files/docs/{{root}}/README.md` §8 | *"Move finished items to `archive/` with `rungs backlog archive` — it recomputes every link repo-wide"* |
| `modules/backlog/files/docs/{{root}}/items/README.md` | *"…with `rungs backlog archive`, which recomputes every link repo-wide"* |
| `modules/backlog/files/docs/{{root}}/archive/README.md` | *"Move them with `rungs backlog archive`, **never by hand**"* |

So the instruction was unfollowable in every repo rungs has ever scaffolded, and the reason two of
those files give — *never by hand* — is exactly why it could not be worked around. This repo had 39
`done` items in `items/` and an `archive/` holding only its README.

**Implemented rather than documented away.** The alternative was to rewrite §8 to describe a manual
move, which would delete a capability the product should have from every consumer repo at once, to
make a sentence true.

## Decision

`accepted` — 2026-08-16. Directed by the user ("fix f015"). The choice between implementing and
rewriting the docs was not left open: the promise ships to consumers, so removing it is a product
change and implementing it is a bug fix.

## Plan

### Requirements

- Move items whose status is `done` or `rejected` from `items/` to `archive/`.
- **Repoint every link that cites a moved item**, in any spelling, anywhere in the repo.
- Links inside a moved item are recomputed too — the file moved, so its own relative paths changed.
- Never touch a link whose target did not move.
- Never touch module templates: their links belong to the consumer repo, not this one.
- `--dry-run` reports the moves and the link count and writes nothing.
- `rungs check` passes afterwards, including `backlog-ids` — archived ids stay spent and resolvable.

### Impacts

- New [`src/backlog.ts`](../../../src/backlog.ts); `cmdBacklogArchive` and a `backlog` case in
  [`src/cli.ts`](../../../src/cli.ts). Command surface 9 → 10.
- README command table; `--help` gains the row automatically from `COMMANDS`.
- This repo: 39 items moved, 135 links rewritten across 37 files.
- **Risk:** a repo-wide link rewrite that goes wrong is silent. Mitigated by trialling on a clone
  before touching the real repo, which is what caught both implementation bugs.

### Approach

**Resolve, do not pattern-match.** The same target is written `items/WI-001-x.md`,
`../items/WI-001-x.md` and `WI-001-x.md` depending on who cites it, so each link is resolved from
the citing file's own directory to an absolute path and looked up in the move map. A regex over any
one spelling silently misses the others.

**Rewrite before moving.** Every path is computed from the plan rather than the filesystem, so the
order is free — and this order means a crash halfway leaves the files where the links still say
they are.

### Acceptance criteria / tests

1. All three link spellings are repointed; an unmoved target is left alone; a module template is
   untouched.
2. An epic with unfinished children is held, and the hold names which child.
3. `rungs check` passes after archiving, `backlog-ids` included.
4. The site builds with the same number of broken links as before (zero).
5. `--dry-run` writes nothing.

### Out of scope

- **Un-archiving.** `README` §8 says never edit an archived item; reversing a move is a git
  operation.
- **Archiving by id.** No-argument, all-eligible is what the docs describe. A selective form can be
  added when someone wants it.

## Execution

Branch `feature/WI-047-backlog-archive`, cut from `main` at `6b4dd47`.

### Two bugs, both caught by trialling on a clone rather than the repo

1. **The destination path was doubled** — `archive/docs/backlog/items/WI-001-….md`. `walk()` yields
   `/`-separated paths; splitting on the platform `sep` on Windows never splits, so the "basename"
   was the whole path.
2. **The first version wanted to rewrite 334 links across 58 files**, including `AGENTS.md`,
   `README.md` and `modules/*/files/**` templates. It counted a link as changed whenever its written
   form differed from a freshly computed relative path — which is true of many *equivalent spellings
   of unmoved targets*. Applied, that would have been a repo-wide link reflow disguised as an
   archive, and it would have baked this repo's paths into the templates every consumer repo
   installs.

   Now only links whose target moved are touched, plus — for a file that is itself moving — links
   that would otherwise break from the new location. Module `files/` and `fragments/` are excluded
   outright, matching `link_integrity.exclude`, and `{{token}}` links are skipped. **135 links across
   37 files**, all of them backlog citations.

A third, cosmetic: the rewrite forced a `./` prefix, turning one-word diffs into whole-line ones
across 37 files. Dropped — `./` is never required for a relative markdown link.

## Review

Verified 2026-08-16. **Trialled on two throwaway clones before the real repo**, which is the only
reason the two bugs above are in Execution rather than in the history.

**1 · Every spelling repointed, unmoved targets and templates untouched.** Unit test over one
fixture repo covering board-relative (`items/X.md` → `archive/X.md`), from another directory
(`backlog/items/X.md` → `backlog/archive/X.md`), sibling-to-parent (`X.md` → `../archive/X.md`), an
unmoved target left as written, a file citing nothing moved left byte-identical, and a module
template with `{{id_prefix}}` untouched. **Met.**

**2 · An epic with unfinished children is held.** Unit test: a `done` epic whose children are
`WI-011` (done) and `WI-012` (planned) stays in `items/`, the child moves, and the hold reason names
`WI-012`. The real repo exercised none of this — no epic here is `done` — so it is asserted rather
than observed. **Met, by test only.**

**3 · Gates pass after archiving.** `rungs check` → **21 pass · 0 fail · 0 unimplemented · 0 error**,
`backlog-ids` examining 48 and passing, so every citation of an archived id still resolves.
Confirmed first in the clone, then on this repo. **Met.**

**4 · Site unchanged.** `npm run build` → 111 routes; `npm run check` → **1,721 internal links, 0
broken** — the same counts as before the move, which is the point: 39 files changed location and
nothing pointing at them noticed. **Met.**

**5 · `--dry-run` writes nothing.** Reported 39 moves and 135 links, `git status` clean afterwards.
**Met.**

`npm test` 16 pass, 0 fail, up from 14.

### What this leaves

`items/` now holds 8 files — six live items plus `README.md` and `TEMPLATE.md` — against 47 before.
`archive/` holds 40. The three shipped README files are now true in every repo that installs the
`backlog` module.