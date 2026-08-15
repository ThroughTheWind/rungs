---
id: WI-006
title: A parameter reference, generated from the manifests
type: docs
status: proposed
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-002, WI-004]
epic:
children: []
---

## Proposal (rationale)

**Forty parameters across fifteen modules have no user-facing documentation.** Counted 2026-08-15
with `grep -rn '^\[params\.' modules/*/module.toml` — which proves how many are *declared*, and
says nothing about whether any is reachable by a user who has not read the manifests. They are
absent from `README.md`, from `docs/`, from every page of the site, and from `rungs modules`, whose
output stops at name, rung, dependencies and description.

They are not cosmetic. `backlog.root` decides where the backlog lands — the parameter that exists
because the first real install would otherwise have created `docs/backlog/` beside an existing
`docs/.ai/backlog/`, which is the two-places-to-look failure arriving through the installer.
`ci.provider`, `release.stable_branch`, `instructions.harnesses`, `adr.id_prefix`,
`specs.split_lines` are all decisions a repo has already made and must be able to state.

So the discovery path today is: read `modules/*/module.toml`. That is the product's source, and
asking a user to read it to learn the tool's configuration surface is the practice this repo
extracts *against*.

**It should be generated, not written.** Every field the page needs — description, default,
`allowed`, `consumed_by` — is already in the manifests, and `rungs modules` already parses and
audits them. A hand-written table would be a second inventory of a fact the manifests own, stale on
the first parameter added; the landing page's module list is marked `generate-derivable` for exactly
this reason and is the precedent to follow.

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

- **Making `--set` parse the value correctly** — WI-002. This item documents the parameters; it
  must not ship examples in a spelling that does not parse, so it is sequenced behind that one.
- **Deriving the landing page's module and profile lists**, marked `generate-derivable` in
  `site/src/pages/index.astro`. Same technique, different inventory — worth a shared helper, but
  merging them into one item would give it two purposes.
- **Adding, renaming or re-defaulting any parameter.** This documents what exists. A default that
  turns out wrong once visible is a new item.

## Execution

*Not started.*

## Review

*Not started.*
