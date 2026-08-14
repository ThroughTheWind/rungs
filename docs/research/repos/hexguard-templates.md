# Extraction — `hexguard-templates`

> Surveyed 2026-08-14 against the working tree at `C:\Development\Repositories\hexguard-templates`.
> 319 commits, 2026-07, 3 branches. Angular 22 + .NET 10 reference applications.
> **8 specs · 20 plan docs · 7 instruction files · 7 audits.** Consumes packages from the sibling
> `hexguard` repo via `file:` and `ProjectReference`.

**The one-line thesis:** *the decision is the deliverable.* Where the other three repos tell an
agent how to execute, this one tells it how to **choose** — and writes the choice procedure down
as a table so "use judgment" never appears.

---

## 1. The setup

| Surface | What it holds |
| --- | --- |
| `AGENTS.md` | 98 lines: repo map · cross-repo consumption table · build/test · **7 numbered core rules** · 8 UI/motion rules · reference table · (empty) prompts table |
| `docs/specs/` | 8 specs across `foundation/` · `auth-service/` · `platform/` · `blueprints/{dashboard,saas-starter,cms-blog,ecommerce,wiki}/`, indexed with per-spec status |
| `docs/specs/README.md` | Spec conventions: frontmatter · stable ids · per-story status · mandatory scope section · split threshold · **"Demo ≠ done"** · a section on how to propose new cross-cutting scope |
| `.github/instructions/story-implementation-workflow.instructions.md` | **The 9-step spec→closure workflow.** The repo's centerpiece |
| `.github/instructions/package-catalog.instructions.md` | Which `hexguard` package covers which need |
| `.github/instructions/design-system-alignment.instructions.md` | Conformance against the Claude Design project via the `claude_design` MCP |
| `docs/.ai/backlog/plan-*.md` | 20 plan docs in two templates (light / heavy), archived on completion |
| `docs/adoption-guide.md` | What is yours to change vs. platform-owned, for someone starting a product here |

---

## 2. What works

**The four-way decision table is the best reuse-governance artifact in the corpus.** For every
technical concern in a story: *use as-is* · *extend locally* · *extend upstream* · *hand-roll* —
each row carrying criteria **and** where the work lands. In a two-repo split where the wrong
answer means either a duplicated primitive or a premature package, this is the whole game, and
it is decidable rather than tasteful.

**The second-consumer threshold makes "when to extract" mechanical.** Hand-roll once; on the
*second* consumer, stop and propose upstream. Stated with two prior applications cited as
precedent, and with the negative form spelled out — *"do not build a second, templates-local
copy"* once crossed. Compare `hexguard`'s prose version (*"do not create a dedicated motion
package unless two real consumers prove a stable headless API"*): same rule, and here it is
generalized out of one package's context into a repo-wide procedure.

**Documentation tier selection, explicitly framed as a replacement for judgment.** The doc says
*"Use this table instead of 'use judgment'"*, then gives Tier 0 (no doc, implement directly) ·
Tier 1 (light plan, fixed section list) · Tier 2 (heavy proposal, fixed section list), plus four
concrete bump triggers. **Tier 0 existing is what makes the other tiers credible** — a process
that always demands a document is one agents route around, and one that never does is one that
loses its reasoning.

**Steps 2–4 loop per *concern*, not per story.** Stated explicitly: *"a story with four distinct
technical concerns runs that loop four times."* The most common decomposition failure is
resolving a story against one package and calling it planned; this makes the unit of decision the
concern.

**Multi-story batching produces one combined concern table.** So a concern shared by two stories
is caught once. This is scheduling awareness inside a planning workflow — the same insight
`rift-forge` reaches from the other direction with `preflight` (*"give a hot surface one owner at
a time"*).

**The steps are numbered so other docs can cite them.** *"Other docs may cite these by number
(e.g. 'workflow Step 4') the way `plan-rich-text-editor-ui-integration.md` already does."*
Stable addressing for a procedure. Cheap, and it is what lets a plan doc say *"resolved at Step
4 as extend-local"* instead of restating the reasoning.

**Spec conventions with per-story status and a hard honesty rule.** Stable ids (`FOUND-F13`,
`FOUND-US-110`) referenced from commits, PRs, and plans; status per feature/story (✅ 🟡 ⬜) not
per file; mandatory scope section *"so agents don't silently expand a surface while implementing
an unrelated story"*. And **"Demo ≠ done"**: an endpoint that exists to showcase a package is
🟡 with a note, never ✅ — *"a spec that overclaims integration is worse than no spec."* That is
an anti-sycophancy rule aimed at the artifact rather than the conversation, and it is the only
one of its kind in the corpus.

**"Split only past ~600 lines — don't pre-split."** A threshold instead of a preference, which is
what stops an agent from creating structure ahead of content.

**The reference implementation *is* an instruction.** Core rule 2: *"The foundation template is
the reference implementation… When in doubt, look there first."* Backed by a reference table
pointing at exact directories for "correct package consumption patterns". Cheaper than writing
the rules down and cannot drift from the code, because it *is* the code.

**Package-catalog-first is rule 1, above everything else.** *"Always use a HexGuard package
before hand-rolling"* with a catalog file to check. The agent default — implement it — is
overridden at the top of the file.

**Design-system alignment is a named, routed workflow with an external source of truth.** Rule 7
routes any "match the design/mock" request to the `claude_design` MCP and a specific Claude
Design project, and bounds it: *"the project is layout/visual guidance, not a functional spec,
and its output must still satisfy this repo's technical constraints."* An external authority with
an explicit precedence rule against the repo's own constraints. `rift-forge` industrializes this
same integration into `/design-pull` + `/design-align`.

**`docs/adoption-guide.md`** — what is yours vs. platform-owned, for a consumer starting here. A
template repo that does not answer that question produces forks nobody can upgrade.

---

## 3. What doesn't

**The workflow is excellent and unreachable.** It lives in a file attached by `applyTo:` glob —
so it is loaded when you edit a matching file, which is *after* you have decided what to do. The
custom-prompts table in `AGENTS.md` reads, verbatim: *"(No custom prompts or agents defined yet
for this repo. This table is a placeholder for future additions.)"* Nine steps of genuinely good
decision procedure with **no invocation surface at all**. `/implement-story FOUND-US-110` is a
one-hour change and is the single highest-value improvement available to this repo.

**`AGENTS.md`'s repo map has 5 duplicated entries** (lines 8–13 repeat as 15–22:
`angular-components`, `angular-foundation`, `blueprint-auth-admin`, `auth-service`,
`auth-service.tests`, `docker/`). A hand-maintained list that grew by paste. Minor as a bug,
sharp as evidence: **the repo whose spec conventions forbid restating scope has a duplicated
scope list in its entry-point file** — nothing checks the file every session reads first.

**No work-item ids, no status lifecycle, no branch mapping.** Stories have ids (`FOUND-US-110`)
and specs track ✅/🟡/⬜, so *scope* is tracked — but there is no object with an owner, a status
transition, or a branch. Three branches on 319 commits says trunk-based; the 20 plan docs are
where in-flight state lives, and a plan doc has no status field. Which story is being worked on
right now is not recorded anywhere.

**Two plan templates, described in a table, not enforced.** Tier 1 and Tier 2 section lists are
given as prose in the tier table with example files to imitate. No template file, no check. With
20 plans, drift is invisible.

**Spec status is hand-maintained against implementation.** ✅/🟡/⬜ per story, updated at Step 9
(Closure). Nothing verifies the mark — and *"Demo ≠ done"* exists precisely because overclaiming
already happened. The rule is right; it needs a gate more than it needs a sentence.

**Cross-repo dependency is `file:` paths and relative `ProjectReference`s** four levels up
(`../../../../hexguard/angular/dist/angular-{name}`). Requires both repos cloned as siblings at a
fixed depth, and a `dist/` build present. Nothing checks either precondition; the failure is a
resolve error at install time. The two-repo split is a real architectural decision, and its
tooling never caught up with it.

**Same enforcement gap as its sibling.** Seven core rules and eight UI/motion rules —
never-`any`, SSR-safety, CDK-not-Material, reduced-motion fallbacks — all review-only. Several
are lintable. `platform/spec.md`'s own status line says *"stable, enforcement gaps noted"*: the
repo knows.

**`docs/.ai/audits/` has 7 files here vs. 268 in the sibling.** The audit practice did not
transfer with the instruction style, and there is no rollup here either.

---

## 4. Pain points → how they were solved

| Pain | Response | Held? |
| --- | --- | --- |
| Agents hand-rolling what a package already provides | Core rule 1 + `package-catalog.instructions.md` + Step 3 catalog lookup | **Yes** |
| "Should this be local or upstream?" answered ad hoc | Four-way decision table with criteria + landing site | **Yes** — corpus best |
| Premature package extraction / duplicated primitives | Second-consumer threshold, with cited precedents | **Yes** |
| Planning overhead on trivial work; lost reasoning on big work | 3-tier documentation selection + explicit bump triggers | **Yes** |
| Story planned against one concern, others discovered late | Steps 2–4 loop **per concern** | **Yes** |
| Same concern re-solved across sibling stories | Multi-story batching into one combined concern table | **Yes** |
| Scope silently expanding during unrelated work | Mandatory Scope/out-of-scope section in every spec | **Yes** |
| Specs overclaiming completion | Per-story status + **"Demo ≠ done"** | **Partly** — stated, not gated |
| "What may I change?" for template consumers | `docs/adoption-guide.md` | **Yes** |
| Matching an external design system | Rule 7 → `claude_design` MCP + precedence bound | **Yes** |
| Knowing what is in flight right now | *(nothing)* | **No** |
| Reaching the 9-step workflow at the right moment | *(nothing — placeholder table)* | **No** |

---

## 5. How to improve it further

1. **Ship `/implement-story <ID>` as a skill or prompt.** The content exists and is finished; it
   lacks an entry point. Fill the placeholder table. Highest leverage available here by a wide margin.
2. **Add work items with ids, status, and branch mapping** so "in flight" is a fact rather than
   an inference from open plan docs.
3. **Turn the two plan tiers into template files** (`plan-light.md`, `plan-heavy.md`) and have
   Step 5 copy one.
4. **Gate spec status.** At minimum: a ✅ story must name the commit/PR that closed it; a 🟡 must
   carry its note. Turns *"Demo ≠ done"* from a norm into a check.
5. **Generate the `AGENTS.md` repo map** from the workspace — the duplicated block is the
   argument, not a bug report.
6. **Check the cross-repo preconditions**: a `pnpm doctor` that verifies the sibling clone,
   the expected depth, and the presence of `dist/`. Currently a build-time surprise.
7. **Lint the lintable rules**: `no-explicit-any`, restricted globals for SSR safety, a
   dependency check for Angular Material. `platform/spec.md` already admits the gap.
8. **Add a findings register** so an audit or a noticed problem has somewhere to land that is not
   a plan doc.

---

## 6. Extraction verdict — what the CLI takes

**Take, high confidence:**

- `reuse-decision-table` — use-as-is / extend-local / extend-upstream / hand-roll, with criteria
  and landing site. **The primary extraction from this repo**, and it generalizes to any
  library-plus-consumer topology
- `second-consumer-threshold` — hand-roll once, extract on the second consumer; the negative form
  stated too
- `doc-tier-selection` — Tier 0/1/2 with bump triggers, framed as replacing judgment. **Tier 0
  must exist**
- `per-concern-decomposition` — the decide loop runs per concern, not per story
- `numbered-workflow-steps` — steps numbered so other documents can cite them by number
- `spec-ids-and-status` — `<PREFIX>-F##` / `<PREFIX>-US-###`, per-story status, mandatory scope
  section, split-past-N-lines threshold
- `demo-not-done` — the artifact-level honesty rule. Ships as a generated spec convention
- `reference-implementation-pointer` — name the directory that demonstrates the correct pattern
- `adoption-guide` — yours vs. platform-owned, for any repo meant to be started *from*
- `external-design-authority` — route design-conformance work to a named external source, bounded
  by the repo's own technical constraints

**Take as a warning:**

- **A workflow with no invocation surface does not run.** The CLI must not generate a procedure
  document without generating its entry point in the same step. `AGENTS.md`'s
  *"placeholder for future additions"* is the corpus's clearest statement of this failure.
- **Scope tracking is not work tracking.** Specs answer *what is in scope*; they cannot answer
  *what is happening*. `specs` and `backlog` are different modules and neither substitutes.
- **A hand-maintained list in the always-loaded file drifts** — including in a repo whose
  conventions forbid exactly that.

**Leave:**

- Plan templates described in prose rather than shipped as files
- Relative-path cross-repo dependencies without a precondition check
