# Release runbook — releasing rungs itself

> **Written 2026-08-17** while preparing v0.2.0, from the state the preparation actually found.
> Every trap in [§5](#5-traps-each-one-measured) is one that had already happened in this
> repository, not one imagined for the document.

## What this is, and what it is not

[`modules/release/skills/cut-release/SKILL.md`](../../modules/release/skills/cut-release/SKILL.md)
is the **portable** procedure: it ships to every repo that installs the `release` module, and it is
written in parameters (`{{changelog_dir}}`, `{{stable_branch}}`) because it cannot know your branch
names. It is the authority on *what order the steps go in* and *which ones are irreversible*.

This document is the **concrete** procedure for one repository — this one. It names real commands,
real paths, and the specific things that have gone wrong here. Where the two disagree about a
command, this file is right about *this repo* and the skill is right about the general shape; where
they disagree about *order or reversibility*, the skill wins and this file is the defect.

Keep them apart on purpose. Folding this repo's specifics into the shipped skill would export
`.ai/gates.toml` trivia into every consumer repo, which is the failure the module format exists to
prevent.

## 1. Decide the version

From the fragments in [`changelog.d/`](../../changelog.d), not from the last release and not from
what someone asked for. The rule, from the skill: **a breaking change decides the major; a feature
decides the minor.**

```bash
git log --no-merges --format='%s' "$(git describe --tags --abbrev=0)"..main | grep -oE '^[a-z]+:' | sort | uniq -c | sort -rn
```

That is a prompt, not an oracle — a `feat:` prefix on a docs change does not make a minor, and a
`fix:` that removes a documented flag is a major. Read the fragments; the commit census only tells
you where to look.

**If the fragments do not support the version you were asked for, say so before continuing.** When
v0.2.0 was prepared, the request was for a patch and the branch was already named
`candidate/0.1.4`; twelve `feat:` commits since v0.1.3 made it a minor. A branch name is a prefix,
not a promise, and renaming a branch is free. Republishing a version number is impossible.

## 2. Gate

```bash
npm test && node --experimental-strip-types src/cli.ts check
```

**Use plain `check`. Not `--full`, not `--tier full`** — see [T1](#t1). Expected at v0.2.0 prep:
24 tests pass, 25 gates pass, 0 fail.

Do not proceed on a red gate, and do not weaken one to get through. If a gate is red for reasons
that predate the release, say so explicitly and get a decision from a person.

## 3. Assemble the changelog

1. The fragment for this release lives at `changelog.d/<version>.md` and should have been
   accumulating all cycle. If it does not exist, it is being reconstructed from commits — record
   that, because a reconstructed changelog is a weaker claim than one written alongside the work.
2. Fold its entries into the `releases` array at the top of
   [`site/src/pages/versions.astro`](../../site/src/pages/versions.astro), newest first, with
   `kind` set to `major` / `minor` / `patch`.
3. **Delete every consumed fragment.** They are consumed, not archived — see [T2](#t2).

## 4. Bump the version, everywhere

```bash
npm version <version> --no-git-tag-version
```

That covers `package.json` and `package-lock.json`. Then, by hand, because no gate checks them
([T4](#t4)):

| Surface | What to update |
| --- | --- |
| [`site/src/pages/versions.astro`](../../site/src/pages/versions.astro) | `publishedVersion` — the version **already on npm**, not the one being cut. Verify it ([T3](#t3)). |
| [`README.md`](../../README.md) § Status | Published version + date, next version, gate count with its date |
| [`docs/roadmap.md`](../roadmap.md) | Phase 7 row and the "What is left" Phase 7 paragraph |

Then regenerate the derived site claims and build ([T6](#t6)):

```bash
cd site && npm run claims && npm run build
```

## 5. Traps, each one measured

### T1
**A tier can select zero gates, and that used to look like the repo was the problem.** Every gate in
[`.ai/gates.toml`](../../.ai/gates.toml) is `tier = "fast"` (25 of 25, 2026-08-17), and
[`src/check.ts`](../../src/check.ts) matches the tier label exactly, so `full` selects nothing.
The shipped skill's step 2 used to prescribe `rungs check --tier full` — and `--tier` is not a
recognised flag at all ([`src/cli.ts:796`](../../src/cli.ts:796) accepts a positional tier or
`--fast` / `--full`), so following it produced a confident `no gates registered — is this a rungs
repo?` about a repo holding 25 of them.

Fixed 2026-08-17 in both places: the skill now says `rungs check`, and the zero-gate case names the
tier and the count it declined to run. **What remains open (F-020 part 1)** is the semantics —
`full` is a disjoint label, not a superset of `fast`, and an unknown tier is accepted rather than
rejected. So `rungs check <anything>` still runs nothing, now honestly. **Use plain `check`.**

### T2
**A consumed fragment that is not deleted reappears in the next release.**
`changelog.d/0.1.1.md` was written for v0.1.1, folded into the versions page, and never removed. It
was still sitting there at v0.2.0 preparation — through two releases — where it read as unreleased
work. The v0.1.3 fragment *was* deleted, so the discipline exists and was simply skipped once.

### T3
**`publishedVersion` in `versions.astro` is hand-typed and drifts.** It read `0.1.2` while npm
`latest` had been `0.1.3` since 2026-08-15T18:06:25Z — so the page rendered
"0.1.3 · npm publication pending" above a version anyone could already `npm install`. Check the
registry, never memory:

```bash
npm view @rungs/cli dist-tags
```

### T4
**The prose version claims are ungated.** `README.md` and `docs/roadmap.md` each stated the public
latest as v0.1.2 two days after v0.1.3 shipped, and the README's gate count sat at "20 pass" when
the answer was 25. The structural site counts are derived and gated (WI-051); these sentences are
not. Until a gate covers them, they are on this checklist.

### T5
**The candidate branch drifts from `main`.** At v0.2.0 preparation `candidate/0.1.4` was **46
commits behind** `main` and zero ahead: every work item had merged to `main` directly. The skill
assumes the candidate is what you tag. Reconcile before tagging, or tag `main` deliberately and
know that is what you did.

```bash
git rev-list --left-right --count candidate/<version>...main
```

### T6
**Site counts are generated, not typed.** `npm run claims` writes
`site/src/generated/claims.json`, and the `site-claims-current` gate refuses drift. Run it before
the build or the build fails on stale counts. Note that `claims.run` records **one `rungs check`
run on a stated date** — it is a captured observation, not a derived property, so it can legitimately
disagree with a run you did five minutes later.

Two things about it that have already caused confusion:

- **It captures whatever the tree does at that moment, including a failure you are mid-way through
  fixing.** During this preparation it recorded `24 pass, 1 fail` because the runbook was referenced
  from the README before it existed. Regenerate *after* the tree is green, and read the line it
  prints rather than assuming.
- **`at` is UTC** ([`generate-claims.mjs:38`](../../site/scripts/generate-claims.mjs:38)), while
  every hand-written date in this repo is local. Near midnight the site and the README will name
  different days for the same run. Neither is wrong; only the disagreement is.

## 6. Tag, branch, publish — the irreversible part

Everything above is reversible. **These steps are not.** Do them deliberately, one at a time.

```bash
git tag -a v<version> -m "rungs v<version> — <one line>"
git push origin main --follow-tags
git branch release/<version> v<version> && git push -u origin release/<version>
```

Then publish. The registry is immutable: a published version is never rewritten, only superseded.

```bash
npm publish --access public
```

Verify from outside the repo before announcing anything — a package that passes its own tests and
fails a clean install is exactly the failure v0.1.1 shipped
([release-readiness](release-readiness.md)):

```bash
npm view @rungs/cli dist-tags
npm install --prefix "$(mktemp -d)" @rungs/cli && npx --yes @rungs/cli@<version> --help
```

## 7. Open the next candidate

```bash
git branch candidate/<next> main && git push -u origin candidate/<next>
```

A period with no open candidate is a period where work lands somewhere improvised — which is how
`candidate/0.1.4` ended up 46 commits behind the branch that actually held the work ([T5](#t5)).

## Hotfix and rollback

Unchanged from the skill, and deliberately not restated here — one definition per concept. Branch a
hotfix from `release/<version>` and never from the candidate; forward-merge it into the active
candidate or the next release silently reverts it. Roll back by pointing the deploy at the previous
`release/<version>`, never by reverting commits, and record why as a finding at minimum.
See [`cut-release`](../../modules/release/skills/cut-release/SKILL.md).
