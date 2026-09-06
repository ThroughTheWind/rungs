# Existing-promises remediation and release handoff — 2026-09-06

## Delivered

The remediation prompt prepared on 2026-09-05 was executed end to end as one programme,
[WI-085](../../docs/backlog/archive/WI-085-existing-promises-remediation.md), with the baseline
re-derived from Git and the tests before any child opened. Seven items landed on `main` through
`rungs land`, each on its own branch with a green merged tree: WI-077 (package-independent ejection),
WI-086 (hook delivery through the pinned launcher, ADR-0010), WI-087 (every shipped self-test fixture
executes), WI-061 (imperative census and stale-command detector, oracle first, ADR-0011), WI-088
(observed fast-tier budget in `doctor`), WI-089 (truthful worktree state), and WI-090 (integrated
consumer verification). Two more, WI-091 and WI-092, were opened and landed for defects the WI-090
canary found in the integrated candidate. Per-item commands, dates and counts are in
[`existing-promises-evidence-2026-09-06.md`](../../docs/design/existing-promises-evidence-2026-09-06.md).

## Not delivered

Nothing was pushed, tagged, published or deployed, and Arena Lab's maintained checkout was only read.
The exact-SHA CI matrix is therefore pending. The disposable Arena Lab canary ran on a throwaway
clone and is a synthetic check, not adoption. The findings the programme left open, F-059 to F-063,
were then closed in the same session at the user's request, one item each: WI-093 (`add` extends the
install record, F-061), WI-094 (one `check [path] [tier]` grammar on both launcher surfaces, F-063),
WI-095 (guarded large-value assertions and a capped serial `npm test`, F-059), WI-096 (the private
inline-interpreter hook anchored to the interpreter's own arguments, F-060), WI-097 (the phantom
`design-sync` gate retired and `generated_by` values read as command claims, F-062). Still open:
F-056 and the user's own F-058.

## Decisions taken

Hooks dispatch through the pinned launcher and never block on their own failure (ADR-0010). The
imperative census asserts nothing about enforcement in either direction and lives only in `doctor
--explain` (ADR-0011). Defects found by a verification item become new items, not scope of the
verifier (WI-091, WI-092). Test assertions on large values compare digests, and the suite runs
serially with a capped heap after three host crashes traced to a single equality assertion (F-059).

## What turned out to be wrong

The assessment's belief that the packed journey proved the integrated candidate was false in one
place the producer could not see: its own repository has decision records, so the freshness rule's
treatment of a zero-record index was never exercised until a real consumer's untouched scaffold
failed. The eject summary understated the retained surface for one release. `check full` means the
tier through the ejected launcher and a path through the CLI (F-063).

## Verification and handoff

Producer numbers per item are in each item's Review; the last full run, on the WI-097 tree, was
`npm test` 157 tests, 154 pass, 0 fail, 3 skipped, and `rungs check` 32 pass with every one of the
161 shipped fixtures executing. The next task is WI-064's release flow, which this session did not
have authorization to run: push `main`, read the CI matrix for the exact SHA, cut 0.5.0 from
`changelog.d/0.5.0.md`, publish, then a dedicated Arena Lab item pins the released version through
`node .ai/rungs.mjs upgrade --to 0.5.0`. The user's uncommitted F-058 row was stashed during every
landing and restored afterwards; it remains uncommitted, as before the programme.
