# Extraction — `hexguard`

> Surveyed 2026-08-14 against the working tree at `C:\Development\Repositories\hexguard`.
> 507 commits, 2026-06 → 2026-07, 6 branches. Angular 22 + .NET 10 + Blazor monorepo.
> **105 Angular packages · 39 .NET projects · 117 package docs · 268 audit reports · 99 CI workflows.**
> A publishable component/utility library catalog.

**The one-line thesis:** *scale the agent by scoping the instruction to the file being edited.*
A package factory, driven by path-scoped instruction files and mandatory phase checklists.

---

## 1. The setup

| Surface | What it holds |
| --- | --- |
| `AGENTS.md` | 76 lines: repo map · build/test matrix · conventions · prompt/agent table · references |
| `.github/instructions/*.instructions.md` | **7 path-scoped instruction files**, each with `description:` + `applyTo:` glob frontmatter — auto-attached by the harness when a matching file is edited |
| `.github/prompts/*.prompt.md` | 3 invocable slash commands: `/find-package-ideas`, `/assess-package-readiness`, `/plan-package-development` |
| `.github/agents/*.agent.md` | 1 custom agent: **Package Development Planner** |
| `docs/.ai/README.md` | The AI operating model: workflow files · task loop · **validation matrix** · prompt routing · when to update the backlog |
| `docs/.ai/backlog/` | Split into `angular/` · `dotnet/` · `cross-stack/` spaces, plus standalone briefs |
| `docs/.ai/audits/` | **268 dated audit reports** (`angular-cache-critical-audit-2026-07-10.md`) |
| `docs/.ai/decisions/` | 4 numbered workflow decisions (`0001-separate-angular-and-dotnet-spaces.md`) |
| `docs/strategy/` | Adopted strategy docs (SSR/PWA strategy + phased execution plan) |
| `.github/workflows/` | `ci.yml` + **98 per-package release workflows** |

---

## 2. What works

**`applyTo:` globs are the right answer to instruction bloat, and this is the corpus's proof.**
Seven files instead of one, each attached only when a matching path is touched:
`angular/packages/**` gets library rules; `angular/packages/angular-{ssr-config,hydration,sitemap,pwa}/**`
additionally gets SSR-safety rules; the demo app gets Playwright-selector rules. An agent editing
a doc never loads the SSR rules. `axiom-mesh` put all of this in one 350-line file, and
`rift-forge` put it in a 1513-line one — this is the only repo of the four that solved it.

**The `description:` field is doing routing work, not decoration.** Each begins with *"Use
when…"* and names concrete triggers. That is the same contract as a skill's `description:`, two
harnesses apart — strong evidence that "when does this apply" belongs *in* the instruction rather
than in a table elsewhere.

**The validation matrix maps change-surface → exact commands.**

> library change: `pnpm test:lib`, `pnpm build:lib`
> demo change: `pnpm test:app`, `pnpm test:e2e`, `pnpm build:demo`
> repo-wide: `pnpm format:check`, `pnpm lint`, `pnpm test:ci`, `pnpm build`

Four lines that remove the most common agent failure in a large monorepo — running the whole
suite (slow, so it gets skipped) or the wrong subset (fast, and proves nothing). Cheap to write,
and no other repo in the corpus states it this crisply.

**The phase checklist as a mandatory ordered workflow.** `new-package-workflow.instructions.md`
is 8 phases — scaffold/registration → implementation → tests → build+CI → demo → catalog
registration → release artifacts → **assessment gate** — each with concrete file-level steps
("place the entry alphabetically among existing projects"). The repeatability shows: 105 Angular
packages with consistent shape. **Phase 5 (catalog registration) and Phase 6 (release artifacts)
are the ones that matter** — they are the steps a human skips, and skipping them is what leaves a
package unfindable and unpublishable.

**The narrowest-anchor task loop.** *"Start from the narrowest concrete anchor: file, symbol,
failing test, route, or package"* → read the scoped instruction → smallest change that
proves/disproves → narrowest validation → update docs. Five steps, and the ordering is the
lesson: choose the anchor *before* reading instructions, so instruction selection is a
consequence of scope rather than a guess.

**A three-verb lifecycle with a prompt behind each verb.** Find (`/find-package-ideas` → briefs)
→ Plan (`/plan-package-development` → implementation plan) → Assess (`/assess-package-readiness`
→ audit report). Each **writes a durable artifact to a known directory**. That is what makes a
prompt library compound instead of evaporating into chat scrollback — and it is exactly the
mechanism `axiom-mesh`'s 21 playbooks lack.

**Backlog split by stack space** (`angular/` · `dotnet/` · `cross-stack/`), with a numbered
decision explaining why (`0001-separate-angular-and-dotnet-spaces.md`). A workflow decision
recorded as an ADR-shaped artifact — the practice generalizes past architecture.

**Cross-repo references are explicit and bidirectional.** `AGENTS.md` names
`hexguard-templates/docs/.ai/backlog/plan-template-ui-system-roadmap.md` as the shared
constraint doc; the sibling repo names back. Crude — two files agreeing by hand — but it is the
only cross-repo mechanism in the corpus and the two-repo split is real.

**Negative conventions are stated as strongly as positive ones.** *"Use Angular CDK as
infrastructure only; do not adopt Angular Material components or themes"*, *"do not create a
dedicated motion package unless two real consumers prove a stable headless API"*. Prohibitions
with thresholds. An agent's default is to add a thing; these say when not to, and what evidence
would change the answer.

---

## 3. What doesn't

**98 per-package release workflows is the repo's defining scaling failure.** One
`release-angular-<name>.yml` per package, near-identical, hand-maintained. A change to release
policy is a 98-file edit, and the `.github/workflows/` listing is unreadable — 99 files, 98 of
them noise. A matrix workflow or a single reusable workflow with a package input was the answer,
and the phase checklist *institutionalized* the wrong one: Phase 3 tells the agent to create
another. **This is the sharpest lesson in the corpus about generated-by-checklist scaffolding —
a checklist step that emits a file emits N files, and nobody notices until N is large.**

**268 audit reports for ~144 packages, and no aggregate state.** Two audit waves (readiness
2026-06/07, then "critical" 2026-07-10) produced a per-package report each, plus
`GLOBAL-PACKAGE-AUDIT-2026-07-10.md`, a triage doc, and an
`ISSUE-RESOLUTION-METHODOLOGY-2026-07-10.md`. There is **no rollup that says which findings are
still open.** To know the current state of the catalog you read 268 files. The audit *prompt* was
good enough to run 268 times; the missing piece is that an audit's output should be rows in one
register (`axiom-mesh`'s `AD-###` shape), not a document per subject.

**No work-item or ticket system at all.** `docs/.ai/backlog.md` plus briefs in `backlog/` — no
ids, no status field, no lifecycle, no branch mapping. With 6 branches and 507 commits on
essentially trunk-based flow this was survivable, but audit findings had nowhere to *become*
tracked work. That is the structural reason 268 audits produced no closure: **there was no object
for a finding to turn into.**

**Instruction files carry no lifecycle for their own accuracy.** They describe workspace
registration, CI wiring, and release steps — all things that changed as the repo grew. Nothing
detects an instruction that has gone stale. (`rift-forge`'s `check:working-rules` is the answer,
and it was built after measuring exactly this failure.)

**`docs/packages/` has 117 files against 105 Angular + 39 .NET packages.** The counts do not
reconcile, and nothing checks that they should. A generated index would have made the gap
visible; a hand-maintained tree makes it invisible.

**The custom agent is a single generalist planner.** *Package Development Planner*, covering API
design → phases → tests → docs → demo → release. It works because packages are homogeneous, but
it is one agent for the repo's entire creation path, with no equivalent for modification,
deprecation, or cross-stack pairing. `library-modification-workflow.instructions.md` exists but
has no invocable counterpart.

**No hooks, no gates beyond `ci.yml`.** No `PreToolUse` guards, no repo-specific checks. Every
convention in `AGENTS.md` — SSR safety, no-Material, `data-testid` hooks, dependency-freedom of
`angular-url-state` — is enforced by review only. SSR safety in particular (*"guard all browser
API access with `isPlatformBrowser()`; never use `globalThis.location` in package code"*) is
mechanically checkable by a lint rule, and stated three times across two repos instead.

**`memories/` contains one shell script.** A directory that was going to be something.

---

## 4. Pain points → how they were solved

| Pain | Response | Held? |
| --- | --- | --- |
| One instruction file too large / irrelevant to most edits | 7 files with `applyTo:` globs + `description:` routing | **Yes** — the corpus's best answer to instruction bloat |
| Agent runs whole suite or wrong subset | Validation matrix: change-surface → exact commands | **Yes** — 4 lines, high leverage |
| 105 packages drifting in shape | Mandatory ordered 8-phase checklist with an assessment gate | **Yes for shape** — and it is also what propagated the 98-workflow problem |
| New package ideas ad hoc | `/find-package-ideas` → durable briefs in `docs/.ai/backlog/` | **Yes** |
| Unknown production readiness | `/assess-package-readiness` → 9-criterion audit → report | **Partly** — 268 reports produced, no open/closed state |
| Planning quality inconsistent | Package Development Planner custom agent | **Yes**, within its one lane |
| Angular vs .NET backlogs interleaving | Split spaces + decision `0001` | **Yes** |
| Release process per package | A workflow file per package | **No — this is the anti-pattern.** 98 near-identical files |
| Findings needing to become work | *(nothing)* | **No** — no work-item object exists |

---

## 5. How to improve it further

1. **Collapse 98 release workflows into one reusable workflow + a matrix.** Highest-value change
   in the repo. Then fix Phase 3 of the checklist so it stops emitting new ones.
2. **Replace per-package audit documents with one findings register.** `axiom-mesh`'s `AD-###`
   shape: id · severity · package · evidence · status. Keep the audit *prompt*; change its output
   from a document to rows. 268 files collapse to one board plus history.
3. **Add a minimal work-item system** so an audit finding can become tracked work with an id, a
   status, and a branch. Without it the assess step is a generator of unactioned prose — which is
   precisely what the 268 files are.
4. **Make SSR safety a lint rule.** `no-restricted-globals` for `window`/`document`/`localStorage`
   in `angular/packages/**` with an `isPlatformBrowser` escape. The rule is stated in `AGENTS.md`,
   in `ssr-pwa.instructions.md`, and again in the sibling repo — three prose statements, zero
   gates. Same for the no-Angular-Material rule (a dependency check).
5. **Generate `docs/packages/` index and the `AGENTS.md` repo map** from the workspace, with a
   gate that they match. Both are lists of things the filesystem already knows.
6. **Add an instruction-accuracy gate.** Even a weak one: assert that paths named in
   `.github/instructions/**` still exist. Most staleness in a fast-moving monorepo is a moved path.
7. **Add `/deprecate-package` and `/modify-package`** to complete the lifecycle beyond creation.
8. **Adopt `CLAUDE.md` + `AGENTS.md` bridge** so the harness-specific content stops being
   Copilot-only.

---

## 6. Extraction verdict — what the CLI takes

**Take, high confidence:**

- `scoped-instructions` — `applyTo:` glob + `description:` routing frontmatter. **The primary
  extraction from this repo**, and the mechanism that makes a large instruction set survivable
- `validation-matrix` — change-surface → exact commands, in the always-loaded entry doc
- `narrowest-anchor-loop` — anchor → scoped instruction → smallest change → narrowest validation → docs
- `phase-checklist` — ordered mandatory workflow with a final assessment gate, for repeated
  creation work (new package / new service / new connector)
- `prompt-writes-artifact` — every prompt lands a durable file in a known directory. The rule
  that makes a prompt library compound
- `lifecycle-verbs` — find → plan → assess, one invocable prompt each
- `negative-conventions` — prohibitions with the evidence threshold that would reverse them
- `backlog-spaces` — split the backlog by stack/domain when a monorepo carries more than one

**Take as a warning:**

- **A checklist step that creates a file creates N files.** Any CLI-generated checklist that
  emits per-item CI config must emit a *matrix entry*, and the `gates` module should ship a
  workflow-count check.
- **An audit prompt without a findings register produces unactioned prose.** The CLI must not
  offer an `audit` module without a `findings` module — declare the dependency.
- **A repo with no work-item object cannot close anything it discovers.** `backlog` is a base
  module, not an advanced one.

**Leave:**

- Per-package release workflows
- Per-subject audit documents as the primary output form
