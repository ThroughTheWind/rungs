# Extraction — `rift-forge`

> Surveyed 2026-08-14 against the working tree at `C:\Development\Repositories\rift-forge`.
> 3236 commits, 2026-07 → 2026-08, **401 branches, 51 live worktrees**. .NET 10 + Angular 22.
> **13 skills · 69 `.mjs` scripts · 137 npm scripts (42 `check:`, 27 `test:`, 26 `report:`, 6 `gen:`)
> · 16 specs · 25 ADRs · 102 live work items + 543 archived · 4 sprints · 91 findings ·
> `CLAUDE.md` at 1513 lines.** A deterministic League-of-Legends damage calculator.

**The one-line thesis:** *prose that has been broken becomes a gate.* Every mechanism here is a
response to a **measured** failure, and the repo's distinguishing move is that it treats a
repeated mistake as a defect in the instruction rather than in the agent.

This is the most advanced agentic setup of the four by a wide margin, and roughly half of what
the CLI should ship comes from here.

---

## 1. The setup

| Surface | What it holds |
| --- | --- |
| `CLAUDE.md` (1513 lines) | Canonical policy: design-system contract · engineering principles · repo conventions · **instruction hardening** · **working-rule propagation** · **shell editing** · id claiming · backlog & branches · current phase |
| `AGENTS.md` (28 lines) | Thin bridge → `CLAUDE.md`, with an explicit no-duplication rationale |
| `.claude/skills/*/SKILL.md` | **13 skills**, each with a `description:` that names its triggers *and its neighbours* |
| `.claude/settings.json` | `PreToolUse` hook on `Bash|PowerShell` → `check-shell-backticks.mjs` |
| `docs/backlog/` | `README.md` (481 lines, the delivery methodology) · `BACKLOG.md` board · `FINDINGS.md` (91) · `TEMPLATE.md` · `SPRINT-TEMPLATE.md` · `items/` (102) · `sprints/` (4) · `archive/` (543) |
| `docs/specs/`, `docs/decisions/` | 16 specs, 25 ADRs |
| `docs/engineering/` | Per-surface guides: backend · frontend · tool-ui-ux · testing · structure · ci |
| `docs/research/lol-mechanics/` | Sourced, patch-pinned external reference, **projected into the app** |
| `.github/scripts/` | 69 scripts: `check-*` gates, `gen-*` generators, `report-*`, plus `land.mjs`, `verify`, `preflight`, `session-start`, `claim-id`, `renumber-claims`, `backlog-archive` |
| `design-system/` | Mirror of an upstream Claude Design project, pulled by `/design-pull` |
| `.gitattributes` + `pnpm setup:git` | Custom merge drivers (`backlog`, `generated`) + `rerere` |

---

## 2. What works

### 2.1 Skills that route themselves — and name their neighbours

Thirteen skills, each `description:` written as trigger phrases in the user's voice, and — the
part no other repo does — **each names the adjacent skill and the boundary between them**:

> `/curate-mechanic`: "A game-wide re-check is `/mechanics-audit`; this skill executes one mechanic."
> `/curate-champion`: "One *mechanic* across champions is `/curate-mechanic`; a whole new game patch
> is `/patch-ingest`; this skill is one champion, whole kit."
> `/patch-ingest`: "A *product* version release is `/cut-release`, not this."

`CLAUDE.md` states the design: *"Each names its neighbours, so start with whichever the request
sounds like."* This is the fix for the real failure mode of a large skill set — not "no skill
fires" but "a plausible-but-wrong skill fires and runs to completion." Every skill is a
**correction surface**.

### 2.2 Instruction hardening as a standing, unprompted obligation

> *"A mistake an instruction could have prevented is a defect in the instruction, and repairing it
> is part of repairing the mistake. Do it in the same change, unprompted. Nobody will ask you to:
> a reviewer reads the fix, not the counterfactual."*

With a **mechanical trigger** — a table of five *shapes* (scoping work from a stale triage;
reading a proxy and reporting it as the fact; "correcting" a curated value toward a fresher feed;
shipping a measurement that cannot fail loudly; labelling rows by keyword guess when the row
stated its own action), each observed at least twice in one session, by an agent that had already
read the file. *"You do not have to notice you were careless; you have to notice a shape."*

And a **cost ladder** — pick the cheapest rung that holds:

1. a sentence **at the point of use**, not in a preamble
2. a row in the relevant **skill**
3. an entry in **`check-working-rules.mjs`** when cross-cutting
4. a **gate or hook**, when the rule has already been broken after being written down

With the escalation rule stated outright: *"if the rule already existed and you broke it anyway,
do not restate it — make it mechanical. A louder sentence in a file you have already read changes
nothing."*

**This is the most transferable idea in the entire corpus.** It is technology-independent,
domain-independent, and it is the mechanism by which the other three repos' unenforced prose
would have become enforceable.

### 2.3 The working-rule propagation gate

`check-working-rules.mjs` exists because of a measurement (2026-08-12, WI-635): **five repo-level
rules had changed and none had reached the files that teach them.** Four skills still told agents
to commit id claims to the candidate — *citing as authority the very document that had reversed
it*. Three still prescribed a republish path a gate can refuse.

The insight: **a working rule lives in more surfaces than its authority** — the authority doc,
`CLAUDE.md`, the skills that execute it, the tool that automates it, the operator's memory files.
So each cross-cutting rule is *declared* with its surfaces, and the check is mechanical: a surface
that **engages the topic** must carry the rule's current vocabulary and must not carry the retired
instruction.

Four rules follow, each independently portable:

1. **Fix the authority first, then the citers** — a citer corrected against a stale authority is a
   second wrong statement, and the next reader cannot tell which won.
2. **A citation is not propagation.** *"See the backlog README §3" ages into a false claim the
   moment §3 changes — and reads as verified precisely because it names a source.*
3. **Declare the rule in the gate.** One entry + its surfaces. What turns "we should remember" into
   a build failure.
4. **A tool that invalidates a generated artifact must say so in its own output.** Standing rule:
   *a green `check:` means "not yet regenerated", never "current".*

### 2.4 Two gate-design constraints, both learned by breaking them

Documented in the script's own header, and both generalize to every gate anyone writes:

- **Read the negation before the token.** The first draft banned the substring "commit the claim to
  the candidate" — which appears, correctly, inside *"do **not** commit the claim to the candidate"*
  in every file the fix had just repaired. *"A guard that also refuses the fix is one people
  disable."* So `forbids` patterns are checked against a preceding-context window for a negation cue.
- **An exemption must carry a reason.** `<!-- working-rule-ok: <rule-id> — why -->` is ignored
  unless a reason is stated: *"an escape hatch nobody has to justify is not an escape hatch, it is
  an off switch."*

Plus a third, from `--self-test`: *"a gate whose rules are all currently satisfied is
indistinguishable from a gate that matches nothing."* **27 `test:` scripts exist to test the 42
`check:` scripts.** Gates are treated as software.

### 2.5 Concurrent sessions on one shared candidate

The hardest problem here — dozens of sessions, separate worktrees, one integration branch, no
visibility into each other — and the tooling is the most sophisticated in the corpus:

| Tool | What it does |
| --- | --- |
| `pnpm session:start <branch>` | Cuts from `green/<candidate>` — *the last merge actually verified* — not the tip. Falls back and **says so** |
| `pnpm verify --fast` | Every dependency-free gate, ~30s. The constant loop |
| `pnpm preflight` | Did the candidate touch files *you* touched? That, not commit count, predicts a conflict |
| `pnpm land <branch>` | merge → verify **the merged tree** on a scratch `integ/` ref → fast-forward via compare-and-swap → move the green tag |
| `pnpm worktrees` | What is finished and prunable — *reports only*, never removes |

Four design decisions worth taking whole:

- **Failure attribution, not failure counting.** `verify` re-runs each failing gate against the
  merge base in a throwaway worktree and reports **inherited** (already red — stated, never
  blocking) or **INTRODUCED** (yours — blocks). Anything unattributable blocks: *"we do not land on
  an unknown."* The rationale is the point: *"a gate that is red for reasons you did not cause and
  cannot fix is a gate you learn to bypass, and a bypassed gate reports nothing."* Five gates were
  red on the tip the day it landed, so a gate without attribution would have been unusable on day one.
- **Land, then move the tip.** The candidate cannot go red from a merge nobody verified, because the
  ref update is unreachable otherwise; a refusal leaves the candidate bit-for-bit unchanged with the
  merged tree parked on `integ/` to fix.
- **Nothing keeps the candidate checked out.** Recorded as a *correction*: the first version held it
  checked out for a 15-minute verification and called that single-writer. It was **both** worse than
  useless — on 2026-08-06 every session sat in standby behind one land, *and* it did not prevent
  concurrency anyway, because switching to `integ/` releases the candidate mid-run (two `land.mjs`
  processes were measured running at once). Replaced by a real lock naming its holder and start
  time, taken over automatically if the holder died.
- **Do not `verify --full` before `land`.** Measured 2026-08-14: **three of five land attempts
  refused**, each after a 4–12 minute pre-verify, each on the same four generated artifacts — because
  *the candidate moves while the pre-verify runs*, widening the window the merge then conflicts in.
  A ritual that actively causes the failure it is meant to prevent.

### 2.6 Conflict classes, with the honest third row

| Class | Handling |
| --- | --- |
| **Id ledgers** (`BACKLOG.md`, `FINDINGS.md`, indexes) | `backlog` merge driver takes the higher `NEXT-*` counter, keeps both claim comments — and **resolves nothing else**, because `merge=union` on a moved board row keeps both copies |
| **Generated artifacts** (dataset, reports, `changelog-data.ts`) | `generated` driver **always refuses** and prints the regenerate command. Git interleaves two regenerations into something *neither* pipeline would emit |
| **Shared code** (`api.types.ts`, `SnapshotEngine.cs`) | **"Not a tooling problem — a scheduling one."** One owner at a time; batch same-surface items behind one session; `preflight` warns |

That third row is the most honest line in the corpus: the repo names the class it will *not*
automate and prescribes scheduling instead.

**Reconcile generated artifacts by regenerating, never by merging text** — take the candidate's
copy, re-run the producer, re-pin what moved with the reason at the pin.

### 2.7 Bookkeeping gates — the ones that mislead *agents*

Two `check:ids` rules aimed at a failure mode no other repo addresses: stale bookkeeping that a
future agent reads as a live constraint.

- **A document may not say it is waiting for work that has finished.** A spec saying a mechanic is
  "blocked on WI-081" reads as a live wall, and the next session plans around it. Measured:
  **95% of 474 rows** in one triage named a finished item as next owner — and those routes were then
  quoted in a code comment as evidence that an open item owned them. **The vocabulary was
  deliberately narrowed after measurement**: the first draft matched `until WI-###` and hit 29 lines
  that were true history in the repo's own voice, so `until` and `once … lands` were dropped, and
  past tense ("was blocked on") counts as a record rather than a claim.
- **An item whose branch is merged cannot still be on its way to review.** Measured 2026-08-13:
  **37 items** sat at `review` with their code already on the candidate; WI-271 sat `in_progress`
  for **eight days** after its own merge. The gate is **one-directional** — a merged branch with a
  pre-review status is always wrong; an unmerged one is not — and a genuinely phased item states why
  with `branch-merged-ok: <reason>`.

Both carry the same design signature: **measure first, then narrow the rule until it only fires on
the real thing.**

### 2.8 A number a machine can compute is not typed by a human

`check:boundary-claims` recomputes population counts in the spec section the press kit quotes;
`fix:boundary-claims` corrects the digits in place. **Seven of its eleven population claims were
false** when the gate first ran — because every wave that shrank the population left the sentence
alone. The section had said *"keep it current with the code"*, in bold, the whole time; that was the
fourth failure of the same instruction.

Two rules generalize past it, and the second is the mature one:

- A claim is probed only when the data settles it **without judgement** — *"a probe encoding a guess
  is a gate that is confidently wrong, which is worse than the typed number."*
- What the gate does **not** cover is **pinned**, so *green never reads as "verified."*

### 2.9 Findings separate from work items

`FINDINGS.md` (`F-###`, 91 of them) with a `/record-finding` skill: severity, priority, evidence,
when to act, how to fix, blockers. *"A finding is the observation, a `WI` is the decision."*

This is the object `hexguard` was missing under 268 audit reports, and it is why noticing something
out of scope has a cost near zero here.

### 2.10 Sprints that archive with their items

Closing a sprint moves it **and all its work items** to `archive/`, via `pnpm backlog:archive`,
which recomputes every link repo-wide (543 items already archived; `items/` holds only work that can
still change). `check:ids` indexes the archive, so archived ids still resolve and stay permanently
spent. **"Never edit an archived item: if archived work is wrong, that is a new item."**

### 2.11 Skills for operating workflows, not just development

`/patch-ingest` (external data pipeline) · `/cut-release` (version, tag, deploy branch, hotfix,
rollback) · `/triage-report` (inbound report → verdict + **the written reason the reporter is
owed** + repo-side consequence) · `/design-pull` + `/design-align` (external design system, pulled
down, every delta routed to a backlog item, a phase-gated future item, or an upstream change
request — *"never silent divergence"*) · `/sprint` · `/backlog-summary`.

Development is a minority of the skills. **Operating the product is where a skill set pays off**,
and no other repo in the corpus went there.

### 2.12 Smaller things worth taking verbatim

- **`AGENTS.md` as a 28-line bridge**, with the reason stated: *"keeping two large copies would let
  Codex and Claude silently drift"* — plus which file wins on disagreement.
- **Performance claims require a controlled comparison** — baseline command, ref, test count,
  environment, recorded before the change; contamination noted. *"Passing tests proves correctness,
  not a speedup."* If an uncontended comparison is impossible, leave the criterion open.
- **`claim:id` scans every ref, every ref *name*, and every worktree's live `docs/` including
  uncommitted files** — it caught a live collision within minutes of being written.
- **Flag gating is a required, non-deletable field** in the work-item template: name the flag or
  write *"none, because …"*. *"A blank line is an unfinished plan, exactly like blank acceptance
  criteria."*
- **CI at land time only** — item branches are deliberately not triggers, because one run costs
  ~19 billed minutes and one run per push across ~15 sessions is 400–1000 minutes/day.
- **Read the internal sourced reference before going external** — it is patch-pinned and routinely
  *ahead* of the implementation; WI-494 rediscovered from the wiki something the internal doc had
  described eight days earlier.

---

## 3. What doesn't

**`CLAUDE.md` is 1513 lines and every session reads all of it.** `AGENTS.md` insists on it: *"Read
`CLAUDE.md` in full. Do not replace it with a summary or read only the section that appears
relevant."* Correct given the content, and it is a large fixed cost on every session, in the one
repo that otherwise measures everything. `hexguard`'s `applyTo:` scoping is not used at all. The
irony is sharp: the repo with the most sophisticated instruction-propagation gate has the least
scoped instruction file.

**137 npm scripts and 69 `.mjs` files are their own onboarding surface.** 42 `check:` gates and 26
`report:` generators — the naming is disciplined (`check:` / `report:` / `gen:` / `test:`), but
there is no index of what each gate protects, and knowing which to run when is tacit.

**Gates are prose-and-regex, and the repo knows what that costs.** `check-working-rules` matches
*vocabulary*, so it detects a surface that dropped the current phrasing — not one that keeps the
phrasing and means something else. Two design constraints were learned by shipping guards that were
wrong in both directions. This is the right trade for documentation, and it is a ceiling.

**The candidate's CI was red enough to be uninformative.** *"11 of the last 15 runs failed"*, two
permanently-red jobs, and the doc says so: *"a pipeline with two permanently-red jobs carries little
information. Fix those two first."* Attribution is what makes that survivable — and attribution is
also what makes it tolerable to leave unfixed. **A mitigation that removes the pain of a broken
thing extends how long it stays broken.**

**51 live worktrees, 401 branches.** `pnpm worktrees` reports (62 of 90 were prunable when it
landed) but deliberately does not remove — *"removing someone else's worktree is not a script's
call."* Right, and the queue still grows. §4 says delete the branch on merge; **deleting it also
costs you the merged-branch status check**, so the two rules pull against each other.

**`.claude/worktrees/` contains full repository copies with their own `.claude/skills/`.** A
worktree's skill copy can be stale relative to the candidate, and `/backlog-summary` has an explicit
rule about it — *"always from the live candidate tip (worktree copies go stale)"* — which is a
documented workaround, not a fix.

**The failure catalogue is dense enough to be a source of stale claims itself.** `CLAUDE.md`
paragraphs carry measured counts (*"37 items"*, *"95% of 474 rows"*, *"seven of eleven"*) that were
true on their measurement date. They are the evidence that makes the rules persuasive; they are also
exactly the shape `check:boundary-claims` was built to catch, in the one file it does not check.

**Skill count is at the routing limit.** Thirteen skills with overlapping trigger vocabulary
(`/curate-mechanic` vs `/curate-champion` vs `/patch-ingest` vs `/mechanics-audit`) is why the
name-your-neighbours convention had to be invented. It works — and it is a patch over a taxonomy
that grew past what descriptions alone can disambiguate.

---

## 4. Pain points → how they were solved

| Pain | Response | Held? |
| --- | --- | --- |
| Same mistake repeated by agents that had read the rule | Instruction-hardening obligation + shape table + 4-rung cost ladder | **Yes** — the corpus's central pattern |
| Rules changed; the files that teach them did not | `check:working-rules` with declared rules × surfaces | **Yes** — after 5 rules × N surfaces went stale |
| Backticks in `node -e "…"` silently deleting doc text | Documented → broken 3 more times → **`PreToolUse` hook** that refuses the command | **Yes** — 6 occurrences, 6 repair passes, then a hook |
| A guard that also refuses its own fix | Negation-context window before matching `forbids` | **Yes** |
| An escape hatch becoming an off switch | Exemption markers ignored unless they state a reason | **Yes** |
| A gate that matches nothing looking identical to a passing gate | 27 `test:` scripts, `--self-test` over fixtures | **Yes** |
| Many sessions, one candidate, invisible to each other | `session:start` from `green/` · `preflight` · `land` with lock + CAS · `worktrees` | **Yes** — the corpus's hardest problem, solved |
| Red gates you did not cause teaching people to bypass | inherited / INTRODUCED attribution; unattributable blocks | **Yes** |
| Candidate going red from an unverified merge | Verify the *merged tree* on `integ/`, then fast-forward | **Yes** |
| Single-writer lock that blocked everyone and worked anyway | Replaced with an atomic lock naming its holder; candidate never checked out | **Yes** — recorded as a correction, with the measurement |
| Pre-`land` full verify causing the conflict it feared | Rule: `--fast` constantly, `land` at the boundary | **Yes** — 3 of 5 lands refused, measured |
| Generated artifacts merged as text into a file neither side would emit | `generated` merge driver **refuses**; regenerate instead | **Yes** |
| Two sessions claiming the same id | `claim:id` across refs, ref names, and worktrees + merge driver + `renumber-claims` + `check:ids` backstop | **Yes** — a human no longer does the mechanical part |
| Docs citing finished work as a live blocker | `check:ids` rule, vocabulary narrowed after 29 false positives | **Yes** |
| Status fields lying about landed work | One-directional merged-branch gate + `branch-merged-ok:` escape | **Yes** — 37 items caught |
| Hand-typed counts drifting from the data | `check:boundary-claims` + `fix:boundary-claims`; uncovered claims pinned | **Yes** — 7 of 11 were false |
| Out-of-scope observations lost or dumped in prose | `FINDINGS.md` + `/record-finding` | **Yes** — 91 findings |
| `items/` unreadable at 600+ items | Sprint close archives the sprint with its items; links recomputed | **Yes** — 543 archived, 102 live |
| Instruction file size | *(nothing)* | **No** — 1513 lines, read in full, every session |
| Worktree/branch accumulation | `worktrees` reports, never removes | **Partly** — 51 live |
| Candidate CI permanently red | Attribution makes it non-blocking | **Mitigated, not fixed** — and the mitigation reduces the pressure to fix |

---

## 5. How to improve it further

1. **Scope `CLAUDE.md`.** Split into a small always-loaded core (product, non-negotiables, routing)
   plus `applyTo:`-scoped guides — `hexguard`'s pattern, which this repo has not adopted. The
   engineering guides already exist under `docs/engineering/`; the entry file should route rather
   than restate.
2. **Point `check:boundary-claims` at `CLAUDE.md`'s own measured counts.** They are exactly the
   claim class the gate exists for, in the file every session trusts most. Or mark them as
   `measured YYYY-MM-DD` so age is visible at the point of reading.
3. **Generate a gate index** — gate → what it protects → when it runs (fast/full/CI) → its
   self-test. 42 `check:` scripts have no map.
4. **Fix the two permanently-red CI jobs, or delete them.** A red job that attribution has made
   painless is a job carrying no information at a real dollar cost.
5. **Resolve the branch-deletion conflict.** Deleting a merged branch is prescribed *and* costs the
   merged-branch check. Record the status at land time so the check no longer depends on the branch
   surviving.
6. **Add worktree ageing.** `worktrees` should not delete — but it can escalate: age, last commit,
   and a nag once a clean merged worktree passes N days.
7. **Consider consolidating the curation skills.** `/curate-mechanic` + `/curate-champion` are one
   skill with a scope parameter; the neighbour-naming convention is doing work a taxonomy could do.
8. **Make the skill copies in worktrees a symlink or a check**, rather than a documented "go to the
   live tip" workaround.

---

## 6. Extraction verdict — what the CLI takes

**Take, high confidence — this repo is roughly half the CLI's content:**

- `instruction-hardening` — the standing obligation, the shape table, the 4-rung cost ladder.
  **The single most valuable extraction in the corpus**
- `working-rule-propagation` — declared rule × surfaces gate; fix the authority first; *a citation
  is not propagation*; *a green check means "not yet regenerated"*
- `gate-design-rules` — read the negation before the token · exemptions must state a reason ·
  gates need self-tests · a gate matching nothing looks like a gate passing
- `computed-claims` — a number a machine can compute is never typed by a human; probe only what the
  data settles without judgement; **pin what the gate does not cover**
- `failure-attribution` — inherited vs. INTRODUCED; unattributable blocks; the bypass rationale
- `land-protocol` — verify the merged tree on a scratch ref, then CAS the integration branch; lock
  by lock, not by checkout; never `git merge` by hand
- `green-ref` — cut branches from the last *verified* merge, not the tip
- `preflight` — file-overlap prediction, not commit-count proxying
- `conflict-classes` — ledger / generated / shared-code, with *"the third is scheduling, not tooling"*
- `generated-artifact-driver` — refuse the merge, print the regenerate command
- `id-claiming` — scan every ref, ref name, and worktree including uncommitted files
- `findings-log` — `F-###` separate from `WI-###`; *observation vs. decision*
- `work-item-lifecycle` — 8 statuses, the propose→decide→plan→execute→review workflow, the template
  with **required non-deletable fields** (flag gating, acceptance criteria, out-of-scope)
- `sprint-archive` — closing archives the sprint *with* its items; links recomputed; ids stay spent;
  archived items are never edited
- `bookkeeping-gates` — no doc waiting on finished work · no merged branch in a pre-review status ·
  one-directional, with a reasoned escape hatch
- `skill-neighbours` — every skill names the adjacent ones and the boundary
- `operating-skills` — release, external-data ingest, inbound triage, design sync. Not just dev
- `agents-md-bridge` — thin bridge, stated rationale, named tie-breaker
- `shell-editing-hook` — script files not `-e` strings; `&&` not `;`; and the `PreToolUse` guard
- `controlled-performance-comparison` — baseline recorded before, or the criterion stays open
- `ci-at-land-time` — cost-aware trigger placement, with the arithmetic stated

**Take as a warning:**

- **A large instruction file is a fixed cost on every session.** The CLI's generated entry doc must
  have a size budget and route to scoped guides. This repo is the proof by counter-example.
- **A mitigation can extend an outage.** Attribution made red CI painless and it stayed red. Any
  module that ships a "known-broken is non-blocking" affordance must also ship the ageing signal.
- **A skill taxonomy has a routing limit** somewhere around a dozen overlapping skills; past it,
  descriptions alone stop disambiguating.
- **Measured counts inside instruction prose are the same claim class the repo gates elsewhere.**
  If the CLI generates evidence-carrying instructions, it must date them.

**Leave:**

- Full repository copies as worktrees carrying their own skill copies
