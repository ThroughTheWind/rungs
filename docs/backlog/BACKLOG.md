# Backlog

The board. One row per live work item, grouped by status. Items live in
[`items/`](items/); finished work moves to [`archive/`](archive/).

<!-- NEXT-ID: WI-008 -->
<!-- Claim from this marker and bump it on your own branch. `rungs check` refuses a duplicate. -->

## In progress

| Id | Title | Type | Branch |
| --- | --- | --- | --- |
| — | *nothing in flight* | | |

## Review

| Id | Title | Type | Branch |
| --- | --- | --- | --- |
| — | | | |

## Planned

| Id | Title | Type |
| --- | --- | --- |
| — | | |

## Accepted

| Id | Title | Type |
| --- | --- | --- |
| — | | |

## Proposed

All seven opened 2026-08-15 from one assessment: the path a first user walks, from
`npx @rungs/cli doctor` to their first work item. Each was reproduced by running the tool, and each
names its evidence.

| Id | Title | Type |
| --- | --- | --- |
| [WI-001](items/WI-001-infer-project-name.md) | Infer `project_name` from the repo directory, as its own default already promises | chore |
| [WI-002](items/WI-002-set-flag-parsing.md) | Accept `--set k=v`, and refuse an unparsed positional instead of silently retargeting | chore |
| [WI-003](items/WI-003-render-reports-what-it-cannot-reemit.md) | Stop `.ai/rungs.toml` instructing a fix that `rungs render` cannot perform | chore |
| [WI-004](items/WI-004-help-completeness.md) | Reconcile `rungs --help` with the README's command table | docs |
| [WI-005](items/WI-005-doctor-next-step.md) | End `doctor` with a recommended next command | feature |
| [WI-006](items/WI-006-parameter-reference.md) | A parameter reference, generated from the manifests | docs |
| [WI-007](items/WI-007-first-hour-guide.md) | A first-hour guide — the surface between install and the first work item | docs |

## Deferred

| Id | Title | Revisit when |
| --- | --- | --- |
| — | | |

---

Rejected and completed items keep their files — see [`archive/`](archive/). A rejection is part of
the record, with its reason; deleting one loses the answer to "why not?" and invites the same
proposal again.
