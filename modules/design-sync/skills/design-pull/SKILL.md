---
name: design-pull
description: >-
  Pull the design system down from the upstream authority into the local mirror, and record what
  changed since the last pull. Use when asked to "pull the design", "sync the design system", "get
  the latest tokens/components", or before starting UI work that should match a current design.
  Down-sync only — it never pushes local changes upstream. Deciding what the pull means is
  /design-align.
---

# Pull the design system

**Down-sync only.** This skill never sends anything upstream; that is `/design-align`'s change
request, drafted for a person to send.

## 1. Record where you are starting

Note the mirror's current state before pulling — what came down last time and when. Without it,
"what changed" degrades into "everything looks different", which is not a delta list.

## 2. Pull into `{{mirror}}/`

The mirror is **generated**. Anything hand-edited there is destroyed by this step, which is why
`design-mirror-not-edited` exists — if it has fired, resolve that before pulling or the edit
disappears along with whatever it was compensating for.

## 3. Report what changed, in design terms

Not a file diff. Group by what a person would recognise:

- tokens added, changed, removed
- components added, changed, removed
- layout or spacing rules changed
- anything **removed** — the most consequential category and the easiest to miss, because a removal
  looks like nothing rather than like a change

## 4. Say what you could not tell

An upstream that reorganised its files produces a diff that looks like a rewrite. Say so rather
than reporting hundreds of false deltas — an alignment pass fed noise gets abandoned, and the real
deltas go with it.

## 5. Stop

**Do not implement anything.** Do not open work items. Do not adjust components to match. The pull
establishes what upstream says; `/design-align` decides what that means here, against precedence
rules and the current phase.

Hand off with the delta list and the pull date. That date is what makes the next reader able to
tell a live delta from a stale one.
