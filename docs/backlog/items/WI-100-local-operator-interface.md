---
id: WI-100
title: Add a local interface for repository inspection and gate execution
type: feature
status: review
branch: feature/WI-100-local-operator-interface
created: 2026-09-13
updated: 2026-09-13
related: [WI-084, WI-085, WI-101, ADR-0002, ADR-0005, ADR-0008, ADR-0011]
epic:
children: []
---

## Proposal (rationale)

The operator wants to inspect the installed rungs system, browse work and gates, and reach the
next useful repository operation faster. Today these questions span CLI commands, module records,
Markdown items and a local ledger. An optional foreground web interface can connect those existing
authorities without creating another workflow to maintain.

The [assessment and proposed contract](../../design/local-operator-interface-2026-09-13.md) records
the verified 0.5.0 baseline, alternatives, current source seams, costs and first-release boundaries.
This is a designed interface proposal prompted by an operator request; time savings and wider
demand remain to be demonstrated. It does not reopen the completed existing-promises programme.

## Decision

Accepted 2026-09-13 by the operator: "Execute wi-100". Implement the complete bounded interface
scope, including explicit check execution. WI-101 remains a separate proposed spike.

## Plan

> Accepted plan. The [implementation contract](../../design/local-interface.md) specifies the
> command, data and execution boundary; the dated assessment records the alternatives and baseline.

### Requirements

1. Add an optional foreground, single-repository CLI interface with packaged offline assets,
   explicit loopback binding, port/no-browser behaviour and a read-only execution mode. No service
   is installed in the consumer. Proposed spelling: `rungs ui [path]`.
2. Deliver the four views in the assessment: install, work, gates and explicit diagnostics. Provide
   complete source/evidence navigation, search/filtering, live/archive selection and unknown/error
   states. Preserve configured/adopted conventions and distinguish authored status from Git facts.
3. Reuse shared engines and typed planners through a versioned snapshot/result contract. Preserve
   complete results and offer an explicit local export. Handle malformed records, partial reads,
   legacy ledger data and edits during a running server; no terminal scraping or frontend domain
   rules. A historical gate result never claims the current repository passes.
4. Provide read-only upgrade/archive previews and supported CLI handoffs. Label upgrade preview
   coverage: the current module-file plan omits gate/hook registration and record updates; no file
   delta does not prove a no-op. Execute only diagnostics and the default check operation or a
   user-selected declared tier from the UI; checks require an explicit action over a current
   displayed plan. No arbitrary command input. Run checks in an owned child process, with
   bounded output, responsive progress, truthful interruption/shutdown and unchanged runner meaning.
5. Apply the assessment's HTTP, path, content and process boundaries. Show root and execution
   authority; reject unauthorized reads/actions. Check jobs can inherit credentials/network and
   write through repository commands; the interface does not describe them as sandboxed.
6. Preserve the repository pin and eject contracts. Disable incompatible/unknown-pin browser
   execution with an actionable CLI handoff. Ejected repositories receive best-effort inspection
   and a retained-launcher handoff, with no new retained `ui` capability.
7. Keep session prose a labelled authored source; the Work view does not infer active item state
   from it. F-056's optional explicit-reference mechanics belong to WI-101, not a hidden prerequisite
   or an implied completed repair here.
8. Demonstrate the four operator tasks, keyboard/responsive use, offline packed startup and the
   cost of adding the UI. Existing CLI use continues without starting or loading the interface.

Requirements 1–7 are **gated at delivery** by the integration/contract/security tests below; this
proposal installs no gate. Usability, scope fit and maintenance-cost judgments in requirement 8 are
**review-only**; measurable package/startup regressions receive explicit test budgets in slice 1.

### Impacts

- Product brief and command/help documentation: clarify the foreground CLI boundary before code;
  update actual public claims only when the command exists. Evaluate ADR admission separately.
- CLI dispatch, shared inspection adapters and parsers, detection/check/planning APIs, contained
  source reads, optional HTTP/worker lifecycle, browser assets and package build/distribution.
- Tests for consumer packages, supported platforms, malformed/custom repositories and browser
  interactions. The documentation website is not the runtime host.
- Long-lived reads expose cache lifetime and missing-versus-malformed ambiguities identified in
  the assessment. Resolve those for inspection without changing established short-command semantics
  unintentionally. There is no install-record, ledger or consumer workflow migration in this item.

### Approach

1. Re-fetch and verify the implementation baseline. Specify the command, supported document grammar,
   snapshot/preview/job schema and browser access bootstrap in the owning spec. Define read states,
   pin compatibility, freshness and cancellation behaviour before rendering. Establish representative
   fixture sizes and package/latency budgets; compare a lightweight client with reuse of existing
   UI assets and record the running cost of the choice.
2. Build shared inspection plus install/work/gates views, inert source navigation and local export.
   Add refresh/invalidation and explicitly requested diagnostics/previews. Verify the information
   contract against source fixtures before building the check action.
3. Add the allowlisted check worker and current-plan validation, using existing cumulative tiers.
   Implement progress, output bounds, read-only mode, cancellation and foreground shutdown. Keep
   command execution separate from all automatic reads.
4. Package and test on the supported matrix; run the task walkthrough, adjust the interface based
   on observed confusion, and reconcile help, docs and changelog with delivered behaviour.

The finite result is an inspector with one execution family, not an operations platform. If these
slices need separate implementation branches, decompose this accepted scope before execution;
do not silently widen it or close this item after only the read views.

### Acceptance criteria / tests

1. A packed consumer starts the interface offline without a frontend toolchain or new emitted
   runtime. Root, CLI version, repo pin and observed source generation are visible. Explicit port
   conflict, browser launch failure, no-Git and shutdown paths are demonstrated.
2. Install/work/gate fixtures cover minimal and tracked installs, custom paths/prefixes, adopted
   and foreign paradigms, ejected/partial/malformed installs, unknown statuses, duplicate ids,
   missing links and archived references. Valid raw records remain reachable when interpretation
   fails; absence is never substituted for an unreadable or unsupported section.
3. Shared results and UI/export agree on the complete data, including more than four findings;
   renderer pagination loses none. Command checks, hooks and explain-only detectors remain distinct.
   Unknown/error/unimplemented/skipped outcomes and budget states survive presentation unchanged.
4. Change the install record, configured path, registry and dirty/untracked input while the server
   lives: refresh uses current parameters, in-flight reads detect inconsistency, previews invalidate,
   and old results lose any current-generation label. Legacy/corrupt/disabled/empty ledger scenarios
   display their limits; historical ledger rows never acquire invented current scope or findings.
5. A fixture command writes a sentinel only after Run is explicitly selected; startup, navigation,
   GET, refresh and read-only mode never execute it. Selected tiers match CLI cumulative semantics.
   Default checks also work when `runner.tiers` is absent. Changed registry/pin refuses an obsolete
   plan. Incompatible pin and eject route to supported handoffs. Path arguments containing spaces
   and shell metacharacters are tested without injection. Gate-only/hook-only upgrades do not read
   as no-op previews: unpreviewed phases and their limitations remain visible.
6. Slow, failed, noisy and interrupted check jobs leave the server responsive, output bounded and
   results truthful. Test owned-worker shutdown on each supported OS, documenting descendant limits.
   No pass after interruption, no implicit rollback, and no claimed lock against unrelated processes.
7. Security integration tests refuse unauthorized reads/actions, hostile Host/Origin, cross-origin
   action attempts, traversal/escaping aliases and executable Markdown/links. Offline asset tests
   detect external loads; exported data is available only through an explicit authorized request.
8. Walk through the four tasks named in the assessment against a recorded CLI/manual baseline.
   Record source fixtures, participants, steps and outcome rather than invented speedup numbers.
   Verify keyboard/focus/status announcements and layouts at desktop, tablet and narrow widths.
   Package/startup/large-fixture results meet the budgets recorded in slice 1 or receive an explicit
   scope decision; the existing CLI suite and required repository/platform checks pass.

### Out of scope

Work-item or finding authoring, drag-to-change status, approval/PR/merge actions, install/upgrade/
archive apply, automatic install recovery, arbitrary terminal commands, branch/worktree deletion,
agent dispatch, multiple-repository management, cloud sync, telemetry, scores and a generic registry
framework. Browser authoring is a revisit trigger, not another deliverable hidden in this item.

New dependencies, session-reference validation, validation-routing declarations and register
admission belong to [WI-101](WI-101-operator-workflow-extensions.md). External module distribution
belongs to [WI-063](WI-063-external-module-roots.md). No other implementation is deferred by this item.

## Execution

Started 2026-09-13 on `feature/WI-100-local-operator-interface`. Fetched origin again: remote main
remained `d21e3f5`; the local proposal commit `d505f99` contains no product-code delta. Fast-forwarded
the planning documents onto local main before cutting this implementation branch. The local release
recording commits remain intact.

The implementation contract is written before code. A small browser client and separate lazy-loaded
server/worker bundles avoid coupling normal CLI startup or consumer installation to the site stack.

## Review

Implementation is complete; acceptance review is in progress. The source and packed CLI now provide
the four inspection views, complete source/export data, current-plan check execution and bounded
foreground workers. No consumer runtime or dependency was added. ADR admission criterion 4 does not
hold: the interface contract already owns these choices; no duplicate ADR was created.

1. The offline installed-candidate journey passes, including bundled assets and worker resolution,
   pin/version identity and read-only execution refusal. Port conflicts, invalid flags, no-Git and
   browser-opening failure have explicit tests. The unchanged baseline compressed package was
   524,159 bytes; the candidate measured 632,587 bytes before final presentation fixes.
2. Inspection tests cover custom paths/prefixes, archives, malformed/partial data, unknown statuses,
   duplicate ids, foreign tracker evidence, alias refusal and bounded/non-regular source reads.
3. Shared runner parity and a 60-finding diagnostic/check/export fixture pass. Browser inspection
   caught and fixed nested result arrays becoming text; all 60 source-linked findings now render.
4. Refresh/configuration, registry/pin changes, continuous in-flight edits, legacy/corrupt/disabled
   history and stale-plan refusal are exercised. Previews and diagnostics label their generation;
   historical results never claim current-tree validation.
5. A browser fixture creates its sentinel only after the displayed Run action. Default and cumulative
   tier semantics, read-only refusal, pin/eject routing and actual pasted shell quoting are tested.
   Upgrade coverage explicitly excludes gate/hook/record phases even when no module files change.
6. Slow, failed, noisy, cancelled and output-overflow jobs are tested on Windows. Child-tree exit,
   responsive HTTP, retained output limits and absence of a completed ledger row after interruption
   pass. The existing platform CI matrix remains to be verified before merge.
7. Unauthorized access, Host/Origin, action methods/bodies, allowlisted paths, aliases and inert
   source content are covered. Packaged assets load without remote resources.
8. Local full suite: 178 pass, 3 existing platform/permission skips, zero failures on Node 22.22.3;
   subsequent focused suite: 26 pass including the added cases. All 32 repository gates pass.
   The 1,000-item/5,000-finding snapshot took 958ms in the final focused run. Browser walkthrough,
   final size/startup measurements, site checks and supported-platform CI evidence are being
   recorded in the verification note before the item can become done.
