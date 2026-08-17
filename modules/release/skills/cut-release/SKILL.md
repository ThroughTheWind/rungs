---
name: cut-release
description: >-
  Cut, tag and ship a release from the active candidate — gates, version bump, changelog assembly,
  annotated tag, the long-lived deploy branch, merge to the stable line, and opening the next
  candidate — plus the hotfix and rollback flows. Use when asked to "cut / ship / tag the release",
  "release v1.2.0", "bump the version", "hotfix production", "roll back the deploy", or "open the
  next candidate". Executing one tracked item is /work-item; assessing readiness is /assess.
---

# Cut a release

**Every step below is reversible except the tag and the deploy.** Know which one you are on.

## 1. Decide the version

From the changelog fragments in `{{changelog_dir}}/`, not from memory or from what the last release
was. A breaking change in any fragment decides the major; a feature decides the minor. If the
fragments do not support the version you were asked for, **say so before continuing** — that
mismatch is usually a fragment somebody skipped, not a versioning disagreement.

## 2. Gate

```bash
rungs check
```

Run **every** registered gate. This step used to name a "--tier full" flag that the CLI does not
accept, so both words were parsed as positionals and the run checked a directory that does not
exist — reporting no gates rather than a pass. A release step that gates on nothing while looking
green is worse than one that is skipped, because nobody goes back to check it.

Narrow to a tier (`rungs check --fast`) only when you know the tier holds what you meant to run.

**Do not proceed on a red gate**, and do not weaken one to get through. A release is exactly the
moment the temptation is highest and the cost of yielding is highest.

If a gate is red for reasons that predate this work, say so explicitly and get a decision. Shipping
past a known-red gate is a choice someone should make on purpose.

## 3. Assemble the changelog

Combine the fragments into the release section, then **delete the fragments**. They are consumed,
not archived — a fragment left behind appears in the next release too.

## 4. Bump the version

In every place it appears. `release-version-consistent` computes this rather than trusting you;
run it before tagging, because a version that disagrees with itself is discovered by a user.

## 5. Tag and merge

- Annotated tag on the candidate, message naming the release.
- Merge the candidate into `{{stable_branch}}`.
- Cut `{{deploy_branch_prefix}}<version>` from the tag. **This is what you deploy from and what you
  roll back to** — a rollback that means reverting commits on the stable line is a rollback nobody
  performs correctly under pressure.

## 6. Open the next candidate

Cut a new `{{candidate_prefix}}<next>` immediately. A period with no open candidate is a period
where work lands somewhere improvised.

---

## Hotfix

Branch **from the deploy branch, never from the candidate** — the candidate contains unreleased
work, and shipping it as a hotfix is how an unrelated feature reaches production during an
incident.

Fix → gate → tag a patch version → merge into `{{stable_branch}}` **and forward into the active
candidate**. The forward-merge is the step people skip, and skipping it means the next release
silently reverts the hotfix.

## Rollback

Point the deploy at the previous `{{deploy_branch_prefix}}<version>`. Do not revert commits.

**Then record why**, as a finding at minimum. A rollback with no written cause is one the team
repeats, and the pressure of the moment is exactly why it will not be remembered otherwise.

## What this skill will not do

- Decide *whether* to release. That is a judgement about readiness, not a procedure.
- Proceed past a red gate without an explicit decision from a person.
- Deploy. Tagging and cutting the branch is where this stops; what consumes them is your
  infrastructure.
