---
id: WI-088
title: Report observed fast-tier wall-clock against the declared budget
type: feature
status: done
branch: feature/WI-088-observed-fast-budget-reporting
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

`accepted` — 2026-09-06 under [WI-085](../items/WI-085-existing-promises-remediation.md). Implement the
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

Executed 2026-09-06 on `feature/WI-088-observed-fast-budget-reporting`, cut from `main` `eaf5fe1`
(WI-061 landed).

- `appendLedger` writes ADR-0005's schema in full: `run` (one ISO-8601 timestamp with milliseconds,
  shared by every row of one run) and `tier` (the gate's own) join `at`, `id`, `status`, `ms` and
  `examined`. `checkCommand` passes one `run` per invocation; the ejected runner inherits it through
  the same function.
- `ledgerBudget` (check.ts) groups rows by `run`, sums `ms` for rows whose `tier` is the first
  declared tier, takes the ten most recent runs and reports median, maximum and the number over
  `fast_budget_ms`. States are explicit: `disabled` (`runner.ledger = false`), `absent` (no file),
  `no-budget` (no tiers or no numeric budget declared), `too-short` (fewer than three usable runs),
  `report`. Rows that do not parse or lack `run`/`tier`/`ms` are counted as unreadable, never guessed.
- `doctor` prints the comparison under the ledger questions (`reportBudget` in cli.ts), only for a
  repo with an install record, and only as a measurement: "A measurement, not a verdict: the runner
  never selects or fails on it". `check` prints nothing about it and its selection and exit are
  untouched (ADR-0008 rejected budget-driven selection).

**Found and fixed on the way.** The fixture with a malformed ledger line took `doctor` down with a
`SyntaxError` before the budget code ran: `ledgerQuestions` parsed every line with no guard. It now
skips a line that does not parse or lacks `id`/`status`, which is the same tolerance the item
requires of the budget reader. The gitignored ledger is the only consumer of the new fields; old rows
stay readable to the questions and are counted as unreadable by the comparison.

**Deviations.** None from the plan.

## Review

Against each acceptance criterion, 2026-09-06, Windows 11, Node `v22.22.3`, npm `10.9.8`:

1. **Report.** `test/core.test.js` "doctor reports observed fast-tier wall-clock…" drives the CLI
   over a fixture ledger of ten runs whose fast-tier gates sum to 50–140 ms (a full-tier row of
   5,000 ms per run is present and correctly ignored): `Fast tier budget (declared fast_budget_ms =
   100)` · `last 10 run(s) of the fast tier: median 95 ms · max 140 ms · 4 over budget`. The same
   ledger against a 1,000 ms budget reports `0 over budget`.
2. **Every state, through the CLI.** No ledger → "No ledger yet"; `ledger = false` → "Ledger off
   (runner.ledger = false)"; two garbage/pre-schema lines → "2 ledger row(s) predate the run/tier
   fields or do not parse" beside an unchanged median; two usable runs → "only 2 recorded run(s) …
   3 needed", with no median printed. Each asserted by running `doctor`.
3. **`check` untouched.** The same test runs `check` against a 1 ms budget the fixture exceeds:
   exit 0, and none of `Fast tier budget`, `over budget`, `fast_budget_ms` in its output. The eject
   regression asserts the ledger row keys `at, run, id, status, ms, examined, tier` and one shared
   `run` id per run, and the ejected runner's rows match production's.
4. **Suite and gates.** Serial `node --test --test-concurrency=1 test/*.test.js`: **151 tests, 148
   pass, 0 fail, 3 platform skips, 143 s**; the packed consumer journey's ledger-count assertions
   still hold. `node src/cli.ts check`: 31 pass. This repository's own `doctor` now prints: "only 2
   recorded run(s) of the first tier carry run and tier fields; 3 needed" and "13352 ledger row(s)
   predate those fields or do not parse, and are not counted" — the honest state of a ledger that
   predates the schema.

**Pending.** The exact-SHA OS/Node matrix has not run: the branch is not pushed.
