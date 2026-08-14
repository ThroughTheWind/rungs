---
id: ADR-0006
title: "The name: `rungs`, and why a name here is an identifier rather than a brand"
status: accepted
date: 2026-08-14
---

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
| `npx @rungs/cli` | [ADR-0002](ADR-0002-stack-and-runtime-footprint.md) | the npm registry — globally unique, first-come |
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
$ npx @rungs/cli add concurrency
  concurrency is rung 5 (~5+ concurrent sessions).
  This repo shows 1 active session. Install anyway? [y/N]
```

*Opinion, mine, offered as opinion:* every one of the 28 available candidates below could have been
argued for, and the choice among them is judgement, not measurement. I weighted the ladder above the
other candidate arguments (retrofit, provenance, auditing) because the ladder is the one the tool can
get **wrong at the user's expense**; the others describe where the content came from, which is a
claim about the past rather than a constraint on use.

### Evidence

> **Corrected 2026-08-14**, after two rejected publishes. The original section is not deleted,
> because the way it was wrong is the most reusable thing in this ADR.

84 candidate names were checked with `npm view <name> version`, and this ADR originally recorded
**56 taken, 28 free** on the strength of it. **That inventory measured the wrong property.**

`npm view` returning `E404` proves only that **nothing is registered** under the name. It does not
test npm's server-side *"package name too similar"* filter, which rejects a name within a small
edit distance of an existing package and fires **only at publish time**. `npm publish --dry-run`
does not test it either — that check is client-side.

`rungs` is unpublishable. It is one edit from `runjs` (4.4.2) and one from `rung` (0.14.1) — and
this ADR's own inventory had already recorded `rung` as taken:

```console
$ npm publish
npm error 403 Package name too similar to existing package runjs
```

**The rule that generalises, and the reason it was missed:** a plural is always edit-distance 1
from its own singular, so **a plural is unpublishable whenever the singular exists.** Four of the
28 names recorded as "free" fail on exactly this — `rungs`←`rung`, `ratchets`←`ratchet`,
`jigs`←`jig`, `refits`←`refit`. Every one of those singulars appears in the same 84-name sweep,
marked taken. The evidence to catch this was already in the document.

**The remaining 24 are unverified and must not be cited as available.** A second pass using npm's
search API plus local edit distance cleared most of them, but that method is not authoritative
either: it missed that `truing` is distance 2 from `tuning`, because npm search ranks by relevance,
not by edit distance.

**The only authoritative test is an attempted publish.** Every check above narrows the field; none
of them is a result.

## Consequences

- **Good:** the tool, the command, `.ai/rungs.toml` and every marker are `rungs` — five characters,
  unambiguous in search.
- **Registered as `@rungs/cli`, published 2026-08-14 at v0.1.0.** The unscoped `rungs` is
  unpublishable (Evidence), so the **org** `rungs` holds the namespace and the package is
  `@rungs/cli`. `npx @rungs/cli doctor` resolves to the single `rungs` bin; a global install puts
  `rungs` on the `PATH`. **The package identifier appears in none of the three load-bearing places
  in the Context table**, so nothing inside a scaffolded repo changed and none of the 366
  occurrences of `rungs` in this repo moved.
- **Good:** the rename cost 40 replacements across 12 files (`grep -ro 'ai-cli' --include='*.md' .`,
  2026-08-14). It will never be this cheap again — Phase 4 writes the name into module manifests
  and Phase 5 into the marker constants.
- **Cost:** `rungs` says nothing about agents, repos, or AI. A reader learns what it is from the
  tagline, not the binary. *Opinion:* this is the normal price of a distinctive name and the
  standard trade in this ecosystem — `ruff`, `vite`, and `biome` all pay it.
- **Cost:** a plural-looking name takes singular verbs in prose ("rungs installs and maintains…").
  Minor, but it recurs in every document and every error string.
- **Discharged 2026-08-14:** the name is claimed. Registering the org rather than a single package
  reserves the whole `@rungs/*` namespace, which is a stronger form of the claim than the unscoped
  name would have been.
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

**A scoped package (`@scope/rig`, `@scope/graft`)** to recover a short word already taken —
originally rejected because it forfeits the clean `npx` line that ADR-0002's first reason rests on,
and because the scope then has to be explained too. **That rejection rested on a false premise —
that an unscoped name was available — and scoping is now the decision** (Consequences). Scoped
names bypass npm's similarity filter entirely, which makes scoping the *reliable* path rather than
the fallback: one longer invocation string, against a whole reserved namespace and no further trial
and error. Precedent: `@biomejs/biome`, whose command is `biome`.

**`repokit`** — free, self-describing, and instantly understood. Rejected: it trades every bit of
distinctiveness for that, which *(opinion)* is the wrong trade in a category this crowded.

## Correction, 2026-08-14

This ADR shipped with an evidence table that looked measured and was not. It cost two rejected
publishes to discover, and the finding is recorded here rather than in a findings register because
this repo has not installed its own `findings` module.

**What failed was not the absence of evidence — it was evidence for the adjacent property.** The
inventory named its date and its command, exactly as [CLAUDE.md](../../CLAUDE.md) requires. The
command ran, returned a clean result, and answered a question nobody had asked: *is this name
registered?* rather than *can this name be published?* A count with a command beside it reads as
verified, which is what made it propagate into the Decision, the Consequences, the Alternatives and
the Admission check without anyone rechecking it.

So the sharpening, which is more than "cite a command":

> **Evidence must test the property the claim is about.** Name the command *and* state what it
> proves. Where the two differ — `npm view` proves registration, not publishability — the gap is
> the finding, and it belongs next to the number.

The corroborating detail is that **this document already contained its own refutation**: `rung` is
listed as taken in the same 84-name sweep that lists `rungs` as free, and one is one edit from the
other. No new information was needed to catch it — only a check that tested the right thing.

## Revisit triggers

1. ~~**`rungs` is claimed on npm before the name is registered**~~ → **discharged 2026-08-14**:
   `@rungs/cli@0.1.0` is published and the `rungs` org holds the namespace. What remains of this
   trigger: **the product name and the package identifier are now separate strings**, so a future
   change to either must state which one it means.
2. **The maturity ladder stops being load-bearing** — modules stop carrying a rung, or the rung
   check is dropped from `add` — → the name's argument evaporates. The name can stay, but it must
   stop being cited as self-documenting.
3. **A trademark or a serious naming conflict surfaces at Phase 7** → renaming is cheap only before
   distribution. If repos already exist in the wild, do the marker-prefix decoupling in the
   Consequences *first*, then rename.

## Admission check

Against [the rule](README.md): (1) constrains the npm package, the config filename, and the marker
constants every module writes ✅ · (2) `rootstock`, `asbuilt` and `bracing` were real alternatives,
each rejected with a stated reason — **no count is given here, because the Correction above voids
the one this line originally cited** ✅ · (3) reversing after distribution silently breaks
`upgrade` and divergence reporting in
every scaffolded repo — traced in the Context ✅ · (4) not owned by the brief, which is authoritative
for what the tool *is*, not what it is called ✅ · (5) not an implementation detail — it is an
identifier in other people's repositories ✅.
