---
id: WI-022
title: Extract Aider — git-first coding, repository context, and validation
type: docs
status: planned
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-011, WI-016, WI-017, WI-019, WI-028]
epic: WI-018
children: []
---

## Proposal (rationale)

SWE-agent supplies a minimal coding loop and OpenHands supplies a sandboxed, multi-run product, but
neither was selected to answer the local git lifecycle as its primary question. rungs writes into a
developer's existing repository, so the boundary between model-selected context, an applied edit,
validation, commit, diff, undo, and human control is unusually relevant to its own product.

[Aider](https://github.com/Aider-AI/aider) is selected as a git-first local counterpoint. Its public
project documents repository mapping, automatic lint/test integration, and git commits and undo.
The extraction must establish how those features actually compose and what repository state they
assume; the project description alone is not implementation evidence.

## Decision

`accepted` then `planned` — 2026-08-15. The user directed the follow-on research to continue after
WI-019 and WI-020/WI-021 established the product and evaluation extraction workflow. This item is
the git-native product child of [WI-018](WI-018-follow-on-public-agent-research.md); its written
requirements and acceptance criteria are now the execution contract.

## Plan

### Requirements

- Pin SHA, licence, date, measured scale, default configuration, and the coder/git/test packages read.
- Trace one change request through repository-map or context selection, model request, edit format,
  patch/application, lint or test feedback, and commit or user-visible diff.
- Establish the dirty-tree, branch, ignored-file, generated-file, and undo boundaries, including
  what is automatic versus opt-in.
- Trace malformed edits and failing validation back into the loop, including termination budgets.
- Identify where the user approves, steers, rejects, or recovers a change and what state survives restart.
- Map findings against narrow-anchor, structural-gate, land/candidate, agent-facing-interface, and
  prompt-writes-artifact patterns without editing the catalogue.

### Impacts

- One durable/local-product extraction and index row.
- Direct evidence about repository ingress/egress and validation that can be compared with WI-016
  in WI-028, without changing either source extraction.

### Approach

Use one ordinary edit path and the default git integration. Treat repository mapping as a context
selection mechanism, not a claim about semantic understanding. Read architect/editor or alternate
edit formats only where they materially change ownership or validation boundaries.

### Acceptance criteria / tests

1. One request is traced from context selection through repository mutation and its git result.
2. Dirty-tree, commit, undo, ignore, and validation-failure semantics cite named implementation and tests.
3. The extraction states which safeguards are defaults, optional settings, or user workflow conventions.
4. Repository-map claims distinguish measured structure from model-facing summaries.
5. Opinion is labelled; catalogue work remains WI-028; `rungs check` and site links pass.

### Out of scope

- Model leaderboards, benchmark scores, or choosing an edit format by performance.
- IDE integrations beyond the boundary needed to trace the core local path.
- Comparing Aider as a product against OpenHands or SWE-agent inside this extraction.
- Catalogue, module, or CLI changes.

## Execution

Not started.

## Review

Not started.
