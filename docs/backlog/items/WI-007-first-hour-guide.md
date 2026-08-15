---
id: WI-007
title: A first-hour guide — the surface between install and the first work item
type: docs
status: proposed
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-005, WI-006]
epic:
children: []
---

## Proposal (rationale)

There is no quickstart, tutorial, FAQ or troubleshooting document anywhere in the repo. Verified
2026-08-15: `find` for `*getting*`, `*quickstart*`, `*tutorial*`, `*faq*`, `*troubleshoot*` returns
nothing outside `node_modules`.

The site's three surfaces are landing, wiki and contribute. `/contribute` serves **module authors**
— its six admission checks are about authoring a module, not using one. So the reader who has just
run `rungs init . tracked` and is holding twenty-five new files, five skills and a gate registry has
no page addressed to them. The README hands them a command table; the wiki hands them the research.

What is genuinely missing is narrow, and it is not a rewrite of either:

- **What just got written, and which four files matter** out of the twenty-five.
- **How to invoke the five skills that were installed.** `/work-item`, `/record-finding`,
  `/close-session`, `/backlog-summary`, `/harden-rule` are the day-2 interface, and the only place
  they are named to a user is inside the generated `AGENTS.md` — which an agent reads and a person
  usually does not.
- **What a failing gate means and what to do about it**, including that
  `concurrency-no-integration-checkout` is red by design until a repo adopts worktrees.
- **The fill-in obligations** the scaffold leaves: the `<!-- One paragraph: … -->` placeholder and
  the empty validation matrix in `AGENTS.md` are deliberate, and nothing tells the user they are.

The in-repo agent documentation is genuinely good and should not be duplicated — the guide's job is
to route a **person** to it once, not to restate it. That constraint is what keeps this item from
becoming a second manual.

Found while assessing first-user documentation completeness on 2026-08-15.

## Decision

*Empty until decided.*

## Plan

> Filled once `accepted`.

### Requirements

*Filled once `accepted`.*

### Impacts

*Filled once `accepted`.*

### Approach

*Filled once `accepted`.*

### Acceptance criteria / tests

*Filled once `accepted`.*

### Out of scope

- **The terminal's own next-step line** — WI-005. That is what `doctor` prints; this is what a
  reader opens afterwards. Both are needed and neither replaces the other.
- **The parameter reference** — WI-006. The guide links to it rather than containing a table.
- **Restating any rule the generated `AGENTS.md` or `docs/backlog/README.md` already owns.** One
  definition per concept: the guide cites, it does not re-explain the lifecycle.
- **Whether this ships as a site page, a repo document, or both.** A routing decision for the plan;
  note that `docs/README.md` does not exist today, so the wiki index currently renders with no
  intro prose and is a candidate home.

## Execution

*Not started.*

## Review

*Not started.*
