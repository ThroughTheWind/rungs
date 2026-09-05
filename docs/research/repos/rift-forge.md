# Extraction — `rift-forge`

> **Refreshed 2026-08-15** against local `candidate/0.1.0` at
> `4a51848cfc9a2acbcdeddcd028418572406e2950` in the temporary worktree
> `C:\Development\Repositories\rift-forge-wi030-candidate`; the source checkout is
> `C:\Development\Repositories\rift-forge` (detached at `472d45ed`). The local candidate is the
> authority requested for this refresh: `origin/candidate/0.1.0` still points to
> `159f9f030c32df6828c16b3637ae572513d34d4e`.
> **3,585 commits, 2026-07-29 → 2026-08-15, 433 branches, 105 registered worktrees**
> (.NET 10 + Angular 22). `pnpm worktrees` measured 80 prunable, 16 merged-but-dirty, and 13 dirty
> worktrees untouched for 10+ days (oldest 12 days).
> **14 skills · 85 `.mjs` scripts · 181 npm scripts (58 `check:`, 46 `test:`, 30 `report:`, 7 `gen:`)
> · 16 specs · 25 ADRs · 163 live work items + 537 archived · 3 active + 2 archived sprints ·
> 74 open finding rows + 200 archived finding sections · `CLAUDE.md` at 555 lines.**
> The candidate has no root `LICENSE`, `LICENCE`, `COPYING`, or `NOTICE` file and no `license` field in
> `package.json`; the project's licence is **not established from this checkout**. A deterministic
> League-of-Legends damage calculator.

The headline inventory above was recomputed on 2026-08-15 with the following read-only commands from
the candidate worktree (counts are not copied from the earlier survey):

```text
git rev-parse candidate/0.1.0
git rev-list --count candidate/0.1.0
git log candidate/0.1.0 --reverse --format='%aI' | Select-Object -First 1
git for-each-ref refs/heads --format='%(refname)' | Measure-Object
git worktree list --porcelain | Select-String '^worktree ' | Measure-Object
Get-ChildItem .claude/skills -Directory | Measure-Object
Get-ChildItem .github/scripts -Filter '*.mjs' | Measure-Object
node -e "const a=Object.keys(require('./package.json').scripts||{}); console.log(a.length,a.filter(x=>x.startsWith('check:')).length,a.filter(x=>x.startsWith('test:')).length,a.filter(x=>x.startsWith('report:')).length,a.filter(x=>x.startsWith('gen:')).length)"
Get-ChildItem docs/backlog/items -Recurse -Filter 'WI-*.md' | Measure-Object
Get-ChildItem docs/backlog/archive -Recurse -Filter 'WI-*.md' | Measure-Object
node .github/scripts/check-ids.mjs
node .github/scripts/worktrees.mjs
Get-Content CLAUDE.md | Measure-Object -Line
Get-Content PROJECT-STATE.md | Measure-Object -Line
rg '^\| \[F-\d+\]' docs/backlog/FINDINGS.md | Measure-Object
rg '^### F-\d+' docs/backlog/findings -g '*.md' | Measure-Object
```

The `check-ids` and `worktrees.mjs` commands are especially important: `check-ids` reported 700 work items (163 live,
537 archived), 25 ADRs, 5 sprints, no duplicates or dangling citations; `worktrees.mjs` reports the
registered/prunable/dirty split above. The findings counts use `rg '^\| \[F-\d+\]' docs/backlog/FINDINGS.md`
and `rg '^### F-\d+' docs/backlog/findings -g '*.md'`, so “open rows” and “archived sections” are
not conflated with the old survey's single “findings” number.

**The one-line thesis:** *prose that has been broken becomes a gate.* Every mechanism here is a
response to a **measured** failure, and the repo's distinguishing move is that it treats a
repeated mistake as a defect in the instruction rather than in the agent.

This is the most advanced agentic setup of the four by a wide margin, and roughly half of what
the CLI should ship comes from here.

---

## 1. The setup

| Surface | What it holds |
| --- | --- |
| `CLAUDE.md` (555 lines) | Canonical policy: design-system contract · engineering principles · repo conventions · **instruction hardening** · **working-rule propagation** · **shell editing** · id claiming · backlog & branches · current phase routing; shipped-history moved to the on-demand `PROJECT-STATE.md` (1,223 lines) |
| `AGENTS.md` (35 lines) | Thin bridge → `CLAUDE.md`, with an explicit no-duplication rationale |
| `.claude/skills/*/SKILL.md` | **14 skills**, each with a `description:` that names its triggers *and its neighbours* |
| `.claude/settings.json` | `PreToolUse` hook on `Bash|PowerShell` → `check-shell-backticks.mjs` |
| `docs/backlog/` | `README.md` (567 lines, the delivery methodology) · `BACKLOG.md` board · `FINDINGS.md` (74 open rows) · `TEMPLATE.md` · `SPRINT-TEMPLATE.md` · `items/` (163) · `sprints/` (3 active + 2 archived) · `archive/` (537 work items) |
| `docs/specs/`, `docs/decisions/` | 16 specs, 25 ADRs |
| `docs/engineering/` | Per-surface guides: backend · frontend · tool-ui-ux · testing · structure · ci |
| `docs/research/lol-mechanics/` | Sourced, patch-pinned external reference, **projected into the app** |
| `.github/scripts/` | 85 scripts: `check-*` gates, `gen-*` generators, `report-*`, plus `land.mjs`, `verify`, `preflight`, `session-start`, `claim-id`, `renumber-claims`, `backlog-archive` |
| `design-system/` | Mirror of an upstream Claude Design project, pulled by `/design-pull` |
| `.gitattributes` + `pnpm setup:git` | Custom merge drivers (`backlog`, `generated`) + `rerere` |

---

## 2. What works

### 2.1 Skills that route themselves — and name their neighbours

Fourteen skills, each `description:` written as trigger phrases in the user's voice, and — the
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
indistinguishable from a gate that matches nothing."* **46 `test:` scripts exist beside 58
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
  "blocked on a finished work item" reads as a live wall, and the next session plans around it. Measured:
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

`FINDINGS.md` (`F-###`, 74 open rows, with 200 archived detail sections measured 2026-08-15) with
a `/record-finding` skill: severity, priority, evidence, when to act, how to fix, blockers.
*"A finding is the observation, a `WI` is the decision."* The new `check:finding-closure` gate catches
the narrower contradiction where an open detail section declares itself fixed; it does not infer code
closure.

This is the object `hexguard` was missing under 268 audit reports, and it is why noticing something
out of scope has a cost near zero here.

### 2.10 Sprints that archive with their items

Closing a sprint moves it **and all its work items** to `archive/`, via `pnpm backlog:archive`,
which recomputes every link repo-wide (537 items archived; 163 live items remain in `items/`, measured
2026-08-15). `check:ids` indexes the archive, so archived ids still resolve and stay permanently
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

- **`AGENTS.md` as a 35-line bridge**, with the reason stated: *"keeping two large copies would let
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

### 2.13 What changed on the candidate after the prior survey

The local candidate is 66 commits beyond the detached source checkout used as the comparison anchor.
The changes alter the workflow extraction, not just the product data:

| Change | Evidence | Research consequence |
| --- | --- | --- |
| Current-phase history moved out of the always-loaded instruction file | `2eddf18f` (`docs(wi-829): the record leaves the instruction file`); `PROJECT-STATE.md`; `CLAUDE.md` is now 555 lines and the record is 1,223 lines | The old “1,513-line instruction file” is a **historical pre-split measurement**. The current pain is a 555-line unscoped core plus a large on-demand record, a partial fix rather than no fix. |
| `land` now judges the status of the merge it is about to create, sharing the predicate with `check:ids` | `f9f26580`; `.github/scripts/land.mjs`, `lib/item-status.mjs`; `land --self-test` status-preflight cases | The old “merged branch status can turn the candidate red after verification” failure is retired for new lands. A `Landed-branch:` trailer preserves the evidence after branch deletion; pre-trailer merges remain invisible. |
| Open findings that declare themselves fixed are mechanically rejected | `f9f26580`; `.github/scripts/check-finding-closure.mjs`; `verify.mjs` adds a fast gate + self-test | The findings log is no longer only a passive register: it has a narrow closure gate, while code-level closure remains deliberately out of scope for that gate. |
| Generated triage owners must be durable channels or live work items | `8107be2d`; `gen-dataset-coverage.mjs` resolves item status and refuses archived/missing owners | The old “finished work can remain a next owner” failure is now enforced in the generator, not only detected in `check:ids`. |
| Product-language rewrites moved from inventory to enforcement ledger | `48247f8c`; `report-product-language.mjs` adds resolved/exception/open dispositions and refuses open enforced rows | The earlier “reports but does not enforce” verdict is stale for the enforced scopes; pending scopes and exemption classes remain explicit. |
| Worktree reporting now exposes ageing and dirty merged worktrees | `node .github/scripts/worktrees.mjs`, measured 2026-08-15: 105 total, 80 prunable, 16 merged-but-dirty, 13 dirty for 10+ days | Accumulation is still a real operational cost, but the current evidence is registered/dirty/age buckets rather than the prior 51-live snapshot. |

**Opinion:** these changes make Rift Forge a stronger source for *workflow hardening* than the first
survey showed, but they do not remove the taxonomy, generated-artifact, or multi-owner scheduling
costs. I would extract the new status-preflight and finding-closure patterns alongside the earlier
land protocol, not treat them as separate product features.

---

## 3. What doesn't

**`CLAUDE.md` is still unscoped, but it is now 555 lines rather than the prior 1,513-line record.**
`AGENTS.md` insists on reading it in full. WI-829 moved the 1,223-line shipped-history record into
`PROJECT-STATE.md`, read on demand, which lowers the fixed cost but does not provide `applyTo:`-style
per-surface routing. The repo with the most sophisticated instruction-propagation gate still has an
always-loaded core without a size gate.

**181 npm scripts and 85 `.mjs` files are their own onboarding surface.** 58 `check:` gates, 46
`test:` scripts, and 30 `report:` scripts — the naming is disciplined and `docs/engineering/gates.md`
is now generated as an index, but knowing which of the 181 scripts to run remains a significant
cost.

**Gates are prose-and-regex, and the repo knows what that costs.** `check-working-rules` matches
*vocabulary*, so it detects a surface that dropped the current phrasing — not one that keeps the
phrasing and means something else. Two design constraints were learned by shipping guards that were
wrong in both directions. This is the right trade for documentation, and it is a ceiling.

**Inherited failures are still easy to normalize.** On this refresh, `pnpm verify --fast` completed
111/113 gates; the two failures were attributed as inherited `product-language` and
`product-language-self` errors because the temporary worktree had no installed `typescript` package.
That attribution is useful and non-blocking, but it is also a reminder that an inherited-red path can
remain red. **A mitigation that removes the pain of a broken thing extends how long it stays broken.**

**105 registered worktrees, 433 branches.** `pnpm worktrees` now reports 80 prunable, 16 merged but
dirty, and 13 dirty for 10+ days, but deliberately does not remove — *"removing someone else's
worktree is not a script's call."* The queue still grows. The branch-deletion contradiction is partly
resolved by `Landed-branch:` trailers in new land commits; merges predating the trailer remain
invisible to the status check.

**`.claude/worktrees/` contains full repository copies with their own `.claude/skills/`.** A
worktree's skill copy can be stale relative to the candidate, and `/backlog-summary` has an explicit
rule about it — *"always from the live candidate tip (worktree copies go stale)"* — which is a
documented workaround, not a fix.

**The failure catalogue is dense enough to be a source of stale claims itself.** `CLAUDE.md`
paragraphs carry measured counts (*"37 items"*, *"95% of 474 rows"*, *"seven of eleven"*) that were
true on their measurement date. They are the evidence that makes the rules persuasive; they are also
exactly the shape `check:boundary-claims` was built to catch, in the one file it does not check.

**Skill count is at the routing limit.** Fourteen skills with overlapping trigger vocabulary
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
| A gate that matches nothing looking identical to a passing gate | 46 `test:` scripts, `--self-test` over fixtures | **Yes** |
| Many sessions, one candidate, invisible to each other | `session:start` from `green/` · `preflight` · `land` with lock + CAS · `worktrees` | **Yes** — the corpus's hardest problem, solved |
| Red gates you did not cause teaching people to bypass | inherited / INTRODUCED attribution; unattributable blocks | **Yes** |
| Candidate going red from an unverified merge | Verify the *merged tree* on `integ/`, then fast-forward | **Yes** |
| Single-writer lock that blocked everyone and worked anyway | Replaced with an atomic lock naming its holder; candidate never checked out | **Yes** — recorded as a correction, with the measurement |
| Pre-`land` full verify causing the conflict it feared | Rule: `--fast` constantly, `land` at the boundary | **Yes** — 3 of 5 lands refused, measured |
| Generated artifacts merged as text into a file neither side would emit | `generated` merge driver **refuses**; regenerate instead | **Yes** |
| Two sessions claiming the same id | `claim:id` across refs, ref names, and worktrees + merge driver + `renumber-claims` + `check:ids` backstop | **Yes** — a human no longer does the mechanical part |
| Docs citing finished work as a live blocker | `check:ids` rule, vocabulary narrowed after 29 false positives | **Yes** |
| Status fields lying about landed work | One-directional merged-branch gate + `branch-merged-ok:` escape, now also preflighted by `land` with a shared predicate | **Yes** — the new land path refuses the red candidate before fast-forward |
| Hand-typed counts drifting from the data | `check:boundary-claims` + `fix:boundary-claims`; uncovered claims pinned | **Yes** — 7 of 11 were false |
| Out-of-scope observations lost or dumped in prose | `FINDINGS.md` + `/record-finding` + narrow self-declared-closure gate | **Yes** — 74 open rows + 200 archived sections measured 2026-08-15 |
| `items/` unreadable at 600+ items | Sprint close archives the sprint with its items; links recomputed | **Yes** — 537 archived, 163 live |
| Instruction file size | Move shipped history to `PROJECT-STATE.md` and read it on demand | **Partly** — 555-line core plus 1,223-line record; still unscoped |
| Worktree/branch accumulation | `worktrees` reports, never removes, now with dirty/age buckets | **Partly** — 105 registered, 80 prunable, 13 dirty 10+ days |
| Candidate CI/environment red | Inherited / INTRODUCED attribution | **Mitigated, not fixed** — this refresh still saw two inherited missing-`typescript` failures |

---

## 5. How to improve it further

1. **Keep the instruction core on a size budget.** WI-829 moved shipped history to
   `PROJECT-STATE.md`, a real improvement, but `CLAUDE.md` remains unscoped at 555 lines. The next
   step is `applyTo:`-style routing for the engineering guides rather than another paragraph in the
   entry file.
2. **Point `check:boundary-claims` at `CLAUDE.md`'s own measured counts.** They are exactly the
   claim class the gate exists for, in the file every session trusts most. Or mark them as
   `measured YYYY-MM-DD` so age is visible at the point of reading.
3. **Keep the generated gate index honest** — `docs/engineering/gates.md` now maps gate → what it
   protects → tier/CI/cost → self-test, but 58 `check:` scripts and 181 npm scripts remain an
   onboarding surface. The index needs to stay generated and easy to query.
4. **Fix the two permanently-red CI jobs, or delete them.** A red job that attribution has made
   painless is a job carrying no information at a real dollar cost.
5. **Close the pre-trailer branch-status hole.** New `land` merges write a `Landed-branch:` trailer,
   so deleting the branch no longer hides the status. Merges predating that trailer remain invisible;
   the next improvement is a one-time reconciliation or explicit historical exemption.
6. **Turn worktree ageing into an escalation.** `worktrees` now exposes age and dirty state, but it
   still only reports. A nag or owner-facing queue once a clean merged worktree passes N days would
   make the 105-entry inventory shrink without deleting another owner's checkout.
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
