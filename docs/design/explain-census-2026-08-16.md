# `doctor --explain` false-positive census, 2026-08-16

> **Authoritative for:** the measured false-positive rate of `doctor --explain` across every
> repository reachable from this machine on 2026-08-16, and the method that produced it.
> **Not authoritative for:** whether the findings are *useful* — see §5 — or how the detectors
> behave on repositories nobody here built, which this cannot measure and §4 says so.
>
> Produced by [WI-053](../backlog/archive/WI-053-false-positive-census.md).

## Why this exists at all

`--explain` shipped in [WI-038](../backlog/archive/WI-038-doctor-explain-detectors.md) claiming a
**0% mis-framed rate**, measured across three repositories. Running it against the fourth produced
**46.6%** — 1,794 of 3,851 findings were `path/file.ts:387` code references pointing at files that
were exactly there ([WI-042](../backlog/archive/WI-042-link-line-references.md)).

The triage that missed it resolved `target.split('#')[0]` — **the same assumption as the engine it
was checking** — so it could only ever agree. One repository moved the headline number by 46 points,
and the check that should have caught it could not fail.

So: every repository, not a sample; a classifier proven capable of every verdict before its results
are believed; and per-repo rates, never pooled.

## 1. Scope, and the number that is not 82

| | |
| --- | ---: |
| Directories under `C:\Development\Repositories` with a `.git` | **82** |
| …of which are `rift-forge*` worktrees and clones of **one** project | **63** |
| Repositories censused | **22** |

**The 63 are not 63 repositories.** They are worktrees and branch clones of a single project, and
counting them would have manufactured a sample size — every per-repo rate would be that one
project's rate, repeated, with the average dominated by it. Three are kept: the canonical checkout
and two others, enough to show whether they diverge.

Stated plainly because the tempting headline — *"censused 82 repositories"* — would have been four
times the truth, and this document exists because of a number that was believed too easily.

## 2. Results

Every repository is pinned at the commit it was measured at. `+N` is uncommitted files present at
the time, which affect the counts and are not in the SHA.

| Repo | HEAD | rungs installed | modules in scope | detectors fired | findings | wrong | unclassified | false positive |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `rift-forge` | `116523f5` +12 | no | 12 | 3 | 1994 | 0 | 0 | **0%** |
| `hexguard` | `51b25da` +25 | yes | 10 | 4 | 126 | 0 | 0 | **0%** |
| `rift-forge-build-link-formula-breakdown` | `3ccee32b` | no | 11 | 3 | 85 | 0 | 0 | **0%** |
| `rift-forge-candidate` | `b1f4dd4b` | no | 11 | 3 | 82 | 0 | 0 | **0%** |
| `hexguard-templates` | `d24cf0a` +46 | no | 7 | 1 | 3 | 0 | 0 | **0%** |
| `sq-web` | `9aee640` | no | 1 | 1 | 1 | 0 | 0 | **0%** |

**2,291 findings across 6 repositories. 0 wrong. 0 unclassified.**

Sixteen repositories produced nothing: `ai-cli`, `angular-academy`, `axiom-mesh`, `bldc`,
`dotnet-academy`, `dotnet-playground`, `dotnet-sandbox`, `gridforge`, `ng-i18n-compiler`, `rewind`,
`session-playbook`, `smart-snipping`, `sq-motors`, `sql-learning`, `vesc_tool`, `xlf-translator`.

**Silence has two causes and they are not the same.** Four of them (`dotnet-playground`,
`dotnet-sandbox`, `sq-motors`, `xlf-translator`) have **zero modules in scope** — detection found no
equivalent of anything, so no detector was eligible and the repo was never examined. The other
twelve had between one and eight modules in scope and genuinely produced no finding. Reporting both
as "clean" would be the false-negative version of the error this census is about.

## 3. The classifier, and proof it can fail

Each finding is re-derived from the repository, never from the engine:

| Finding class | Re-derivation |
| --- | --- |
| `broken link → X` | Strip `#anchor` **and** `:line[:col]`, resolve from the citing file's own directory, ask the filesystem |
| `stale path in a code span → X` | Resolve from the repo root **and** from the citing file's directory |
| `N matching file(s) — matched against P` | Re-glob the patterns the message names and count independently |
| `N loaded lines, budget M` | Re-read, strip frontmatter/comments/blanks, count, compare — and check it exceeds the budget |
| anything else | **`unclassified`** — counted separately, never folded into `real` |

**A 0% rate from an unfalsifiable classifier is worth nothing**, so the classifier was tested against
ten findings that are false or true by construction — including the exact `:line` case that defeated
WI-038's triage — and required to return each verdict:

```
ok  link, target exists      → wrong      ok  span, path exists    → wrong
ok  link, :line suffix       → wrong      ok  span, path absent    → real
ok  link, genuinely absent   → real       ok  population, wrong count → wrong
ok  budget, wrong count      → wrong      ok  population, right count → real
ok  budget, right count      → real       ok  unknown shape        → unclassified
all 10 cases correct
```

The `:line` case is the one that matters: this classifier catches what the previous one was blind to.

## 4. What this cannot tell you

**Every repository here was built by the same operator.** The census measures whether the detectors
survive different repo *shapes* — a .NET service platform, an Angular monorepo, a Qt desktop app, a
game-data project — not different *people*. That is a real result and it is not the test the
external review asked for, which was twenty repositories nobody involved had touched.

Three further limits:

- **Six repositories carry the entire result.** Sixteen contributed no findings, so the rate is
  really a statement about six.
- **`rift-forge` is 87% of all findings.** A false-positive class that only affects the other five
  would be invisible in any pooled number, which is why none is published.
- **Counts move.** `rift-forge` reported 2,057 findings during WI-042 and 1,994 here, hours apart on
  the same day, because it is an active project that took a docs merge at 19:00. That is why every
  row is pinned to a SHA, and it is the reason a date alone is not enough — the rule
  [`roadmap.md`](../roadmap.md) already applies to the public-framework research, arriving here from
  the other direction.

## 5. The question nobody has asked

Of `rift-forge`'s 1,994 surviving findings, **how many would that repository's owner act on?**

Low false positives and low value look identical from here. A broken relative link is genuinely
broken, and it may also be in a research document nobody will open again. This census cannot
distinguish them, and neither can any measurement taken without the repo's owner —
[§4 of the second review's adjudication](external-review-2026-08-16b.md) named this as the thing
both reviews skipped, and it is still skipped.

**It is the next question, not this one.** Answering it needs a person who owns a repository, which
is the same thing the generalisation gap needs.

## 6. Consequences

No finding or item was opened. The threshold WI-053 set — any false-positive class above roughly one
in five on any single repository — was not approached: the highest was 0%.

That is a weaker result than it looks, and the honest reading is in §4: the detectors survive contact
with eleven distinct project shapes built by one person. The claim that they survive contact with
*other people's* repositories remains untested, and no amount of work on this machine can test it.
