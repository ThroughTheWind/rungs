# Cross-repo synthesis

> Written 2026-08-14 from the four extractions in [`repos/`](repos/). Every claim here traces to
> one of them; where a claim is opinion it says so.

---

## 1. The four repos are one learning curve

Read in date order they are not four independent samples. They are the same operator, in four
technology contexts, discovering the same things in sequence — which is the strongest available
argument that the content is portable rather than domain-specific.

| | `axiom-mesh` | `hexguard` | `hexguard-templates` | `rift-forge` |
| --- | --- | --- | --- | --- |
| **Period** | 2026-03 → 04 | 2026-06 → 07 | 2026-07 | 2026-07 → 08 |
| **Home** | `.ai/` | `.github/` | `.github/` + `docs/specs/` | `.claude/` + `.github/scripts/` |
| **Unit of work** | Milestone `M##-T#` | *(none)* | *(none)* — spec story ids only | Work item `WI-###` |
| **Unit of decision** | ADR (48+) | Workflow decision (4) | Plan doc, 2 tiers (20) | ADR (25) + WI plan |
| **Problem register** | `AD-###` + `DF-###` | 268 audit documents | *(none)* | `F-###` (91) |
| **Invocation** | Paste a prompt file | 3 slash commands + 1 agent | **none** | 13 skills + hooks |
| **Enforcement** | 8 structural validators | `ci.yml` | *(none)* | **42 `check:` gates + 27 self-tests + a `PreToolUse` hook** |
| **Concurrency** | 29 branches, unspecified | 6 branches, trunk-ish | 3 branches, trunk-ish | **401 branches, 51 worktrees, a land protocol** |
| **Instruction scoping** | 1 file, 350 lines | **7 files, `applyTo:` globs** | 7 files, `applyTo:` globs | 1 file, 1513 lines |

**The arc:** *document authority* (`axiom-mesh`) → *scoped instruction + repeatable checklist*
(`hexguard`) → *decision procedure* (`hexguard-templates`) → *mechanical enforcement + concurrency*
(`rift-forge`).

Each stage answers the previous stage's unsolved problem. `axiom-mesh` wrote excellent rules and
could not check them; `hexguard` scoped and repeated them but had nowhere for a finding to land;
`hexguard-templates` made the decisions crisp but gave them no entry point; `rift-forge` made
everything mechanical and paid for it with a 1513-line instruction file — which is precisely
`hexguard`'s solved problem, unadopted.

**No repo has all four stages.** That gap is the product.

---

## 2. Convergences — where independent repos agreed

These become **defaults**, not options. Each names its sources.

| Convergence | Repos | Form |
| --- | --- | --- |
| **A single canonical agent-instruction entry point** | 4/4 | `.ai/instructions.md` · `AGENTS.md` · `AGENTS.md` · `CLAUDE.md` + bridge |
| **"When does this apply" belongs *inside* the instruction** | 4/4 | `applyTo:`+`description:` frontmatter · skill `description:` · prompt-index routing table |
| **One definition per concept; drift is a bug** | 4/4 | doc-ownership registry · "update docs when public API changes" · "plans reference spec ids instead of restating scope" · "one definition per concept — no drift" |
| **A repo map / routing table in the entry doc** | 4/4 | Every one opens with where-things-live |
| **Decisions are durable artifacts** | 4/4 | ADR · numbered workflow decisions · plan docs · ADR + WI plan |
| **A prompt/skill must write a durable artifact** | 3/4 | briefs & audits · plans · findings, WIs, curation records. (`axiom-mesh`'s prompts mostly update `.ai/context/` — same shape) |
| **An explicit validation matrix: change-surface → commands** | 3/4 | `hexguard` states it best; `rift-forge` mechanizes it as `verify --fast/--full`; `axiom-mesh` has per-milestone proof commands |
| **Negative rules with an evidence threshold** | 3/4 | "no motion package until two consumers" · "second-consumer threshold" · "not-handled list, each with a reason" |
| **Scope/out-of-scope is mandatory, not optional** | 3/4 | scope headers · mandatory spec Scope section · non-deletable `## Out of scope` |
| **Session/handoff state is a file, not chat history** | 2/4 | `session.md` + 21 archives · `BACKLOG.md` + item status. Both refuse to rely on the conversation |
| **External authority gets an explicit precedence rule** | 2/4 | Claude Design MCP "layout guidance, not functional spec" · `/design-align` "never silent divergence"; also `rift-forge`'s "curation outranks the feed" |

**The strongest convergence is the last row of §3's counter-list:** all four repos wrote rules they
could not check, and all four measured or exhibited decay. That is the finding the CLI exists to act on.

---

## 3. Divergences — the real choices

These cannot be defaulted. They are the CLI's configuration surface.

### 3.1 Where does agentic config live?

`.ai/` (harness-neutral, needs a bridge) · `.github/` (Copilot-native, `applyTo:` globs) ·
`.claude/` (skills, hooks, settings) · `AGENTS.md` (open standard, no scoping).

**These are renderings of the same content**, and the repos prove it: `hexguard`'s
`description:`+`applyTo:` frontmatter and `rift-forge`'s skill `description:` solve one problem in
two dialects; `axiom-mesh`'s 21 prompts are skills without frontmatter.

→ **CLI position (opinion):** author once in a neutral source, emit every requested rendering, and
gate that they agree. Multi-harness output is a first-class feature, not a compatibility layer.

> **Amended 2026-08-14 — this position was too broad.** Measuring the actual formats
> ([harness-landscape.md](harness-landscape.md)) showed that agentic config is **four primitives**,
> not one, and that two of them stopped needing rendering after these repos were built: procedures
> are now an open standard (Agent Skills, 45+ clients) and always-on context needs a one-line
> bridge, not a rendering. Only **path-scoped rules** are genuinely fragmented. The corrected
> position — *portable-first, bridge second, render last* — is
> [ADR-0001](../decisions/ADR-0001-multi-harness-rendering.md), which supersedes this paragraph.
> The paragraph is kept because §7.3 and the module set were derived from it.

### 3.2 Instruction scoping: one file or many?

One monolith (`axiom-mesh` 350, `rift-forge` 1513) vs. path-scoped set (`hexguard`, `templates`).

Monolith wins on: nothing is missed, cross-references are local, one thing to keep true.
Scoped wins on: per-session cost, relevance, per-file ownership.

→ **CLI position:** small always-loaded core (identity · non-negotiables · routing · validation
matrix) + scoped guides, with a **size budget on the core**. `rift-forge` is the counter-example
that makes the budget non-negotiable.

> **Confirmed 2026-08-14.** Anthropic's own guidance is *"target under 200 lines per CLAUDE.md
> file. Longer files consume more context and reduce adherence."* The scoping mechanism
> `rift-forge` lacked now exists natively in every major harness — see
> [harness-landscape §4](harness-landscape.md).

### 3.3 Unit of work

Milestone/task (`M18-T1`) · none · none · work item (`WI-###`).

Milestones suit long sequenced architecture pushes; work items suit continuous flow and are the
only form that survived high branch counts. Two repos had **no** unit of work — and both show the
consequence: `hexguard` produced 268 audits that could not become anything, and
`hexguard-templates` cannot say what is in flight.

→ **CLI position:** `backlog` is a **base module**, not an advanced one. `milestones` is an
optional overlay for sequenced programmes.

### 3.4 Problem registers: how many, and what shape?

Zero (`templates`) · one document per subject (`hexguard`, 268) · two registers split by kind
(`axiom-mesh`: `AD-###` implementation vs `DF-###` design) · one register + a promotion path
(`rift-forge`: `F-###` → `WI-###`).

Document-per-subject is the failure: no aggregate state, no closure. The split-by-kind idea is
right (code-diverges-from-standard and standard-is-missing have different resolvers) but doubles
the ceremony.

→ **CLI position:** ship `findings` as one register with a `kind` field and a promotion path to a
work item. Split into two registers only at scale.

### 3.5 Concurrency model

Trunk-ish (`hexguard` 6 branches, `templates` 3) · branch-per-task, unspecified (`axiom-mesh` 29) ·
**shared candidate + worktrees + land protocol** (`rift-forge` 401 branches, 51 worktrees).

The land protocol is superb and expensive: merge drivers, a lock, CAS, attribution, a green ref,
scratch integration refs. Below roughly 5 concurrent sessions it is pure overhead.

→ **CLI position:** `concurrency` is an **opt-in module with a stated threshold**, and the CLI
should say the threshold out loud rather than let people adopt it aspirationally.

### 3.6 Enforcement level

Review-only (`templates`) · CI build (`hexguard`) · structural validators (`axiom-mesh`, 8) ·
**semantic gates + self-tests + hooks** (`rift-forge`, 42 + 27 + 1).

→ **CLI position:** tiered. Tier 1 structural gates are near-free and should be **on by default**
(links resolve, ids unique, required sections present, referenced paths exist). Tier 2 semantic
gates are earned — added when a rule has already been broken, per `instruction-hardening`.

### 3.7 Specs: separate tree, or work-item plans?

Dedicated `docs/specs/` with story ids and per-story status (`templates`, `rift-forge`) vs.
authority docs by topic (`axiom-mesh`) vs. package docs (`hexguard`).

→ **CLI position:** `specs` is optional and orthogonal to `backlog`. **Scope tracking is not work
tracking** — `hexguard-templates` demonstrates that having one does not give you the other.

---

## 4. Failure modes all four hit

The most valuable section here. Each is a **module requirement**, not a nice-to-have.

### F1 — Prose without a gate decays, including inside the file that states it

- `axiom-mesh` forbids restating facts; its instruction file has to warn four times that
  `decisions.md` is a dead redirect.
- `hexguard-templates` forbids restating scope; its `AGENTS.md` repo map has 5 duplicated entries.
- `hexguard` states SSR safety in three places across two repos, gates it in zero.
- `rift-forge` had *"keep it current with the code"* in bold while **7 of 11 counts went false**,
  and measured **5 working rules** that never reached the files teaching them.

**→ Requirement:** any module that generates a rule generates its checker, or explicitly records
that the rule is review-only. `rift-forge`'s 4-rung ladder is the pricing model.

### F2 — A procedure with no invocation surface does not run

- `axiom-mesh`: 21 good playbooks, no invocation, must be found and pasted.
- `hexguard-templates`: a 9-step workflow that is the best decision procedure in the corpus, and
  `AGENTS.md` says *"No custom prompts or agents defined yet… placeholder for future additions."*
- `hexguard` and `rift-forge` both invoke, and both compound.

**→ Requirement:** the CLI never generates a procedure without generating its entry point in the
same step. A workflow doc with no skill/prompt is an incomplete artifact.

### F3 — Analysis with nowhere to land produces unactioned prose

268 audit reports (`hexguard`) with no register and no work-item object; 7 audits
(`hexguard-templates`) with the same gap. `rift-forge` reached 91 findings with a promotion path
and near-zero cost to record one.

**→ Requirement:** `audit` **depends on** `findings`; `findings` **depends on** `backlog`. Declared
as module dependencies, refused if unmet.

### F4 — Bookkeeping lies, and the next agent believes it

`rift-forge` measured it because it built gates to look: **37 items** at `review` with code already
landed; one `in_progress` for **8 days** past its own merge; **95% of 474 rows** naming a finished
item as next owner, then quoted in a code comment as evidence. The other three repos have no
mechanism that would have detected any of this — which is not evidence they were clean.

**→ Requirement:** status must be checkable against git. Ship the merged-branch gate and the
stale-blocker gate in the `backlog` module, one-directional, with reasoned escape hatches.

### F5 — Hand-maintained lists of things the filesystem already knows

Repo maps (all four), `docs/packages/` at 117 vs. 105+39 (`hexguard`), the 98 near-identical
release workflows (`hexguard`), milestone state in three files (`axiom-mesh`).

**→ Requirement:** generate the derivable, gate the generated. A `gen:` + `check:` pair is the
cheapest recurring win in the corpus.

### F6 — A checklist step that creates a file creates N files

`hexguard`'s Phase 3 says "add a release workflow" → **98 near-identical workflows**, and changing
release policy became a 98-file edit.

**→ Requirement:** any generated checklist step that emits per-item config must emit a *matrix
entry*. The `ci` module ships a proliferation check.

### F7 — Scale outruns the container

`items/` past ~600 (`rift-forge` → sprint archiving, 543 moved) · 268 audits with no rollup
(`hexguard`) · 51 worktrees and 401 branches (`rift-forge`) · 99 workflow files.

**→ Requirement:** every generated container declares its **archive/rollup strategy up front**, not
after it becomes unreadable.

### F8 — The mitigation extends the outage

`rift-forge`'s inherited/INTRODUCED attribution made red CI painless — and *"11 of the last 15 runs
failed"* with two permanently-red jobs. The mitigation is correct and it removed the pressure.

**→ Requirement:** any known-broken-is-non-blocking affordance ships with an ageing signal.

---

## 5. The maturity ladder

Practices priced by what they cost to run, so a solo spike is not sold `rift-forge`'s land protocol.
Rungs are cumulative. Thresholds are **opinion**, calibrated against where each repo actually sat.

### Rung 0 — Any repo with an agent (cost: ~1 hour, then near-zero)

Entry-point instruction file (identity · non-negotiables · repo map · **validation matrix**) ·
`AGENTS.md` bridge · scope/out-of-scope discipline · conventional commits.

> `hexguard-templates` at 319 commits ran on approximately this plus specs.

### Rung 1 — More than one work item in flight (cost: minutes per item)

`backlog` — ids, 8-status lifecycle, item template with **required non-deletable fields**, a board ·
`findings` — record-without-derailing, promotion path · branch-per-item naming.

> **This is the rung two of the four repos never climbed, and both paid the same price.**

### Rung 2 — Repeated work of the same shape (cost: authoring only)

Invocable skills/prompts, each writing a durable artifact · phase checklists for creation work ·
the reuse decision table + second-consumer threshold · doc-tier selection **including Tier 0** ·
scoped instructions with `applyTo:`.

> `hexguard` at 105 packages; `hexguard-templates`'s 9-step workflow.

### Rung 3 — Rules that have been broken at least once (cost: a script + its self-test, each)

Tier-1 structural gates (links, ids, required sections, referenced paths exist) · the
instruction-hardening obligation · computed claims replacing typed numbers · `gen:`+`check:` pairs ·
`PreToolUse` hooks for tool-level traps.

> **Entry condition is a *measured* repeat, not a worry.** Rung 3 built speculatively is 42 scripts
> nobody can map — which `rift-forge` also demonstrates.

### Rung 4 — Documentation surfaces that restate each other (cost: ongoing rule curation)

Doc-ownership registry (+ its checker) · working-rule propagation gate · design-flaw register with
inline callouts · bookkeeping gates against git.

> `axiom-mesh`'s registry married to `rift-forge`'s gate is the combination neither repo has.

### Rung 5 — 5+ concurrent sessions on one integration branch (cost: high; a real tooling project)

Green ref · fast/full verify with attribution · preflight · land protocol with lock + CAS ·
merge drivers per conflict class · id claiming across refs · worktree lifecycle · sprint archiving ·
cost-aware CI trigger placement.

> `rift-forge` at 401 branches / 51 worktrees. **Below ~5 concurrent sessions this is overhead**,
> and the CLI should say so at install time.

---

## 6. What nobody solved

Open problems. The CLI should not pretend these are answered.

1. **Keeping the instruction set small *and* complete.** `hexguard` scoped it; `rift-forge` made it
   complete. Nobody did both. The `applyTo:`-scoped-core + routing shape is the hypothesis, untested
   at `rift-forge`'s content volume.
2. **Semantic drift detection.** Every gate in the corpus is structural or vocabulary-based.
   `check:working-rules` catches a surface that dropped the phrasing, not one that kept the phrasing
   and changed meaning.
3. **Cross-repo rule propagation.** `hexguard` ↔ `hexguard-templates` share rules by hand, in
   both directions, with no gate. Both repos' SSR rules are already stated in three places.
4. **Skill taxonomy past ~12 skills.** `rift-forge` invented neighbour-naming as a patch. Nobody
   knows the ceiling.
5. **Worktree/branch garbage collection with multiple owners.** *"Removing someone else's worktree
   is not a script's call"* — correct, and 51 accumulated.
6. **Measuring whether any of this works.** No repo tracks agent-session outcomes: rework rate,
   gate hit rate, which instruction prevented what. Every improvement here was justified by an
   incident, never by a trend. **This is the biggest gap in the corpus** — and the one thing a CLI
   is uniquely placed to fix, because it can instrument what it generates.

---

## 7. What this means for the CLI

1. **Compose, don't template.** Four repos, four topologies, four workflow shapes; a single golden
   template fits none of them. Modules with declared dependencies and conflicts.
2. **Retrofit is the primary use case, not `init`.** All four repos already exist and all four have
   a specific missing rung. `add <module>` and `doctor` matter more than scaffolding a new repo.
3. **Multi-harness rendering from one source.** `.claude/` skills, `.github/instructions/`,
   `.ai/prompts/`, `AGENTS.md` are dialects. Author once, emit all, gate agreement.
4. **Every rule module ships its checker or declares itself review-only.** F1 is unanimous.
5. **Every procedure module ships its invocation surface.** F2 is unanimous.
6. **Declare module dependencies and refuse to violate them.** `audit` → `findings` → `backlog`.
7. **Price every module and state its threshold**, so nobody adopts rung 5 at rung 1.
8. **Instrument what is generated.** The corpus's biggest gap, and the CLI's unique opportunity.
