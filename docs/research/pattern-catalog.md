# Pattern catalog

> The canonical definition of every extracted pattern. Written 2026-08-14 from
> [`repos/`](repos/) and [`synthesis.md`](synthesis.md). Per-repo files **cite** these ids; they
> do not restate them ([CLAUDE.md](../../CLAUDE.md) — one definition per concept).
>
> **Rung** = maturity rung from [synthesis §5](synthesis.md#5-the-maturity-ladder).
> **Module** = the proposed CLI module, specified in Phase 4.
> Workflow sources: **AM** `axiom-mesh` · **HG** `hexguard` · **HT** `hexguard-templates` ·
> **RF** `rift-forge`. Public-framework sources, pinned through
> [`frameworks/synthesis.md`](frameworks/synthesis.md): **SW** SWE-agent · **LG** LangGraph ·
> **OA** OpenAI Agents SDK · **PA** Pydantic AI · **MF** Microsoft Agent Framework · **OH**
> OpenHands.

---

## A. Instructions & routing → module `instructions`

| id | Pattern | Src | Rung |
| --- | --- | --- | --- |
| `entry-point` | One canonical agent-instruction file: identity · non-negotiables · repo map · routing. Everything else links to it | 4/4 | 0 |
| `agents-md-bridge` | Thin `AGENTS.md` (~25 lines) pointing at the canonical file, stating *why* it does not duplicate, and naming the tie-breaker | RF | 0 |
| `scoped-instructions` | Split instructions into path-scoped files with `description:` ("Use when…") + `applyTo:` glob frontmatter. Routing lives *in* the instruction | HG, HT | 2 |
| `core-size-budget` | The always-loaded core has a declared line budget; overflow routes to a scoped guide | *(none — RF historical counter-example at 1,513; current core 555 after WI-829)* | 2 |
| `validation-matrix` | Change-surface → exact commands, in the always-loaded file. Kills both "run everything" and "run the wrong subset" | HG, RF, AM | 0 |
| `repo-map` | Where things live, in the entry doc — **generated** from the workspace, not hand-listed (`generate-derivable`) | 4/4 | 0 |
| `narrowest-anchor-loop` | anchor (file/symbol/failing test) → scoped instruction → smallest change → narrowest validation → docs | HG, SW | 0 |
| `isolation-boundary-declaration` | State where agent commands run, the unit isolated, which filesystem/environment/credential/network surfaces cross it, and which resource or rollback controls are absent. **A worktree is Git coordination, not a sandbox** | OH | 0 |
| `negative-conventions` | Prohibitions stated as strongly as prescriptions, each with the evidence threshold that would reverse it | HG, HT, RF | 0 |
| `comms-style` | Opt-in anti-sycophancy block: contradict me, challenge assumptions, no "Great idea!" | AM | 0 |
| `vocabulary-table` | Domain glossary as a routed doc with an owner — **not** inline in the entry file | AM *(location is the correction)* | 1 |

## B. Work tracking → module `backlog`

| id | Pattern | Src | Rung |
| --- | --- | --- | --- |
| `work-item-lifecycle` | Stable `WI-###` + 8 statuses (proposed→accepted/rejected/deferred→planned→in_progress→review→done) + the propose→decide→plan→execute→review workflow | RF | 1 |
| `item-template-required-fields` | Frontmatter + sections that **may not be left blank or deleted**: rationale, decision, requirements, impacts, acceptance criteria, out-of-scope, and any gating verdict ("none, because…"). *A blank line is an unfinished plan* | RF | 1 |
| `branch-per-item` | `feature/{id}` off the integration branch, `chore/` `docs/` `spike/` variants; delete on merge | RF | 1 |
| `planning-rides-trunk` | Proposals/decisions/plans land on the integration branch; only *code* needs a branch | RF | 1 |
| `scope-discipline` | Never scope-creep an item; follow-ups become new items | RF, HT | 1 |
| `epics-and-subitems` | Parent/child links, both directions | RF | 2 |
| `sprint-archive` | Closing a sprint archives it **with its items**; links recomputed repo-wide; ids stay permanently spent; **archived items are never edited** | RF | 2 |
| `backlog-spaces` | Split the board by stack/domain when a monorepo carries more than one | HG | 2 |
| `milestone-overlay` | `M##` + mandatory `T1` planning task + exit criteria, for long sequenced programmes. Optional overlay on work items | AM | 2 |

## C. Problems noticed → module `findings`

| id | Pattern | Src | Rung |
| --- | --- | --- | --- |
| `findings-log` | `F-###` register: severity · priority · evidence · when to act · how to fix · blockers. **A finding is the observation; a work item is the decision** | RF | 1 |
| `record-without-derailing` | An invocable path to record an out-of-scope observation mid-task at near-zero cost, then continue | RF | 1 |
| `finding-promotion` | Explicit triage: promote → work item · fix → mark · dismiss → **with a written reason** | RF | 1 |
| `defect-register-split` | Separate registers for *code diverges from standard* (`AD-###`) and *the standard is missing/contradictory* (`DF-###`) — different resolvers. Scale-only | AM | 4 |
| `inline-gap-callout` | An open design gap gets a `> ⚠️ Known gap [DF-NNN]` callout **in every affected doc**, removed on resolution. *An incomplete callout set is itself a gap* | AM | 4 |
| `audit-to-register` | An audit's output is **rows in a register**, never a document per subject | *(HG counter-example: 268 docs)* | 2 |

## D. Decisions & specs → modules `adr`, `specs`

| id | Pattern | Src | Rung |
| --- | --- | --- | --- |
| `adr-record` | Numbered, indexed, immutable decision records | AM, RF, HG | 1 |
| `adr-admission-rule` | N criteria, **all** must hold, applied *before* creation; otherwise the content belongs in an authoritative doc | AM | 2 |
| `spec-ids-and-status` | `<PREFIX>-F##` / `<PREFIX>-US-###`, referenced from commits/PRs/plans; status **per story** (✅ 🟡 ⬜), not per file | HT, RF | 2 |
| `mandatory-scope-section` | Every spec states out-of-scope, *"so agents don't silently expand a surface while implementing an unrelated story"* | HT, RF, AM | 1 |
| `demo-not-done` | A showcase/partial implementation is 🟡 with a note, never ✅. *A spec that overclaims integration is worse than no spec* | HT | 2 |
| `split-threshold` | Split a doc only past ~N lines — **don't pre-split** | HT | 1 |
| `reference-implementation-pointer` | Name the directory that demonstrates the correct pattern; cheaper than prose and cannot drift from code | HT | 0 |
| `adoption-guide` | Yours-to-change vs. platform-owned, for any repo meant to be started *from* | HT | 2 |

## E. Document authority → module `doc-authority`

| id | Pattern | Src | Rung |
| --- | --- | --- | --- |
| `doc-ownership-registry` | Table: topic · authoritative doc · **must NOT appear in**. The arbiter, consulted before writing | AM | 4 |
| `scope-headers` | Every doc opens with `Authoritative for:` / `Not authoritative for:` | AM | 4 |
| `stub-rule` | A stub may contain only scope headers and cross-references until explicitly promoted | AM | 4 |
| `no-paraphrase` | Reference, never restate — *"a doc that paraphrases rather than references will drift; paraphrase is not permitted"* | AM | 4 |
| `no-redirect-stubs` | A file that exists only to say "go elsewhere" is a bug. Delete it and repoint the citers | *(AM counter-example: 4 warnings for one stub)* | 4 |

## F. Decision procedures → module `workflows`

| id | Pattern | Src | Rung |
| --- | --- | --- | --- |
| `reuse-decision-table` | Per concern: use-as-is · extend-local · extend-upstream · hand-roll — each with criteria **and where the work lands** | HT | 2 |
| `second-consumer-threshold` | Hand-roll once; extract on the **second** consumer. The negative form stated too: *do not build a second local copy* | HT, HG | 2 |
| `doc-tier-selection` | Tier 0 (no doc) / Tier 1 (light plan) / Tier 2 (heavy proposal) with bump triggers. *"Use this table instead of 'use judgment'."* **Tier 0 must exist** | HT | 2 |
| `per-concern-decomposition` | The decide loop runs per *concern*, not per story | HT | 2 |
| `multi-story-batching` | Run decomposition across a whole slice first → one combined concern table, so shared concerns are caught once | HT | 3 |
| `numbered-workflow-steps` | Number the steps so other documents cite "Step 4" instead of restating the reasoning | HT | 2 |
| `phase-checklist` | Ordered mandatory phases for repeated creation work, ending in an assessment gate | HG | 2 |
| `lifecycle-verbs` | find → plan → assess (or equivalent), one invocable entry point each | HG | 2 |
| `controlled-performance-comparison` | Baseline command/ref/count/environment recorded *before*; contamination noted; *"passing tests proves correctness, not a speedup"*; if uncontended comparison is impossible the criterion stays **open** | RF | 3 |
| `protocol-with-escape-hatch` | A deliberately small abstraction names the protocol, callback, adapter, or capability check through which non-owned cases extend it. Minimalism without an escape hatch is a closed assumption | OA, PA | 2 |
| `replay-safe-side-effect` | Every resumable procedure names the durable boundary, what may re-execute after it, and whether pre-boundary effects are idempotent, separately recorded, or explicitly ambiguous. Persistence alone is not replay safety | LG, PA, OH | 3 |
| `resumable-approval-state` | A pending decision is durable state with stable request identity, validated arguments, an explicit response path, and enough continuation state to resume. UI and authority may stay host-owned | OA, PA, MF, LG | 2 |
| `approval-bound-to-request` | Approval binds server-side to the exact immutable action id and arguments that were surfaced, records the authorized decision, and is consumed once. A caller-supplied boolean is not the binding | MF *(OH counter-example)* | 2 |
| `explicit-output-designation` | Internal progress becomes caller-facing output only through an allow-list; graph connectivity, tool visibility, or event emission must not decide disclosure by accident | MF | 2 |

## G. Invocation → module `skills`

| id | Pattern | Src | Rung |
| --- | --- | --- | --- |
| `invocable-procedure` | Every procedure document ships its entry point in the same change. **A workflow with no invocation surface does not run** | RF, HG | 2 |
| `skill-neighbours` | Every skill names adjacent skills and the boundary between them, including whether routing transfers continuation ownership or returns a result. Fixes *plausible-but-wrong skill runs to completion* | RF, OA | 3 |
| `agent-facing-interface` | Design action schema, state exposure, observations, empty output, truncation, and errors as one interface the agent can reason about; each failure returns a bounded model-visible shape | SW | 2 |
| `bounded-agent-loop` | Every agentic invocation declares iteration, cost, time, context, and retry bounds that apply, plus the terminal artifact/status produced when each bound fires. “Until done” is not a procedure | SW, PA, OH | 2 |
| `ownership-changing-handoff` | A composed invocation declares who owns continuation, which state crosses, what the callee may mutate, and whether its result returns to the caller. Tool-shaped syntax does not settle those semantics | OA, MF | 2 |
| `prompt-writes-artifact` | Every invocation lands durable progress in a known directory, at the recovery boundary rather than only after successful completion. What makes a prompt library compound instead of evaporating | HG, RF, HT, SW | 2 |
| `operating-skills` | Skills for running the product — release, external-data ingest, inbound triage, design sync — not only for building it | RF | 3 |
| `prompt-index-routing` | A "suggested starting points" decision list, not just an alphabetical file listing | AM | 2 |
| `external-reasoning-prompt` | A playbook for briefing a model that has no repo access | AM | 2 |
| `model-selection-prompt` | A playbook for choosing model tier per task shape | AM | 2 |

## H. Enforcement → module `gates`

| id | Pattern | Src | Rung |
| --- | --- | --- | --- |
| `instruction-hardening` | **A mistake an instruction could have prevented is a defect in the instruction.** Repair it in the same change, unprompted. Trigger on *shapes*, not introspection. 4-rung ladder: sentence at point of use → skill row → declared cross-cutting rule → gate/hook. *If the rule already existed and you broke it anyway, make it mechanical* | RF | 3 |
| `working-rule-propagation` | Declare each cross-cutting rule with **the surfaces that restate it**; check that engaged surfaces carry current vocabulary and not the retired instruction. *Fix the authority first, then the citers. A citation is not propagation* | RF | 4 |
| `gate-self-test` | Every gate has a self-test over fixtures. *A gate whose rules are all satisfied is indistinguishable from a gate that matches nothing* | RF | 3 |
| `read-the-negation` | Match `forbids` patterns against a preceding-context negation window. *A guard that also refuses its own fix is one people disable* | RF | 3 |
| `reasoned-exemption` | Exemption markers are ignored unless they state a reason. *An escape hatch nobody has to justify is an off switch* | RF | 3 |
| `computed-claims` | A number a machine can compute is never typed by a human — gate + autofix. Probe only what the data settles **without judgement**; **pin what the gate does not cover**, so green never reads as "verified" | RF | 3 |
| `generate-derivable` | Generate what the filesystem already knows (repo maps, indexes, coverage), and gate that the generated file is current. *A green check means "not yet regenerated", never "current"* | RF, HG | 2 |
| `structural-gates` | Near-free tier-1 checks, on by default: links resolve · ids unique · required sections present · referenced paths exist | AM, RF | 1 |
| `typed-output-gate` | Turn probabilistic output into a typed structural boundary: invalid shape becomes an explicit retry or terminal error. **A well-typed value is not thereby true**; semantic validation is a separate gate | PA | 1 |
| `bookkeeping-gates` | Status checked against git: no doc waiting on finished work · no merged branch in a pre-review status. **One-directional**, with reasoned escapes, vocabulary narrowed after measuring false positives | RF | 3 |
| `tool-level-hook` | `PreToolUse` guard for traps prose has already failed to prevent (shell backticks). Must assert **both** directions | RF | 3 |
| `ageing-signal` | Any known-broken-is-non-blocking affordance ships an ageing signal, or the mitigation extends the outage | *(RF counter-example: 11/15 CI runs red)* | 3 |
| `enforcement-declaration` | Every generated rule is tagged *gated* or *review-only*. No silent third category | *(F1, unanimous)* | 1 |

## I. Concurrency → module `concurrency`

> Entry threshold: **~5+ concurrent sessions on one integration branch.** Below that this is overhead.

| id | Pattern | Src |
| --- | --- | --- |
| `green-ref` | Cut branches from the last *verified* merge, not the tip; fall back to the tip and **say so** | RF |
| `failure-attribution` | Re-run failing gates against the merge base; report **inherited** (stated, non-blocking) vs **INTRODUCED** (blocks); unattributable blocks. *A gate red for reasons you cannot fix is a gate you learn to bypass* | RF |
| `land-protocol` | Merge → verify **the merged tree** on a scratch ref → fast-forward by compare-and-swap. Never `git merge` by hand. The integration branch cannot go red from an unverified merge | RF |
| `lock-not-checkout` | Exclusion via an atomic lock naming its holder and start time, taken over if the holder died. **Never** by holding the integration branch checked out | RF |
| `no-pre-land-full-verify` | `--fast` constantly, full verify at the boundary only. A pre-land full run widens the window the merge conflicts in — 3 of 5 lands refused | RF |
| `preflight` | Predict conflicts by **file overlap**, not commit count | RF |
| `conflict-classes` | ledger (driver merges counters) · generated (driver **refuses**, prints the regenerate command) · shared code (**scheduling, not tooling** — one owner at a time) | RF |
| `regenerate-never-merge` | Reconcile generated artifacts by taking one side and re-running the producer; re-pin what moved, with the reason at the pin | RF |
| `id-claiming` | Scan every ref, every ref **name**, and every worktree's live docs including uncommitted files; claim on your own branch | RF |
| `worktree-lifecycle` | Report finished worktrees; never remove someone else's; add ageing. Worktrees isolate checkout/index/branch state, **not** processes, the wider filesystem, credentials, or network | RF, OH |
| `ci-at-land-time` | Trigger CI on the merged scratch ref, not per item-branch push. State the arithmetic (~19 billed min/run × N sessions) | RF |

## J. Release & external sync → modules `release`, `design-sync`, `ci`

| id | Pattern | Src | Rung |
| --- | --- | --- | --- |
| `candidate-and-release-lines` | `candidate/<version>` integrates the next release; `main` is stable; a long-lived `release/<version>` deploys and rolls back | RF | 3 |
| `release-skill` | One invocable path for gates → version bump → changelog → tag → deploy branch → next candidate, plus hotfix and rollback | RF | 3 |
| `external-authority-precedence` | An external source of truth is named, routed to, and **bounded**: which decisions it owns and which the repo's constraints override | HT, RF | 3 |
| `two-way-design-sync` | Pull the external design system down; route **every** delta to a backlog item, a phase-gated future item, or an upstream change request. *Never silent divergence* | RF | 4 |
| `matrix-not-per-item-ci` | Per-item CI config is a matrix entry, never a file per item | *(HG counter-example: 98 workflows)* | 1 |
| `workflow-proliferation-check` | Gate the count of near-identical CI files | *(HG counter-example)* | 2 |

## K. Session continuity → module `session`

| id | Pattern | Src | Rung |
| --- | --- | --- | --- |
| `session-handoff` | Fixed-section narrative state: objectives · in progress · resume from · up next · **active constraints** · working assumptions · open questions · archive refs. It is not a machine checkpoint, event log, or conversation-memory store | AM *(SW, LG, OA, PA, MF boundary evidence)* | 1 |
| `settled-decisions-lock` | An explicit "do not reopen X during Y unless re-planned" list, so a fresh session cannot relitigate settled questions | AM | 1 |
| `dated-session-archive` | `YYYY-MM-DD_session-NN_<what-closed>-and-<what-is-next>.md` | AM | 2 |
| `board-as-state` | Or: derive session state from the work-item board instead of a hand-written file (the `rift-forge` alternative — cheaper, less narrative) | RF | 1 |
| `event-stream-not-audit-log` | Events, spans, and persisted history are audit inputs, not accountability. Call out durability, retention, access control, actor identity, request binding, and decision reasons separately | MF, OH | 1 |

## L. Engineering practice (non-agentic, but extracted) → module `testing`

| id | Pattern | Src | Rung |
| --- | --- | --- | --- |
| `contract-test-base` | Fake and real implementations share one abstract `<Interface>ContractTests` base carrying all test methods; concrete subclasses wire each implementation. Add separately named real-boundary evidence for behavior a deterministic substitute cannot prove. **Testing a fake in isolation is a violation** | AM, PA | 2 |
| `deterministic-model-substitution` | Inject a scripted/deterministic decision source to make loop branches and state transitions exact; pair it with separate provider/transport evidence and state the fake's claim boundary | PA | 2 |
| `golden-tests` | Tests pinned against an external ground truth, never weakened; changes to them are a documented event | RF | 2 |
| `shell-editing-rules` | Script files, not `-e` strings; `&&` not `;` when a later step consumes an earlier one. *A control that cannot fail loudly is not a control* | RF | 1 |

---

## Proposed module set (input to Phase 4)

| Module | Depends on | Rung | Patterns |
| --- | --- | --- | --- |
| `instructions` | — | 0 | §A |
| `session` | — | 1 | §K |
| `backlog` | `instructions` | 1 | §B |
| `findings` | `backlog` | 1 | §C |
| `adr` | — | 1 | §D (adr-*) |
| `specs` | — | 2 | §D (spec-*) |
| `workflows` | `instructions` | 2 | §F |
| `skills` | `workflows` | 2 | §G |
| `gates` | `instructions` | 1→3 | §H (tiered) |
| `doc-authority` | `gates` | 4 | §E |
| `ci` | `gates` | 1 | §J (ci-*) |
| `release` | `backlog`, `ci` | 3 | §J (release-*) |
| `concurrency` | `backlog`, `gates`, `ci` | 5 | §I |
| `design-sync` | `backlog`, `skills` | 3 | §J (design-*) |
| `testing` | — | 2 | §L |

**Declared dependency chains that exist because a repo violated them:**
`audit → findings → backlog` (HG's 268 unactioned reports) ·
`workflows → skills` (HT's uninvocable 9-step workflow) ·
`doc-authority → gates` (AM's uncheckable non-negotiables).
