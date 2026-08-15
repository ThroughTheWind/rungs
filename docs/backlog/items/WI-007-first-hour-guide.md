---
id: WI-007
title: A first-hour guide — the surface between install and the first work item
type: docs
status: done
branch: feature/WI-007-first-hour-guide
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

`accepted` — 2026-08-15, last of the first-user path, so it can link to what the other six landed.

## Plan

### Requirements

- Names which of the twenty-five installed files matter, and what each is for.
- Names the five skills and when to invoke each.
- Says what to do when a gate is red, including the one that is red by design.
- Names the scaffold's deliberate blanks as deliberate.
- **Restates no rule owned elsewhere.** Every section ends by handing off to the owning document.
- Reachable from the README and from the wiki.

### Impacts

- New `docs/getting-started.md`, so the wiki routes it at `/wiki/getting-started/` with no site
  change — the collection globs `docs/**`.
- [`README.md`](../../../README.md) — one link, in Install.
- **No ADR.** Criterion 4: every topic it touches is owned by a document that already exists.

### Approach

**Route, do not re-explain.** The in-repo agent documentation is already good; a guide that
restated the lifecycle would be a second definition of it, stale the first time the lifecycle
changes. So each section is short and ends in a link to the owner: the backlog README owns the
lifecycle, `parameters.md` owns parameters, ADR-0005 owns instrumentation.

**A repo document, not a site page.** The item left this open. `docs/` is published to the wiki
verbatim, so one markdown file gets both surfaces at once — and it stays readable in a clone, in a
terminal, and to an agent, which a site-only page would not be. The Out of scope note that
`docs/README.md` is a candidate home is declined: that file would be the wiki index's intro prose,
a different job.

Ordering is by when a reader needs it, not by importance: which files, fill the blanks, the skills,
the first item, red gates, and the limits.

### Acceptance criteria / tests

1. The four load-bearing files are named, distinguished from the twenty-one that are not.
2. All five installed skills are listed with a trigger.
3. `concurrency-no-integration-checkout`'s by-design redness and the reason-carrying exemptions both
   appear.
4. The `AGENTS.md` blanks are named as deliberate.
5. Every claim about a rule links to the document that owns it; the page defines nothing itself.
6. The README links it; the site builds it; `rungs check` → 20 pass, 0 fail, links resolving.

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

Branch `feature/WI-007-first-hour-guide`, cut from `main` 2026-08-15.

- New [`docs/getting-started.md`](../getting-started.md) — six sections in the order a reader needs
  them, plus a where-next table. Every section hands off rather than explaining.
- [`README.md`](../../../README.md) — the Install block now says what `doctor` does and links here.

Written against a real `tracked` install rather than from memory: the five skills were listed by
reading `.claude/skills/` in a scaffolded repo, and the twenty-five-file count re-measured there.

**Verified with the site's link checker, not the repo's.** F-005 — recorded during WI-006 — is that
`gates-links-resolve` passes on broken relative links, so `rungs check` going green says nothing
about this page's twelve cross-links. `npm run check` in `site/` is what actually proved them.
Using the gate that F-005 says is blind would have been the exact failure this whole batch is about.

## Review

Checked 2026-08-15.

1. **Pass.** §1 tables the four load-bearing files and says the other twenty-one are templates,
   indexes and per-harness renderings.
2. **Pass, mechanically.** Each of the five skill directories in a fresh `tracked` install appears
   in the page, compared by listing `.claude/skills/` and grepping for each.
3. **Pass.** §5 covers `concurrency-no-integration-checkout` being red by design and the
   reason-carrying exemptions, plus the never-fired-gate question.
4. **Pass.** §2 names all three blanks and says why a guess would be worse than a hole.
5. **Pass.** The page defines nothing: the lifecycle goes to `docs/backlog/README.md`, parameters to
   `design/parameters.md`, instrumentation to ADR-0005, failure modes to `synthesis.md`.
6. **Pass.** README links it. Site builds `/wiki/getting-started/` — 43 routes, 477 links, 0 broken,
   up from 42/462. `rungs check` → 20 pass, 0 fail.
