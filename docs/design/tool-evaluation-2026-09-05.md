# Tool evaluation — 2026-09-05

**Authoritative for:** the evidence and recommendations of [WI-084](../backlog/archive/WI-084-tool-evaluation.md).
**Not authoritative for:** product behavior, accepted architecture or approval to implement a proposal.

## Assessment

**Opinion — I consider rungs a useful early product with a substantial implementation and uneven
completion of its promises.** Its strongest value is maintaining an existing repository's agent
instructions and workflow artifacts: preserving edits, detecting drift, connecting rules to checks,
and keeping adoption reversible. I would prioritize consumer trust and useful diagnostics before
enlarging the bundled catalogue. A local interface could help with inspection and adoption, but a
small generated report is the right first experiment.

This review inspected main at `69b605968fafeac02469a9214425d608ca9e8a33`, then created a documentation
branch. Product code and module payloads were unchanged. The package manifest declares `0.4.0`;
that is a checkout fact, not a fresh verification of npm or release CI.

## What is solid, and what the evidence proves

| Area | Evidence in this checkout | Assessment / limit |
| --- | --- | --- |
| Adoption and upgrades | [Path containment](../../src/emitted-path.ts), [installer](../../src/add.ts), [hash-based upgrade planning](../../src/lifecycle.ts), [consumer tests](../../test/package.test.js) | Implemented preservation, divergence handling and operation preflight. The consumer suite is a stronger test than checking generated strings, but its existing repository is still a fixture. |
| Gates | [Runner](../../src/check.ts) refuses missing engines/tables and unknown tiers; [fixtures](../../src/selftest.ts) distinguish mismatches from unrun cases | Real enforcement exists. Green covers the selected executable checks; it does not prove all declared protections work. |
| Packaging and portability | [Built entry point](../../scripts/build.mjs), exact launcher and packed retrofit in [package tests](../../test/package.test.js), [OS/Node matrix](../../.github/workflows/checks.yml) | Substantial automated coverage. The matrix configuration is not evidence that today's remote jobs passed. |
| Concurrent integration | [Git protocol](../../src/concurrency.ts), [regressions](../../test/core.test.js), [ADR-0009](../decisions/ADR-0009-rungs-drives-git.md) | Implemented verification, per-finding attribution with an independent integration control, and compare-and-swap advancement with recovery refs. The former open [F-029](../backlog/FINDINGS.md) was stale; attribution is implemented and was further hardened by [WI-081](../backlog/archive/WI-081-land-scratch-verification-control.md). |
| Module composition | `node src/cli.ts modules`, run 2026-09-05: **15 modules, audit clean** | Proves manifest consistency under that audit, not that every field has a runtime consumer or every gate executes. |
| Adoption evidence | [Roadmap](../roadmap.md), [Arena epic](../backlog/items/WI-064-arena-lab-dogfood-bootstrap.md) | Maintained-consumer adoption remains unfinished in the repository record. Arena is a valuable next test and is still owned by the same maintainer. |

Local verification, 2026-09-05, Windows, Node `v22.22.3`, npm `10.9.8`:

- `node src/cli.ts check`: **30 pass, 0 fail, 0 unimplemented, 0 error** in the initial review run.
  It also reported **45 self-test fixtures unrun**. These are not 45 failing gates, and the aggregate
  result does not count them as successful fixture executions. Triggered hooks are excluded.
- `npm test`: **139 passed, 0 failed, 3 skipped** (142 tests, approximately 204 seconds).
  The skips were one POSIX-only filename case and two file-symlink cases this host could not create.
- `node src/cli.ts check --full`: **30 pass, 0 fail, 0 unimplemented, 0 error** after the report,
  findings, tracking and session updates; the same 45 fixture limitations remained visible.
- `npm run build --prefix site` and `npm run check --prefix site`: passed; **0 diagnostics and
  0 broken internal links**. These check the local build, not the deployed website.
- `git diff --check`: passed.
- Merge-preparation correction: `node --test --test-name-pattern 'land distinguishes an inherited failure' test/core.test.js`
  passed its one selected test. The initial assessment repeated F-029's stale open status without
  reconciling it against the implementation. This correction and the finding's closure use the
  actual source and inherited/introduced/unattributable regression, not the old board claim.

These local runs neither execute other platforms nor certify usefulness to another project owner.
The workflow corpus is [one operator in four technology contexts](../research/synthesis.md), not
four independent adoption samples. The pinned [framework](../research/frameworks/synthesis.md)
and [follow-on](../research/follow-on/synthesis.md) corpora support particular architecture
boundaries; they do not establish demand for rungs conventions. Upstream implementations were not
re-executed in this assessment.

## Improvements I would prioritize

All priorities and effort labels below are **my recommendations**, not accepted implementation
plans. Small means a bounded declaration/reporting change; medium crosses a few contracts; large
requires substantial lifecycle or platform validation. These are relative estimates, not schedules.

| Order | Proposal | Evidence and success condition | Cost / existing owner |
| --- | --- | --- | --- |
| 1 | Fulfill the eject promise | A disposable consumer using the built CLI fails during ejection looking for `dist/glob.ts`. Using the source CLI, eject succeeds but the materialized gate fails loading `smol-toml`. Require direct and aggregate checks to run after all package/producer access is removed. | Medium–large; finish planned [WI-077](../backlog/items/WI-077-standalone-ejected-checks.md), including its packed-artifact criterion. |
| 2 | Deliver or explicitly degrade lifecycle hooks | A fresh tracked install declares the shell-safety hook but emits no Claude settings/hook payload and reports no hook degradation. Require a supported consumer hook to reject the motivating command and accept its safe counterpart; unsupported targets must explain the missing protection. | Medium plus ongoing harness maintenance; extend `instructions`. Recorded as [F-054](../backlog/FINDINGS.md). |
| 3 | Exercise sustained adoption | Complete the Arena canary and immutable release adoption, then observe ordinary changes, upgrades and recovery. Separately inspect independently owned public repositories at pinned commits and seek qualitative owner feedback. Ask whether an owner acts on a finding, not merely whether its path exists. | Medium execution effort plus elapsed use; [WI-064](../backlog/items/WI-064-arena-lab-dogfood-bootstrap.md). No collection of users' repository counts or telemetry. |
| 4 | Finish instruction diagnostics | Accepted [WI-061](../backlog/items/WI-061-imperative-staleness-detection.md) has a corpus but no detector. Complete the independent oracle, evidence-boundary decision and per-repository false-positive review. A command reference can be disproved against a script surface; a MUST in prose cannot prove there is no enforcement elsewhere. | Medium, including ongoing false-positive curation; existing `instructions` capability. |
| 5 | Publish complete structured results | [Detector results](../../src/explain.ts) and [GateRun](../../src/check.ts) already carry useful data; [CLI output](../../src/cli.ts) prints only four findings per detector. Add a versioned JSON contract and an all-findings text option before a UI. Preserve errors, skips, scope and provenance. | Medium; benefits agents, CI/editor integrations and human reports. This is a CLI capability, not a module. |
| 6 | Support local shared module packs | [WI-063](../backlog/items/WI-063-external-module-roots.md) identifies hardcoded roots and missing origin in installed records. An external module must resolve identically for add/check/upgrade/eject and remain distinct from another module with the same name. | Medium–large lifecycle cost; proposed, not accepted. Start with persistent local roots, before a hosted registry. |
| 7 | Make declared costs and state uncertainty visible | `fast_budget_ms` is documented but unused by the runner; command execution has no timeout. Worktree status also converts a failed status read into `dirty = false`. Report observed budget use; specify timeout/cancellation semantics; keep failed reads unknown. | Small–medium reporting, larger cancellation work; [F-055 and F-057](../backlog/FINDINGS.md). Source inspection, not a reproduced hang or failed Git read. |

The eject and hook reproductions used a fresh temporary directory for each variant: run
`node <entry> init <consumer> tracked`, inspect the registry and Claude output, run
`node <entry> eject <consumer>`, then run the materialized `instructions-core-size` gate. Entries
were the built `dist/cli.js` and source `src/cli.ts` of the inspected checkout. Both init calls
returned 0. Built eject returned 1 before creating its runner; source eject returned 0 and the direct
gate returned 1 with `ERR_MODULE_NOT_FOUND`. The source failure occurs before validation begins.
No maintained consumer repository was modified.

The missing hook is also explained by the implementation: [registration](../../src/add.ts) writes
trigger metadata, [aggregate execution](../../src/check.ts) skips triggered entries, and
[the engine map](../../src/engines.ts) has no `shell-safety` implementation. This checkout's
[custom hook](../../.claude/hooks/no-inline-interpreter-scripts.mjs) is separate from the shipped
module payload. A test of that local script does not demonstrate consumer delivery.

**My testing recommendation:** give each advertised consumer guarantee an executable installed-
artifact scenario. Start with eject and hooks, then classify the remaining unrun fixtures by the
context or adapter they need. Generated-string assertions and manifest audits remain useful, but
they cannot substitute for executing the behavior the public claim describes.

## Repeated patterns worth packaging

The definitions already live in the [pattern catalogue](../research/pattern-catalog.md). The table
below proposes delivery changes, not duplicate pattern definitions. Source alternatives are from
the recorded extractions; the proposed common contract and costs are **my opinions**.

| Repeated problem and different solutions | Proposed improvement or addition | Gate boundary and running cost |
| --- | --- | --- |
| **Choosing validation:** Hexguard uses a change-surface matrix, Rift Forge fast/full verification, Axiom Mesh milestone proof commands ([comparison](../research/synthesis.md)) | Extend `gates`/`instructions` with path → existing gate/command declarations and a read-only explanation of what should validate a diff. Generate the instruction matrix from the same declaration. | Check references and mappings mechanically; adequacy of tests stays review-only. Owners maintain mappings; execution uses their existing runtimes. Medium. |
| **Resuming work:** Axiom Mesh narrative handoff versus Rift Forge board-as-state ([catalogue](../research/pattern-catalog.md)) | Extend `session` with optional explicit active-item references reconciled against backlog state. At assessment start this repo instructed agents to execute archived/done WI-016. | Check explicit ids/status contradictions, not age or prose quality. Preserve narrative constraints and assumptions. Low runtime, modest adoption cost; [F-056](../backlog/FINDINGS.md). |
| **Sharing conventions:** Hexguard and Hexguard Templates manually copy shared rules; rungs versions module payloads but loads only its bundled root ([unsolved sharing](../research/synthesis.md), [WI-063](../backlog/items/WI-063-external-module-roots.md)) | Local external packs for team conventions and methodology integrations. Recognize an existing planning system and map its authority before offering another backlog/spec tree. | Origin, version, conflict and divergence checks can be mechanical. A mapping cannot certify equivalent semantics. Medium lifecycle cost plus pack maintenance. |
| **Keeping generated evidence trustworthy:** Rift Forge's typed population claims drifted; rungs separately protects generated site counts, console transcripts and vendored hashes ([claims gate](../../scripts/check-doc-claims.mjs), [site scripts](../../site/scripts/check-transcripts.mjs), [findings](../backlog/FINDINGS.md)) | Candidate external `artifact-provenance` pack: owner/source, derivation command, inputs/revision, output and freshness relationship for derived docs/assets. Extract the common contract before considering a bundled addition; extend `doc-authority`/`release` if it fits. | Hash/freshness/reference checks can prove linkage, not the truth of a report. Commands run only as opted-in gates. Medium design and recurring regeneration cost. |
| **Retrying agent effects:** LangGraph checkpoints, Pydantic durable adapters and OpenHands events expose different replay boundaries; follow-on products reinforce the distinction ([framework synthesis](../research/frameworks/synthesis.md), [follow-on synthesis](../research/follow-on/synthesis.md)) | Candidate external `agent-effects` guidance pack for repositories building agent products: effect owner, retry/replay boundary, idempotency policy, ambiguous outcome and recovery procedure. This remains opt-in research, not a runtime feature. | Presence/shape of declarations may be gated; actual replay safety and compensation stay review-only and need application tests. High author/reviewer burden; worthwhile only when real side effects exist. |

Among these pattern proposals, I would first ship the validation-routing and session extensions,
after the consumer-trust work above, then use the local-pack mechanism
to trial the additions. Generic testing, authentication, database migrations, logging services and
environment installers belong to stack-specific implementations or separately researched packs.
The [module catalogue](module-catalog.md) already rejected a generic testing module; milestone
tracking belongs to a backlog variant. There is no reason to reopen either decision here.

A limited primary-source comparison, read 2026-09-05, supports integration rather than another
complete planning system. [OpenSpec's own README](https://github.com/Fission-AI/OpenSpec) documents
per-change proposals/specs/design/tasks and configurable workflows. [Spec Kit's adoption guide](https://github.github.io/spec-kit/guides/existing-projects.html)
starts with an existing repository and a bounded change; its [upgrade guide](https://github.github.com/spec-kit/upgrade.html)
describes install manifests and protection for locally modified files. These are documented
capabilities, not fresh source-level extractions or verified interoperability. **My inference:**
rungs should make those systems easier to adopt and maintain without requiring duplicate work
records. Preserving local edits is valuable but is not a unique market claim.

## Would a local interface help?

**Opinion — yes, for evidence inspection and adoption decisions.** The first useful interface is a
local, filterable report built from the same results as the CLI. I would defer an always-running
service or desktop application until use demonstrates that snapshots are insufficient.

| Option | Value | Cost and recommendation |
| --- | --- | --- |
| CLI improvements + JSON | Complete evidence, automation and editor/agent consumption | Schema compatibility and reporting work; do first. |
| Self-contained HTML report | Search/filter findings and inspect module state without operating a server | Snapshot freshness, safe rendering and keyboard accessibility; first UI experiment. |
| Explicitly launched loopback browser app | Refresh state and review/apply plans in one place | Root authority, request validation, operation lifecycle and stale-plan checks; conditional second step. |
| Desktop wrapper | Native project switching and deeper editor integration | Packaging, signing, updates and platform testing on top of application costs; defer. |

The first report should support three tasks:

1. **Inspect the repository:** installed/detected modules, adopted paths, missing/stale/diverged
   content, applicable/skipped detectors, and the next command.
2. **Browse evidence:** every finding, searchable by module/gate/file, with location, examined scope
   and the incident explaining why the check exists.
3. **Review adoption or upgrade:** dependencies, conflicts, rung/cost, parameters, and kept/created/
   changed files. A detailed diff is useful but must be generated from an exact plan; the existing
   upgrade summary is not itself a reusable, approved diff. Initially provide a command to copy.

Each snapshot needs a capture time, repository revision/dirty indicator where available, tool/module
versions, scope and visible unknown/error states. Repository files remain authoritative; there is no
second backlog database. A history view may show local gate exit statuses and durations, never a
workflow score. Worktrees belong only in the concurrency user's view.

An interface must preserve the distinction between **inspect** and **run checks**:
[doctor explain](../../src/explain.ts) excludes repository-owned commands;
[check](../../src/check.ts) executes them, and its CLI path appends the ledger. Reading a report or
refreshing diagnostics must not silently execute a repo's scripts. HTML must render repository text
as inert content. A later write interface needs a reviewed plan bound to the exact root and current
file state, with changed inputs forcing a new preview. These are proposed interface requirements,
not controls installed by this report.

A generated report fits the [existing product boundary](product-brief.md). A persistent service
would require an explicit product decision: the brief excludes runtime services and daemonization.
The [OpenHands extraction](../research/frameworks/openhands.md) offers useful lessons about control
surfaces and recovery, but its agent-run UI is not evidence that rungs needs chat or orchestration.

**My proposed validation test:** use several maintained repositories with differing conventions,
including independently owned public projects. Compare CLI and report on the same tasks: locate a
relevant finding, verify its source, choose a minimal adoption action, and explain a divergence.
Record qualitative owner feedback and operator-observed usability sessions without collecting
repository telemetry or aggregating users' gate counts. Continue only if the report makes these
decisions easier and owners want to revisit it. Build a live app only when stale snapshots or repeated
manual refresh is an observed obstacle. This is a proposed decision test, not completed research.

## Suggested sequence

**My recommendation:** complete eject and hook delivery, then finish the maintained-consumer
journey and instruction diagnostics. In parallel, specify complete structured results. Trial the
static inspector on that contract. Add validation routing and explicit session-reference checks;
accept local external roots if their lifecycle cost is justified by actual pack consumers. Trial
artifact-provenance and agent-effects packs outside the bundled catalogue before considering
promotion. Preserve the implemented failure-attribution controls at the existing concurrency threshold.

No implementation recommendation in this assessment has been accepted merely by being recorded.
