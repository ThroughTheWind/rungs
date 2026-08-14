# Extraction — `axiom-mesh`

> Surveyed 2026-08-14 against the working tree at `C:\Development\Repositories\dotnet\axiom-mesh`.
> 73 commits, 2026-03 → 2026-04, 29 branches. .NET 10 / PostgreSQL / Redis / Keycloak.
> A data-agnostic, connector-driven ingestion platform.

**The one-line thesis:** *documentation is the system of record, and the agent's job is to keep
it non-contradictory.* Everything else — prompts, milestones, defect logs — hangs off that.

---

## 1. The setup

| Surface | What it holds |
| --- | --- |
| `.ai/instructions.md` | The single entry point. 350 lines: identity, 9 non-negotiable rules, comms style, doc routing table, iteration protocol, vocabulary (~30 terms), doc formatting standards, code standards, library boundary rules, design-flaw protocol |
| `.ai/prompts/` | **21 prompt playbooks**, indexed in `index.md` by category (session mgmt · docs · dev · architecture · external models) with a "suggested starting points" decision list |
| `.ai/context/session.md` | Live resume point: objectives · in progress · resume from · up next · active constraints · working assumptions · open questions · archive refs |
| `.ai/context/doc_ownership.md` | **Topic → authoritative doc → "must NOT appear in"** registry. The arbiter for every "where does this belong?" |
| `.ai/context/archive/` | 21 dated session handoff notes (`2026-04-29_session-21_m17-closeout-and-m18-handoff.md`) |
| `docs/adr/` | **48+ ADRs** with an admission rule (5 criteria, all must hold) gating creation |
| `docs/governance/` | `implementation_defects.md` (`AD-###`) · `design_flaws.md` (`DF-###`) · `repository_structure.md` |
| `docs/engineering/milestones/` | `M##` milestones with mandatory `T1` planning task, exit criteria, execution plan |
| `scripts/*.ps1` | 8 validators: doc-links, folder-structure, namespace-mirroring, testing-standards, extensibility-guards, deterministic-proving, local-v1 |
| `.github/workflows/` | 7 workflows incl. merge-group validation, protected-branch validation, nightly compose, weekly benchmarks |
| `.github/copilot-instructions.md` | **4 lines** — redirects to `.ai/instructions.md` |

---

## 2. What works

**The doc-ownership registry is the strongest single idea in any of the four repos.**
`doc_ownership.md` is a three-column table: topic · authoritative document · *must not appear
in*. That third column is what makes it enforceable rather than aspirational — it converts "one
source of truth" from a principle into a lookup. The instructions make it the arbiter by name:
*"Any ambiguity about which doc owns a topic is resolved there first, before any content is
written."*

**The anti-duplication rules are unusually explicit about *why*.** Four rules, each naming its
failure mode: no fact in two docs · no silent copies · **"drift is a bug"** · paraphrase is not
permitted. The last is the sharp one — most repos permit "a short summary with a link", which is
exactly the construct that drifts, because a summary looks maintained while decaying.

**Scope headers (`Authoritative for:` / `Not authoritative for:`) on every doc.** A per-file
declaration of boundary, so a reader who opens the wrong file learns it immediately. The stub
rule follows: *"A stub file may only contain scope headers and cross-references until it is
explicitly promoted"* — which kills the placeholder-that-accretes-content pattern.

**The ADR admission rule.** Five criteria, all must be true, checked *before* creating an ADR;
if any is false the content belongs in an authoritative doc instead. Without this, ADR
directories become a second unindexed documentation tree — 48 ADRs stayed navigable because most
candidate decisions were routed elsewhere.

**The prompt library is genuinely reusable and pre-dates skills.** 21 playbooks including
several no other repo has: `external_reasoning.md` (working with a model that has no repo
access), `model_selection.md` (choosing a tier for a task), `review_session_objective.md`
(checking the *objective* for drift, not the code). The index's "suggested starting points"
section is a routing decision-list — the thing that makes a large prompt library usable rather
than a folder nobody opens.

**`session.md` as a live handoff artifact, archived per session.** Eight fixed sections, always
present, always in the same order — including **"Active Constraints / Decisions Since Last
Archive"**, which is the section that prevents a new session from reopening a settled question.
Its wording is instructive: *"do not reopen helper ownership, topology, host-boundary … during
`M18` unless explicitly re-planned."*

**The `DF-###` design-flaw protocol has a completeness invariant.** A gap gets a register row
*and* an inline `> ⚠️ Known gap [DF-NNN]` callout in **every** affected doc; resolution removes
every callout. Stated as an invariant: *"A DF entry with an incomplete callout set is itself a
documentation gap."* This is the only mechanism across the four repos that pushes a known-issue
marker **to the point of use** rather than leaving it in a register nobody reads.

**Two separate defect registers, split by kind.** `implementation_defects.md` (`AD-###`, code
diverges from standard) vs. `design_flaws.md` (`DF-###`, the standards themselves are missing or
contradictory). Different lifecycles, different resolvers — merging them would have buried the
design gaps under implementation noise.

**Communication-style instructions.** *"Never tell me what I want to hear"*, *"contradict me when
you disagree"*, *"avoid phrases like 'Great idea!'"*. Small, and the only repo of the four to
state it.

---

## 3. What doesn't

**Nothing is machine-enforced about the doc rules.** The 8 PowerShell validators check
*structure* — doc links resolve, folders mirror namespaces, testing topology conforms. Not one
checks the rules the instructions call non-negotiable: no duplicate facts, scope headers present,
ownership respected. `validate-doc-links.ps1` proves a link *resolves*; nothing proves the linked
doc still says what the citer claims. So the highest-value rules in the repo are the ones
enforced only by review — and review is exactly what a solo-operator + agent loop has least of.

**The prompt library has no invocation surface.** 21 markdown files that a human must find,
open, and paste. `.github/copilot-instructions.md` is 4 lines pointing at `.ai/instructions.md`;
there is no `.claude/`, no slash commands, no skill frontmatter. Compare `rift-forge`, where the
equivalent content is 12 skills with `description:` fields that route the agent *automatically*
from a natural-language request. The content quality is comparable; the activation energy is not.

**`.ai/context/decisions.md` is a redirect stub, and the instructions have to say so four
times.** It is named in the doc-routing table ("Why a decision was made"), then contradicted in
rule 6, then again in the iteration protocol, then again in the design-flaw protocol. A file
whose existence requires four warnings should have been deleted; the routing table should point
at `docs/adr/index.md` directly. **This is the repo's own anti-duplication rule failing on its
own instruction file** — the retired path stayed in the fast-path table and every downstream
mention became a patch.

**No branch/work-item discipline in the agent instructions.** 29 branches and 73 commits, but
the instructions describe milestones and tasks (`M18-T1`) with no statement of how work maps to
branches, when to merge, or what "done" means in git. `docs/engineering/implementation_standard.md`
carries "task impact levels" but the day-to-day loop is unspecified.

**Milestone state lives in three places that must be hand-synced.** The instructions require
updating `milestones/index.md`, the milestone doc, *and* `session.md` on any priority change —
three writes, no gate. This is the same duplication the repo forbids for facts, permitted for
state.

**The instruction file is a monolith and mixes tiers.** 350 lines covering session protocol,
markdown emoji policy, C# XML-doc requirements, and library dependency rules. An agent doing a
docs-only change reads the entire .NET code standard. `hexguard`'s `applyTo:` globs solve exactly
this; `axiom-mesh` predates that structure.

**Vocabulary table is 30 rows of domain terms in the agent instruction file.** Correct content,
wrong location by its own rules — a glossary is a topic, and topics have owners.

**Activity stopped 2026-04-30.** Whatever the workflow's merits, it did not carry the project
past `M18`. Worth stating plainly, and worth *not* over-reading: the operator moved to other
repos rather than the workflow collapsing.

---

## 4. Pain points → how they were solved

| Pain | Response | Held? |
| --- | --- | --- |
| Facts restated across docs, then drifting | `doc_ownership.md` + the four anti-duplication rules + paraphrase ban | **Partly** — the discipline is stated, never checked. `decisions.md` is a live counter-example inside the instruction file itself |
| ADR directory becoming a second doc tree | 5-criterion admission rule, applied before creation | **Yes** — 48 ADRs remained navigable |
| Known design gaps forgotten between sessions | `DF-###` register + mandatory inline callouts in every affected doc + removal on resolve | **Yes**, and it is the best-designed mechanism in the repo |
| Context lost between chat sessions | `session.md` with fixed sections + dated archive notes | **Yes** — 21 archives, and resume state is genuinely readable cold |
| Settled decisions reopened by a fresh session | "Active Constraints / Decisions Since Last Archive" section | **Yes** — cheap, and specific enough to act on |
| Session setup improvised each time | 21 prompt playbooks + routing index | **Partly** — solved authoring, not invocation |
| Code drifting from documented standards | 8 PowerShell validators + CI gates | **Yes for structure**, no for semantics |
| Test doubles tested instead of implementations | ADR-027: three-role fake/real contract, abstract `<Interface>ContractTests` base | **Yes** — a genuinely reusable testing pattern |

---

## 5. How to improve it further

1. **Make the ownership registry executable.** A checker that reads `doc_ownership.md`, and for
   each row greps the "must NOT appear in" paths for the topic's identifying terms. Approximate,
   and approximate is enough — `rift-forge` proved a term-based gate catches real drift.
2. **Gate scope headers.** Two lines of script: every `docs/**/*.md` except the root `README.md`
   opens with both blocks. A mandatory rule with a zero-cost check has no excuse to be manual.
3. **Delete `decisions.md`, repoint the routing table.** Then the four warnings can go too.
4. **Split `instructions.md` by `applyTo:` scope.** Core (always) · docs standards · .NET code
   standards · library boundaries. `hexguard`'s pattern, retrofittable.
5. **Give the prompts an invocation surface.** Add frontmatter `name`/`description` and expose
   them as skills or slash commands. This is the single highest-leverage change available: the
   content already exists and is good, and 21 playbooks nobody invokes are worth roughly nothing.
6. **Generate the milestone state.** `session.md`'s status lines should be projected from the
   milestone docs, not typed three times.
7. **Specify the git loop.** Even minimally: branch per task, merge on close.
8. **Add the `AGENTS.md` bridge** so non-Copilot harnesses find the entry point.

---

## 6. Extraction verdict — what the CLI takes

**Take, high confidence:**

- `doc-ownership-registry` — topic · owner · must-not-appear-in. **The best idea in the corpus.**
- `scope-headers` — `Authoritative for:` / `Not authoritative for:` on every doc, plus the stub rule
- `adr-admission-rule` — criteria gate before an ADR may be created
- `design-flaw-register` — `DF-###` + the inline-callout completeness invariant
- `session-handoff` — fixed-section `session.md` + dated archive, incl. "active constraints"
- `prompt-library` — the 21 playbooks are directly portable module content; `external_reasoning`
  and `model_selection` have no equivalent elsewhere
- `defect-register-split` — implementation defects vs. design flaws as separate registers
- `contract-test-base` — ADR-027's three-role fake/real pattern (a `testing` module, not agentic)
- `comms-style` — the anti-sycophancy block, as an opt-in block in the generated instructions

**Take as a warning, not a pattern:**

- Doc-discipline rules **without gates decay**, and they decay *inside the file that states them*.
  Any CLI module that generates doc-authority rules must generate the checker in the same breath.
- A redirect stub is a bug. If the CLI ever emits one, it emits a deletion task with it.

**Leave:**

- The monolithic instruction file
- Hand-synced milestone state across three files
