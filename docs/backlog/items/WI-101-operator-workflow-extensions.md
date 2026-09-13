---
id: WI-101
title: Validate operator workflow extensions and register admission criteria
type: spike
status: proposed
branch:
created: 2026-09-13
updated: 2026-09-13
related: [WI-100, WI-063, ADR-0003, ADR-0005, ADR-0008, ADR-0011]
epic:
children: []
---

## Proposal (rationale)

After the local interface, the next useful improvement should remove a recurring reconciliation
task or give an unresolved record a clear owner and lifecycle. Adding more registers by default
would also give the operator more places to update. This spike chooses which additions earn that
cost before the product acquires another schema.

I recommend two bounded pilots: **declared work relationships** and **validation routing**. They
make existing records and checks easier to use without inventing another board. Evaluate new
register candidates alongside them, but ship none merely because they are plausible. The initial
ranking below is first-person design judgment grounded in the cited local evidence, not a claim
of independent adoption. Baseline freshness is recorded in the
[September 13 assessment](../../design/local-operator-interface-2026-09-13.md).

## Decision

Awaiting acceptance. The user requested a subsequent improvement work item on 2026-09-13. This is
a finite spike because the correct record boundaries and maintenance burden need testing before
a bundled feature or extension is promised. Creation of this plan authorizes neither pilot
execution nor shipping new modules.

## Plan

> Drafted before acceptance. Schedule after WI-100's interface work by preference, not because it
> needs a browser. The pilots must be useful from repository files/CLI alone. WI-100 does not wait
> for these new schemas.

### Requirements

Produce a decision table for these six candidates, then exercise exactly the first two as small
contract/fixture prototypes. Existing [catalogue](../../research/pattern-catalog.md) entries own
the pattern definitions; this table selects possible product work.

| Candidate and evidence | Operator decision it helps | Recommended home and running cost to test |
| --- | --- | --- |
| Declared work dependencies and active-session references: [F-056](../FINDINGS.md), catalogue `bookkeeping-gates` / `session-handoff`, existing `/decompose` | Which declared prerequisite is unresolved? Does the handoff explicitly point to a finished item? | Extend `backlog` with optional `session` integration; owners maintain ids when scope changes. No second board or readiness score |
| Validation routing: catalogue `validation-matrix` attributes HG, RF and AM; [instructions template](../../../modules/instructions/files/AGENTS.md) still has a manually filled matrix | Which existing gate declarations match these changed paths, and which paths have no mapping? | Extend `gates` / `instructions` from one declaration; owners maintain mappings when paths/checks change |
| Artifact/evidence provenance: [existing-promises evidence](../../design/existing-promises-evidence-2026-09-06.md), [site transcript checker](../../../site/scripts/check-transcripts.mjs) | Where did this generated artifact or claim come from, which revision was checked, and what should regenerate or review it? | Initially an optional designed extension, or reuse `doc-authority` / `release` if they already own it. Store references, not copied evidence; every row needs a maintainer and trigger |
| Exception review: catalogue `reasoned-exemption` / `ageing-signal` and existing reasoned escape markers | Which exception remains active and when must its owner reconsider it? | Prefer a derived index of existing markers; an optional extension may add owner/revisit metadata. No second approval authority or automatic gate bypass |
| Assumptions, risks and unanswered questions: [session](../../../.ai/session.md), WI impacts and ADR alternatives already hold uncertainty | Which uncertainty outlives this item and who can resolve it? | Defer a separate core register unless a distinct lifecycle cannot fit the existing home; candidate extension with a concrete resolver, no risk score |
| Split implementation/design-gap registers: catalogue `defect-register-split` / `inline-gap-callout`, [synthesis](../../research/synthesis.md) §3.4 | Does a different maintainer need to change the implementation or the standard? | Findings categorization first; split only after measured routing failures justify scale-only ceremony |

#### Pilot A — declared work relationships

Specify and prototype optional prerequisite ids and explicit active-session item references using
existing item ids, source paths, configured roots and archive resolution. Reuse status from the
canonical item, not a second status field. A tentative field such as `depends_on` is a design to
test, not a newly supported frontmatter promise.

The explanation distinguishes satisfied, unresolved, invalid and undeclared relationships. No
metadata means **not declared**, not ready. `done` can satisfy a prerequisite; rejected, deferred,
unknown or missing items cannot silently satisfy one. Catch duplicate/self/missing links and cycles.
Do not infer edges from `related`, epic membership, branch names or prose, and do not equate all
prerequisites satisfied with permission, priority or adequate planning. Completion meaning for
custom statuses must be declared or reported unsupported, never guessed from names.

For F-056, compare only explicit active-item references with the configured canonical backlog;
report a contradiction with a completed record. Preserve narrative handoffs and their judgment
boundary. Do not gate session age, prose quality or inferred relevance. The spike designs and
tests this contract; it does **not** mark F-056 fixed without a shipped checker and demonstrated
consumer behaviour. WI-100 avoids relying on session prose and defines no competing reference model.

#### Pilot B — validation routing

Specify one optional path-pattern → registered-gate-id declaration. Generate the instruction matrix
and a read-only explanation from it. Use supplied changed paths, then a read-only Git comparison
in a disposable pilot; define rename/delete/untracked handling, path normalization, overlapping
matches, no matches and missing/retired gate ids. Output names matched mappings and uncovered paths.

Preserve [ADR-0008](../../decisions/ADR-0008-gate-tiers-are-levels.md): tiers are cumulative levels.
This pilot neither executes checks nor alters selection, skips gates or claims a matched set is
sufficient validation. Identify runner checks separately from hooks and explain-only detectors;
unavailable or inappropriate targets have explicit reasons. Derive executable handoffs through a
supported cumulative tier, showing matched gate ids separately and disclosing additional gates
that tier includes. Declared gates need not have a command field, and the CLI does not execute a
gate id as a tier. Never generate an invented per-gate command. Reuse registered declarations and
the actual CLI grammar, not another independently maintained command catalogue.

#### Admission test for any additional register

For each new-register candidate, show two real repository records that existing findings, work
items, ADRs, session state or document ownership cannot adequately represent. Identify the distinct
question, owner/resolver, creation and update cost, review trigger, closure/supersession action,
canonical source and mechanical checks. Walk capture → lookup → operator action → closure. If that
evidence is absent, prefer an existing home or a derived view and record defer/reject with a reason.

Designed extensions state `provenance.kind = "designed"` and rationale; they do not inherit an
extraction claim merely by citing a nearby catalogue pattern. Refer to existing ids and evidence
instead of copying them. A provenance hash proves correspondence, not truth; an exception row
does not establish who was authorized to grant it. Mechanical checks cover shape/references only.

The admission decision, value, semantic adequacy and running-cost judgments are **review-only**.
Prototype structural contracts are **gated in the pilot** by positive/negative fixtures; this spike
adds no consumer enforcement. Every eventual rule must declare gated or review-only in its own item.

### Impacts

- Candidate owners: backlog/session, gates/instructions and possibly doc-authority/findings/release.
  The pilot adds specifications, fixture data and a disposable explanation harness only, with no
  default consumer schema or shipped behaviour change.
- Existing pattern definitions and extracted evidence remain canonical. Amend a catalogue entry
  only for a demonstrated correction, not to relabel a designed pilot as extraction.
- [WI-063](WI-063-external-module-roots.md) owns persistent local external-module resolution.
  Designed pack candidates can be specified/tested as fixtures here, but distribution waits for
  that seam; this item creates no registry, loader, marketplace or extension installation path.
- No UI-specific record types. Accepted later contracts can feed WI-100's shared inspection layer
  without making browser state authoritative.

### Approach

1. Verify the then-current source and open findings. Pin concrete source cases for each candidate;
   separate extracted practice, observed local defect and designed improvement in the table.
2. Prototype the two contracts above using this repo plus representative fixtures. For each pilot,
   walk two operator scenarios through a complete lifecycle and record actual navigation/manual
   reconciliation steps before/after. Mark fixture results and maintainer observations as such.
3. Apply the register admission test and classify each candidate: extend an existing core module,
   optional designed extension, reuse existing authority, or reject. Record its maintenance owner,
   trigger, cost and judgment boundary. No unattended scheduling is implied by a review trigger.
4. Deliver `go`, `defer` with a trigger, or `reject` with a reason for all six. Open **at most two**
   bounded implementation proposals for the successful pilots; if neither demonstrates value,
   close the spike with that result. New-register candidates can be deferred without a placeholder
   implementation item. Do not build a third pilot inside this one.

### Acceptance criteria / tests

1. A dated evidence/decision table covers all six candidates and identifies existing authority,
   actual cases, missing evidence, core/extension placement, owner, lifecycle, maintenance burden
   and mechanical-versus-judgment boundary. Unsupported benefits remain labelled hypotheses.
2. Pilot A resolves valid current/archived references and demonstrates absent metadata, missing ids,
   duplicate/self edges, cycles, done/rejected/deferred/unknown statuses and configurable conventions.
   It reproduces F-056 through an explicit reference, distinguishes authored claims from item facts,
   and never produces a guessed ready/approved state.
3. Pilot B demonstrates matched/unmatched/overlapping paths, rename/delete/untracked cases,
   unknown/inappropriate gate references and a declared gate with no command field. One declaration
   produces both matrix and explanation; editing it changes both. Handoffs use a supported tier and
   disclose its additional gates. Existing tiers and executed gate sets remain unchanged; no
   repository-owned check commands run in the pilot.
4. Each pilot demonstrates two recorded operator scenarios and the full maintenance loop. Report
   measured navigation/reconciliation steps and failures, not fabricated minutes saved or independent
   adoption. Fixture examples do not satisfy the two-real-record admission test for a new register.
5. Each new-register recommendation either passes that admission test with links to the two cases,
   or names an existing home / defer trigger / rejection reason. No generic register is recommended
   merely to hold fields that current authorities already own.
6. All six candidates receive a disposition. At most two implementation WIs are proposed with finite
   acceptance and running costs; none is marked accepted by the spike. F-056 stays open unless a
   separate implementation actually resolves it. Relevant repository checks pass, and no generated
   consumer files, default module set, CLI execution or runtime dependencies change.

### Out of scope

The [WI-100](WI-100-local-operator-interface.md) interface, UI authoring, production implementations
of either pilot, external module infrastructure (WI-063), a generic registry engine, stack-specific
service inventories, tracker synchronization, cloud collection, workflow scoring, agent orchestration
and automatic scheduling. No new bundled module or additional pilot is included. Potential future
implementation is limited to the at-most-two proposals justified at the spike's close; nothing else
is implicitly deferred as a delivery obligation.

## Execution

Not started. The candidate assessment and this proposed plan were prepared on 2026-09-13. No pilot,
new register, module or consumer gate has been implemented by creating this item.

## Review

Pilot acceptance has not been run. Initial scope review used the current source, the extracted
catalogue and F-056; the subsequent execution must produce the evidence required above.
