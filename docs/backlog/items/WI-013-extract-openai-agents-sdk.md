---
id: WI-013
title: Extract the OpenAI Agents SDK — a deliberately small primitive surface
type: docs
status: review
branch: feature/WI-013-extract-openai-agents-sdk
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-010]
epic: WI-009
children: []
---

## Proposal (rationale)

Every other repo in this corpus is in it for a mechanism. This one is in it for a **restraint**.

The most expensive finding in the existing corpus is that mechanism accumulates and nobody removes
it: `rift-forge` reached a 1513-line instruction file and 69 gate scripts, and `hexguard` shipped 98
release workflows — both recorded as counter-examples, not achievements
([`synthesis.md`](../../research/synthesis.md)). rungs' answer is the maturity ladder, which is a
claim that a small set of primitives covers most repos and the rest is optional. That claim has
never been tested against a project that made minimality an explicit design goal and had to hold it
under adoption pressure.

The Agents SDK is that test. A small vocabulary — agents, tools, handoffs, sessions — is a bet that
those are the *right* primitives, and a widely-used SDK is a bet that has been paid out or not in
public.

The specific questions:

- **What is the actual primitive list**, and how much of the surface is each one carrying?
- **What was refused?** The valuable part of a small API is the pressure it withstood. Look for the
  escape hatch — every small abstraction has one, and where it is says what the abstraction could
  not cover.
- **Is `handoff` a different thing from a tool call**, or the same thing named for a use case? This
  bears directly on how rungs describes skills routing to neighbouring skills.
- **Two implementations, one design.** Python and TypeScript versions exist, which makes this the
  only repo in the corpus where the same primitives were expressed twice. **Where the two diverge is
  evidence about which parts of the design were essential and which were the first language's
  idiom** — the cheapest such signal available anywhere in either corpus.

> Expectations from the project's positioning, not evidence. Confirm both repository URLs, both
> licenses, and whether the two implementations are genuinely at parity before treating a divergence
> as meaningful — one lagging the other is a release-timing fact, not a design finding.

## Decision

`accepted` — 2026-08-15. The user directed the remaining WI-009 children to proceed sequentially;
WI-012 is complete and this is the next planned child.

## Plan

### Requirements

- `docs/research/frameworks/openai-agents-sdk.md` on the
  [WI-010](WI-010-framework-extraction-template.md) template, eight sections answered.
- Snapshot pins **two** commit SHAs — one per implementation — plus license and read date for each.
- An explicit enumeration of the primitives, with what each covers and its escape hatch.
- A short Python/TypeScript divergence table, each row saying whether the difference is design or
  language idiom, with the reasoning.
- Section 8 cites pattern ids; candidates go to [WI-017](WI-017-framework-synthesis.md).

### Impacts

- One new document covering two repositories; one row in the frameworks index; site route and links.
- Bears on the maturity ladder in [`synthesis.md`](../../research/synthesis.md) — **read, not
  edited**; any ladder change is WI-017's to argue.

### Approach

**Read the two implementations against each other, not in sequence.** Take the primitive list from
one, then find each primitive in the other and record what changed. A repo read on its own produces
a summary; two read against each other produce a difference, and the difference is the finding.

**Treat the small surface as a hypothesis with a failure mode.** The question is not whether the API
is small — that is stated — but what users do when it is too small, which shows up in the escape
hatches, the "advanced" surface, and the issue tracker's shape rather than in the README.

### Acceptance criteria / tests

1. All eight sections answered; Snapshot carries a SHA, license and date **per implementation**.
2. The primitive list is complete as of the pinned SHAs, each entry with its escape hatch or an
   explicit "none found, here is where I looked".
3. The divergence table has at least one row, or an evidenced statement that the two are at parity.
4. The handoff-versus-tool-call question is answered from the source, not from the docs.
5. Opinion marked as opinion; every other claim carries a path or a quote.
6. `rungs check` passes; the site builds with links resolving.

### Out of scope

- **Anything about specific models, pricing, or provider APIs.** The subject is the agent
  abstraction; the model layer beneath it is not.
- **Hosted or platform-only features that cannot be read in the repo.** If a capability's
  implementation is not in the source, it is recorded as not inspectable rather than described from
  marketing material.
- **Adopting the SDK's vocabulary in rungs' own documents.** If the extraction suggests the naming is
  better, that is a proposal, and renaming a concept the catalogue defines is an ADR.
- **Cross-repo comparison and catalogue edits** — WI-017.

## Execution

Branch `feature/WI-013-extract-openai-agents-sdk`, cut from `main` 2026-08-15.

## Review

Self-review completed 2026-08-15 against every acceptance criterion:

1. **Pass.** [`openai-agents-sdk.md`](../../research/frameworks/openai-agents-sdk.md) answers all
   eight template sections and records a pinned SHA, licence, and read date for both repositories.
2. **Pass.** Section 2 defines the inventory boundary, enumerates every documented concept family
   plus the runner/state execution pair, and records an escape hatch for each.
3. **Pass.** Section 7 classifies four Python/TypeScript differences as language idiom or design
   surface, without inferring intent from a parity gap.
4. **Pass.** Section 4 traces handoff execution into the runner's ownership-changing state
   transition and contrasts it with the nested runner created by agent-as-tool.
5. **Pass.** Measurements are dated with commands, implementation claims cite pinned source, and
   judgement is labelled **Opinion.**
6. **Pass.** `node src/cli.ts check` passed 20/20 gates. In `site`, `npm run build` generated 58
   pages and `npm run check` reported 0 diagnostics and 510 internal links with 0 broken.
