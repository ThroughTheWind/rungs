---
id: WI-066
title: Give consumers one exact Rungs CLI version source
type: feature
status: accepted
branch:
created: 2026-09-05
updated: 2026-09-05
related: [WI-064]
epic: WI-064
children: []
---

## Proposal (rationale)

The generated GitHub workflow runs `npx @rungs/cli check`. A consumer can therefore execute a
different CLI after npm's `latest` tag moves even though its repository has no diff. Arena Lab needs
one exact version source shared by local instructions and future CI, and upgrades must remain
explicit.

## Decision

`accepted` — 2026-09-05. Design and implement a consumer-visible exact pin without adding Rungs to
the product runtime or silently following the producer checkout.

## Plan

Accepted but not yet planned. Decide the single pin authority and upgrade semantics before code;
the installed record, generated commands and production dependency closure must be considered
together rather than fixing only the workflow string.

### Requirements

- To be completed before status becomes `planned`.

### Impacts

- To be completed before status becomes `planned`.

### Approach

- To be completed before status becomes `planned`.

### Acceptance criteria / tests

- To be completed before status becomes `planned`.

### Out of scope

- To be completed before status becomes `planned`.

## Execution

Not started.

## Review

Not started.
