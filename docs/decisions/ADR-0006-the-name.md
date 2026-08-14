# ADR-0006 — The name: `rungs`, and why a name here is an identifier rather than a brand

- **Status:** accepted
- **Date:** 2026-08-14
- **Phase:** 4 (module catalog), decided at the 3→4 boundary

---

## Context

`ai-cli` was a Phase 0 working title. It was never decided, and it fails on three counts:

1. **It is taken on npm**, which blocks `npx ai-cli` — the invocation
   [ADR-0002](ADR-0002-stack-and-runtime-footprint.md) puts first in its reasoning ("lowest
   first-run friction").
2. **It names the category, not the product**, so it is unsearchable in the most crowded naming
   space in the industry.
3. **It misdescribes.** "ai" + "cli" reads as a code generator, which is the first entry in
   [brief §8's non-goals](../design/product-brief.md) — *"Not a project scaffolder."* A name that
   has to be corrected on first contact is a name that costs something every time it is read.

**Why this is decided now rather than at Phase 7 (distribution).** The name is not a label applied
at packaging time. It is already an identifier in three places, two of which land in repositories
this project does not control:

| Where | Set by | Lives in |
| --- | --- | --- |
| `npx rungs` | [ADR-0002](ADR-0002-stack-and-runtime-footprint.md) | the npm registry — globally unique, first-come |
| `.ai/rungs.toml` | [brief §7](../design/product-brief.md) | **the user's repo** |
| `<!-- rungs:begin backlog@1.0.0 -->` | [ADR-0003](ADR-0003-module-definition-format.md) | **the user's repo**, inside shared files |

The third is the sharp one, and its cost is mechanical rather than cosmetic. Trace a rename that
happens *after* repos have been scaffolded:

- ADR-0003 states that content **outside** every marked block "is the user's and is never touched."
  A renamed tool scanning for `rungs:begin` does not match `ai-cli:begin`, so **its own generated
  block becomes, by its own rule, user content it is forbidden to touch.** `upgrade` can no longer
  replace it; `doctor` can no longer report hand-edits in it as divergence.
- [ADR-0004](ADR-0004-adoption-detection.md) §2 makes `markers` one of only two presence signals.
  With `paths` still matching and no `rungs.toml` present, a previously-installed module resolves
  to **outcome 4, "Theirs, equivalent"** — the tool adopts its own prior installation as a
  stranger's hand-built system, recording override mappings for files it wrote itself.

Neither is destructive, and that is ADR-0004's doing rather than luck: its refusal to migrate is
what turns a rename from data loss into silent record loss. But the version and content-hash
records are gone, so the upgrade path and the divergence reporting in
[brief §7](../design/product-brief.md) stop working for every repo installed before the rename —
quietly, and with no error to notice.

So the window in which this is cheap is exactly now: **no repo has ever been scaffolded**, and the
name's total footprint is this repository's own prose.

## Decision

**The tool is named `rungs`.**

The name states the constraint the tool is most likely to violate. [Brief §4](../design/product-brief.md)
identifies it explicitly — *"Selling rung 5 to a rung 1 repo is the most likely way this tool does
harm"* — and the maturity ladder ([synthesis §5](../research/synthesis.md#5-the-maturity-ladder)) is
the mechanism that prevents it. Putting the ladder in the command surface makes the rung check read
as the tool doing its job:

```console
$ npx rungs add concurrency
  concurrency is rung 5 (~5+ concurrent sessions).
  This repo shows 1 active session. Install anyway? [y/N]
```

*Opinion, mine, offered as opinion:* every one of the 28 available candidates below could have been
argued for, and the choice among them is judgement, not measurement. I weighted the ladder above the
other candidate arguments (retrofit, provenance, auditing) because the ladder is the one the tool can
get **wrong at the user's expense**; the others describe where the content came from, which is a
claim about the past rather than a constraint on use.

### Evidence

84 candidate names checked on **2026-08-14** with `npm view <name> version` (a `E404` result means
the name is free). **56 taken, 28 free.** The full free set:

```text
priorart  wellworn  rootstock  treadway   bolton    paveway   repokit  rungs
jigs      jigwork   trodden    ratchets   throughway workjig  bracing  benchdog
trysquare hardwon   rungwise   ladderwork attested  refits    snagging asbuilt
truing    bevel     ropewalk   ratline
```

This inventory is dated because it decays: **any of these can be claimed by someone else at any
time, including `rungs`.** See revisit trigger 1.

## Consequences

- **Good:** `npx rungs` is available, five characters, and unambiguous in search.
- **Good:** the rename cost 40 replacements across 12 files (`grep -ro 'ai-cli' --include='*.md' .`,
  2026-08-14). It will never be this cheap again — Phase 4 writes the name into module manifests
  and Phase 5 into the marker constants.
- **Cost:** `rungs` says nothing about agents, repos, or AI. A reader learns what it is from the
  tagline, not the binary. *Opinion:* this is the normal price of a distinctive name and the
  standard trade in this ecosystem — `ruff`, `vite`, and `biome` all pay it.
- **Cost:** a plural-looking name takes singular verbs in prose ("rungs installs and maintains…").
  Minor, but it recurs in every document and every error string.
- **Open, and not discharged by this ADR:** **the npm name is unclaimed.** Phase 7 is four phases
  away, and nothing prevents `rungs` being taken in the interim — which would reopen this decision
  at a much worse moment. Claiming it is the mitigation and it has not been done.
- **Follow-up this analysis surfaced:** the marker prefix is currently the product name, which is
  what couples a rename to the ADR-0003/0004 breakage traced above. **Decoupling them — a stable
  marker prefix that never changes even if the product name does — would make every future rename
  free.** That is a change to ADR-0003's merge format and ADR-0004's `[detect]` block, so it is not
  decided here; it is filed as a question for whoever authors `modules/backlog/`.

## Alternatives considered

**Keep `ai-cli`** — rejected on all three counts in the Context: taken on npm (blocking ADR-0002's
primary reason), generic, and actively misleading against brief §8.

**`rootstock`** — the best metaphor in the set, and the one that argues the *primary* case: in
grafting, the rootstock is the established living plant that proven material is attached to, and it
determines what that material can support — retrofit-first and the maturity ladder in one word.
Rejected on ergonomics and collisions: nine characters typed constantly, against the RSK Bitcoin
sidechain and Rootstock Software (Salesforce ERP). **The strongest alternative**; see revisit
trigger 3.

**`asbuilt`** — the sharpest fit for a single command. As-built drawings record what was *actually*
built against what was designed, which is `doctor`'s job statement and brief §7's divergence policy.
Rejected because it is a noun phrase and reads badly in the imperative (`asbuilt doctor`).

**`bracing`** — the most immediately comprehensible: bracing strengthens a structure that already
stands and does not build one, matching brief §8's first non-goal exactly. Rejected only against
`rungs`, on the weighting stated in the Decision.

**`hardwon`, `wellworn`, `priorart`, `attested`** — all argue provenance, which is
[CLAUDE.md](../../CLAUDE.md)'s evidence rule and the project's actual claim to authority. Rejected:
they advertise where the content came from rather than constraining what the tool may do with it.

**A scoped package (`@scope/rig`, `@scope/graft`)** to recover a short word already taken — rejected
because it forfeits the clean `npx` line that ADR-0002's first reason rests on, and because the
scope then has to be explained too.

**`repokit`** — free, self-describing, and instantly understood. Rejected: it trades every bit of
distinctiveness for that, which *(opinion)* is the wrong trade in a category this crowded.

## Revisit triggers

1. **`rungs` is claimed on npm before the name is registered** → reopen immediately. The decision is
   still cheap to redo only while no repo has been scaffolded; after that, the Context's trace is
   the cost.
2. **The maturity ladder stops being load-bearing** — modules stop carrying a rung, or the rung
   check is dropped from `add` — → the name's argument evaporates. The name can stay, but it must
   stop being cited as self-documenting.
3. **A trademark or a serious naming conflict surfaces at Phase 7** → renaming is cheap only before
   distribution. If repos already exist in the wild, do the marker-prefix decoupling in the
   Consequences *first*, then rename.

## Admission check

Against [the rule](README.md): (1) constrains the npm package, the config filename, and the marker
constants every module writes ✅ · (2) 27 other available names, `rootstock` rejected with a stated
reason ✅ · (3) reversing after distribution silently breaks `upgrade` and divergence reporting in
every scaffolded repo — traced in the Context ✅ · (4) not owned by the brief, which is authoritative
for what the tool *is*, not what it is called ✅ · (5) not an implementation detail — it is an
identifier in other people's repositories ✅.
