---
id: WI-076
title: Contain backlog archival inside the repository
type: feature
status: in_progress
branch: feature/WI-076-backlog-archive-containment
created: 2026-09-05
updated: 2026-09-05
related: [WI-047, WI-073, F-049]
epic: WI-064
children: []
---

## Proposal (rationale)

An independent boundary audit of WI-073 reproduced an external write in a different command family:
replace `docs/backlog/archive` with a junction to a directory outside the consumer, then run
`rungs backlog archive`. The command exits successfully, removes the finished in-repo item and
creates it under the outside target. Its earlier repository-wide link rewrites can also mutate a
hard-linked outside file before that move occurs.

WI-073 deliberately covers module-emission and installed-record flows, not every later lifecycle
command. Keeping that scope honest requires this archive-specific operation to own its complete
mutation set and to prove it is inside the consumer before the first rewrite.

## Decision

`accepted` — 2026-09-05, during the user-authorised Arena Lab bootstrap. Build WI-076 after WI-073
lands so archive planning and application can reuse its portable lexical, canonical-ancestor,
alias, hard-link and writable-leaf boundary semantics. Treat the recorded backlog root and an
`ArchivePlan` supplied by a caller as untrusted at the point of use.

## Plan

### Requirements

- Reject absolute, drive-relative, rooted, mixed-separator traversal and parent traversal in the
  configured backlog root before reading it as an archive tree.
- Canonically contain the backlog root, `items/`, `archive/`, every item source/destination and every
  Markdown file scheduled for link rewriting inside the consumer repository.
- Refuse outward symlink/junction ancestors or leaves, non-directory tree components, non-regular
  writable files and writable hard-link leaves before the first link or item changes.
- Revalidate the complete mutation set at application time; do not trust a plan merely because it
  was produced earlier or by the bundled planner.
- On any refusal, leave source items, archive targets, link text and outside sentinel bytes exactly
  unchanged and report the offending archive path.

### Impacts

- `src/backlog.ts` plan/apply boundary representation and `src/cli.ts` refusal reporting.
- Archive unit and CLI regressions, including Windows junction coverage with a privilege-aware skip
  only where the host genuinely cannot create the alias.
- The shared path helper from WI-073 may need a domain-neutral operation label or small exported
  primitive; its module-emission behavior must remain unchanged.

### Approach

Resolve the configured `docs/<root>` through the portable repository-path validator before the CLI's
first `existsSync`. Build a mutation candidate set from the completed plan: rewrite files are
writable existing leaves, item sources are existing regular inputs, and archive destinations plus
their ancestors are move sinks. Resolve and validate all of them together, then carry the resolved
paths into application rather than reconstructing destinations with unchecked `join` calls.

Call the same validation again inside `applyArchive` so a forged plan or filesystem change between
planning and applying fails closed. Preserve the command's current rewrite-before-move ordering only
after the whole set has passed.

### Acceptance criteria / tests

1. The exact F-049 outward `archive/` junction reproduction is refused in dry-run and apply modes;
   the in-repo item, outside directory and every link remain byte-identical.
2. Outward aliases at the backlog root, `items/`, an existing archive leaf and the deepest existing
   destination ancestor are refused, while an inward alias stays contained and works.
3. Stored traversal/rooted/drive path values are refused consistently across operating systems and
   cannot make the command inspect or mutate an outside backlog.
4. A hard-linked Markdown rewrite target and a non-regular writable target fail the complete
   preflight before any earlier safe rewrite or item move; outside bytes remain unchanged.
5. A forged or stale `ArchivePlan` cannot bypass application-time containment, and a normal archive
   still moves every eligible item and repoints every valid link exactly once.
6. Focused tests, full `npm test`, package dry-run, `git diff --check` and all registered Rungs gates
   pass. The exact pushed SHA passes all six OS/Node matrix cells and the site job.

### Out of scope

- Module-emitted add/init/upgrade/render/detect/record paths owned by WI-073, or changing which
  backlog statuses and epic relationships are eligible for archival.
- Following repository symlinks during the general-purpose `walk`, automatically repairing unsafe
  consumer filesystem topology, or publishing v0.4.0.

## Execution

Started from green `main` at `9d362f860ad0d701d9d1b87ab04d9c13eec756df` after WI-073 landed.

## Review

Not started.
