---
id: WI-088
title: Report observed fast-tier wall-clock against the declared budget
type: feature
status: planned
branch:
created: 2026-09-06
updated: 2026-09-06
related: [WI-085, F-055, ADR-0005, ADR-0008]
epic: WI-085
children: []
---

## Proposal (rationale)

The `gates` module documents `fast_budget_ms` as "compared against the ledger's observed values, not
against typed per-gate numbers — that comparison is the reason the ledger exists", and
[ADR-0005](../../decisions/ADR-0005-self-instrumentation.md) Tier A names it the ledger's first
consumer: *"`rungs doctor` compares observed durations against the registry's declared budget and
reports drift."* [F-055](../FINDINGS.md): nothing reads the parameter. The ledger also records less
than the ADR's own schema — `at` is a date, not a timestamp, and `tier` is absent — so two runs on
one day cannot be told apart and a tier's cost cannot be summed.

## Decision

`accepted` — 2026-09-06 under [WI-085](WI-085-existing-promises-remediation.md). Implement the
comparison in `doctor`, where ADR-0005 puts it, as a measurement with no verdict. The parameter
promises reporting; nothing here introduces timeouts, cancellation or telemetry.

## Plan

### Requirements

- Each ledger row carries the ADR-0005 schema: gate id, timestamp, exit status, wall-clock ms and
  the gate's tier, plus a run identifier so rows of one run can be grouped. Old rows without these
  fields are counted as unreadable history, not guessed at.
- `doctor` reports, for the first declared tier: the declared budget, the number of recorded runs
  compared, the observed serial wall-clock of that tier per run (median and maximum over the most
  recent runs), and how many runs exceeded the budget. Ledger disabled or absent: says so.
  Malformed rows: skipped and counted. Fewer than three usable runs: says the history is too short
  and prints nothing else.
- The comparison is stated as a measurement of this machine's recorded runs. No score, no
  pass/fail, no change to the runner's exit status or gate selection (ADR-0008 rejected budget-driven
  selection).

### Impacts

- `src/check.ts` (`appendLedger` fields, a ledger reader), `src/cli.ts` (`doctor` output),
  `docs/decisions/ADR-0005` unchanged (the implementation is brought to the ADR, not the reverse).
- The gitignored ledger's line shape changes; nothing else consumes it. `ledgerQuestions` still
  reads only `id` and `status`.

### Approach

Tag every row of one `runGates` call with the same `run` timestamp (ISO-8601 with milliseconds)
and the gate's `tier`. Read the ledger once in `doctor`, group by `run`, sum `ms` for rows whose
`tier` equals the first declared tier, and compare each run's sum to `fast_budget_ms`. Print under
the existing ledger section so the pull-not-push rule holds.

### Acceptance criteria / tests

1. A ledger with ten runs of a fixture registry, some over budget, produces a report naming the
   budget, the runs compared, median and max, and the over-budget count; the same ledger with the
   budget raised reports zero over.
2. Ledger disabled, ledger absent, malformed lines, and fewer than three runs each produce the
   specified sentence and nothing else, through the CLI.
3. `rungs check` output and exit status are unchanged for the same registry before and after.
4. The packed consumer journey's ledger assertions still hold; full `npm test` and all gates pass.

### Out of scope

- Command timeouts, cancellation, per-gate typed durations written back into the registry, and any
  transmission of ledger data. Each is a separate decision.
- A warning state in the runner.

## Execution

Not started.

## Review

Not started.
