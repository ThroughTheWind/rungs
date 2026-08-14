---
name: assess
description: >-
  Assess one subject — a package, service, surface or endpoint — against this repo's audit criteria,
  and record each failure as a row in the findings register. Use when asked to "audit", "assess",
  "review the readiness of", "check whether X is production-ready", or before promoting, releasing
  or publicising something. Also use to work through a backlog of unassessed subjects, one at a
  time. It records observations; it does not fix them and does not open work items — that is
  /record-finding's triage and /work-item.
---

# Assess a subject

Read the criteria file first. It is repo-owned and changes; the version in your memory does not
count.

## 1. One subject at a time

Assessing several at once produces a comparison, which is a different and less useful artifact.
Name the subject explicitly before starting, and its boundary — what is in it and what is merely
adjacent.

## 2. Check each criterion against the artifact

**Read the thing, not the documentation about the thing.** A README claiming the errors are typed
is a claim; the code is the fact. This is the failure that makes an audit worthless: an assessment
built from the subject's own self-description confirms it.

For each criterion, reach one of three verdicts:

- **passes** — record nothing
- **fails** — one row in the findings register
- **cannot tell** — say so, and say what would settle it. A "cannot tell" recorded honestly is
  more useful than a pass you did not earn

## 3. Write rows, not a document

Each failure is one row: severity from the criteria table, what specifically fails, **evidence**
(a path, a symbol, a command), when to act, how to fix.

**Do not produce an audit document.** One repo in the corpus generated 268 of them and still cannot
say which findings are open — the prompt was fine, the output form was the defect. `rungs check`
refuses the document tree from re-forming.

## 4. Report the run itself

Say how many criteria were checked, how many subjects, and **how many files you actually read**.

An audit that found nothing and an audit that read nothing produce the same output, and only one of
them is good news. A report that cannot fail loudly is not a measurement.

## 5. Stop

Do not fix what you found. Do not open work items. Do not rank. Those are decisions made against
the register later, deliberately, by someone weighing them against everything else — which is the
whole reason the register exists.

## What this cannot tell you

- **That a subject is good.** It passed the criteria that were written down.
- **That the criteria are right.** They are this repo's opinion, in a file you can edit — and a
  criterion nothing has ever failed is worth suspecting.
