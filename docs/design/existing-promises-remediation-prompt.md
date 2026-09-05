# Existing promises — remediation prompt

Prepared on 2026-09-05 from [WI-084's assessment](tool-evaluation-2026-09-05.md). This is a prompt
for a subsequent implementation task. Preparing and merging this document does not execute it,
publish a release or authorize changes to a maintained downstream repository.

The prompt deliberately excludes the assessment's new-feature proposals. Existing work and findings
must be reconciled against the checkout where the prompt is executed.

## Copy-ready prompt

Complete rungs' existing consumer promises, using the assessment in
`docs/design/tool-evaluation-2026-09-05.md` as a starting point. Implement, test, review and integrate
the bounded remediation work in this repository. Continue through the in-scope items rather than
stopping after a plan or the first fix. Preserve completed work and existing safeguards.

### Establish the real baseline

Read `.ai/session.md`, `CLAUDE.md` and `README.md` in full, then `docs/roadmap.md`,
`docs/backlog/README.md`, the assessment, the relevant design authorities and ADRs, and the actual
implementation/tests. Locate work items by id across live and archived directories. Record the
exact starting commit, branch, dirty state, runtime versions and execution boundary. Preserve
unrelated changes.

Create one bounded remediation programme with separately scoped work items, reusing WI-077 and
WI-061 rather than duplicating them. Promote still-valid findings into their own planned items.
Follow the repository's id, branch, spec-first, review, merge and archive conventions; never weaken
a gate or retrofit its expected result to obtain a pass. Each new rule is gated or review-only.

Before opening implementation, create a local evidence matrix with one row per promise:
authoritative claim; implementation path; installed-consumer reproduction or existing behavioral
regression; command and actual result; owning item; status and remaining limitation. Execute the
named verification: a finding's open status, a code symbol or a test name alone is not proof.

In particular, **F-029's attribution mechanism already exists**. As a baseline check, run
`node --test --test-name-pattern 'land distinguishes an inherited failure' test/core.test.js`
(or its actual successor if the suite moved), and inspect the implemented independent-control and
per-finding comparison. Preserve inherited, introduced and unverified distinctions; do not rebuild
attribution or weaken refusal on unknown evidence. The assessment initially repeated the stale
finding, so this executable check is part of the handoff rather than another reminder to be careful.

### Complete the promises in this order

1. **Package-independent ejection — WI-077.** Execute its accepted plan and acceptance criteria.
   Repair both built-CLI asset resolution and the incomplete runtime dependency closure. Ship the
   actual bundled runner, substituted tables and raw metadata needed by checks and meta-gates.
   Switch the aggregate launcher to local ejected execution. Prove direct and aggregate checks from
   an isolated packed consumer after npm, the installed package and producer paths are unavailable.
   Preserve tiers, ordered results, exit statuses, ledger behavior, repository-owned commands,
   unknown/error refusal, path preflight, local edits and byte-idempotence. Use the shipped artifact
   in tests; a generated runner string is not an execution test.

2. **Consumer lifecycle-hook delivery — F-054.** Deliver the declared shell-safety protection
   through a supported harness adapter, and explicitly report degradation for unsupported targets.
   Verify actual installed dispatch in fresh and existing consumers, including rejection of the
   motivating unsafe command and acceptance of legitimate safe forms from the gate's contract.
   Preserve existing settings/hooks and make repeated install/upgrade safe. Validate the underlying
   engine as well as registration. Respect ADR-0002's central-engine and consumer-runtime boundary;
   do not copy this repository's private hook into every consumer without resolving that contract.
   Hook exclusion from aggregate checks must not hide unsupported or undelivered protection.

3. **Executable self-test coverage.** Recompute the unrun inventory; the assessment's 45 is a
   dated observation, not an expected answer. Classify every unrun case and supply explicit scenario
   context, builders or adapters for supported behavior. Exercise both pass and fail through the
   real engine/adapter. Fixture construction must not branch on the expected verdict. If a fixture
   is obsolete, prove why and retain the disposition; do not relabel a missing implementation as an
   obsolete test. Surface unexpected engine exceptions as failures/errors rather than silently
   converting them into coverage gaps. Keep unsupported coverage explicit and do not claim completion
   while supported consumer promises remain untested.

4. **Instruction diagnostics — WI-061.** Finish the independently classified oracle and the
   required evidence-boundary decision before implementing its detectors. Check command references
   only against surfaces actually read. Distinguish imperative detection from proof of enforcement:
   no registry, or a gate merely mentioning the same file, cannot establish whether a particular
   rule is enforced. Keep applicability explicit and `doctor --explain` free of repository-command
   execution. Meet the item's per-repository false-positive criteria and preserve existing results.
   Do not expand into duplicate-rule or semantic authority-conflict detection.

5. **Observed fast-tier budget reporting — F-055.** Implement the documented comparison of
   `fast_budget_ms` against locally observed ledger durations. Specify behavior for disabled/missing
   ledgers, malformed or insufficient history, and the exact runs/tier being compared. Retain the
   distinction between measured cost and workflow judgement. The parameter promises reporting;
   it does not authorize introducing timeout enforcement, process cancellation or telemetry.

6. **Truthful worktree state — F-057.** Reproduce a failed Git-status read, preserve unknown/error
   with its reason, and prove the output cannot present that worktree as confirmed clean or safe
   to remove. Keep listing read-only and preserve the existing concurrency transaction and recovery
   behavior. Use a regression that exercises the failing read, not only a fabricated output object.

7. **Consumer verification and WI-064 handoff.** Run the generic packed existing-repository journey
   and a complete lifecycle check against the integrated candidate, after hooks, fixture adapters
   and new detectors are included. Re-run package-free direct/aggregate ejected checks with every
   new engine and metadata dependency. Resolve post-eject hook behavior explicitly against WI-077's
   retained check surface: an adapter must not silently depend on a package or launcher command
   that ejection removes; preserve promised protection or surface the applicable degradation before
   ejection and in its output. Prepare the established flow:
   exact producer commit → tarball and integrity → disposable canary at an exact consumer commit →
   immutable released version → exact consumer pin. Keep producer tests independent of private
   consumer content. Use any maintained Arena checkout only if that operation's authorization and
   current state are established in the execution session; this prompt does not itself authorize
   changing its maintained branch, publishing a release or contacting another owner. If such a
   boundary is unavailable, finish all independent producer work and report the concrete remaining
   canary/adoption step. Never call a synthetic fixture sustained adoption or invent elapsed use.

### Scope and working rules

This programme completes existing shipped or accepted behavior. Do not add JSON/report formats,
a local UI, external module roots/registry, validation routing, a new session-reference schema,
artifact-provenance or agent-effects packs. Those are separate proposals. Refresh stale live
handoff/backlog records as ordinary closeout; keep historical records historical.

Do not make the promises disappear by rewriting marketing text around broken behavior. Any
necessary narrowing requires an explicit decision and a recorded consumer consequence. Record
unrelated discoveries as findings. Use independent reviewers for bounded changes; parallelize only
where ownership and dependencies are clear. Resolve routine implementation choices within the
accepted scope without repeatedly asking for confirmation.

Run focused behavioral regressions for each change, then full tests, module audits, registered
gates, packed-consumer checks, package dry-run and site build/checks where the changed surfaces
require them. Use the repository's exact-SHA CI requirements; a local Windows pass cannot prove
Linux/macOS or an unobserved remote run. Keep genuinely unavailable checks explicitly pending.
Do not push, tag, publish, deploy or modify maintained downstream repositories without established
authorization; prepare the concrete candidate and remaining action first.

### Completion evidence

Review each acceptance criterion before integrating its item. Preserve local edits and rollback
paths. Keep status, findings, the board and archive consistent with actual Git state. Re-run the
appropriate verification on the integrated candidate before declaring it complete.

Return the final commit(s), corrected promises and their executable evidence, test/skip/unrun
counts with commands and dates, consumer isolation/recovery results, and any explicitly unresolved
external verification or adoption requirement. Distinguish implemented, verified and released.
Finish with a cold-readable session handoff. Start with baseline reconciliation, then WI-077.
