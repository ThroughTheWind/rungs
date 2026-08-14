# Prompt — design system for the rungs web surfaces

> Phase 7 working artifact, written 2026-08-14. **Authoritative for:** nothing. It is a prompt;
> the design system it asks for is the thing that becomes authoritative. Paste this file whole
> into a fresh Claude session opened at the repo root.

---

## 0. Read first

In this order. Do not skip them and do not work from this prompt's summaries — the design
system's only job is to carry what is in these files, and a summary of a source is a claim about
the source, not the source.

| File | Take from it |
| --- | --- |
| [`README.md`](../../README.md) | What rungs is, the four source repos, the seven phases, the honest status paragraph |
| [`CLAUDE.md`](../../CLAUDE.md) | The evidence rule. **Read it as a design constraint, not a doc convention** — §2 below explains why |
| [`docs/design/product-brief.md`](product-brief.md) | §4 module boundary and its rung warning · §6 CLI surface · §8 non-goals |
| [`docs/research/synthesis.md`](../research/synthesis.md) §5 | The maturity ladder. It is the product's name and its central metaphor |
| [`docs/research/pattern-catalog.md`](../research/pattern-catalog.md) | The densest page the wiki has to render. If the type system survives §A, it survives everything |
| [`docs/design/module-catalog.md`](module-catalog.md) §1, §4 | The 15 modules, the dependency graph, the 5 install profiles |
| [`docs/decisions/ADR-0006`](../decisions/ADR-0006-the-name.md) | Why the tool is called `rungs`, and the 28-name free list — which doubles as a mood board (§6) |

Then load the `frontend-design` skill.

---

## 1. What you are designing

Three surfaces, one system. They share tokens and components; they do not share layout.

1. **Landing** — for a developer with a repo that already exists who has hit one of the eight
   failure modes and wants the fix without inventing it (brief §2). Retrofit is the primary case,
   not `init`. The page has to make `npx @rungs/cli add <module>` and `rungs doctor` legible in about
   twenty seconds.
2. **Wiki** — the research corpus and the module reference, published. Long-form, table-dense,
   heavily cross-linked, and written under the one-definition-per-concept rule: the pattern
   catalog *defines*, every other page *cites*. That distinction has to be visible in the design
   or the rule stops holding on the web.
3. **Contribute** — how to author a module, submit a pattern, and pass the admission checks.
   Extraction discipline, the evidence rule, the shell-editing rules, instruction-hardening.

---

## 2. Why this is not a generic developer-tool site

rungs' entire claim is epistemic: *this content was paid for once already, and every sentence
tells you who paid and what it cost.* CLAUDE.md enforces it in prose — every claim is either
evidenced (a file path, a commit, a measured count, a quoted rule) or visibly marked as opinion.

A design system that treats provenance as body text throws away the product. Worse, a
conventional marketing page would break the evidence rule **on the marketing page**, which is the
funniest available way for this project to fail.

So the brief is not "make it look good." It is: **make provenance, rung, cost, and staleness into
affordances** — things you can see at a glance and cannot accidentally omit — and then make that
look good.

---

## 3. Six primitives the system must define

These are not decoration. Each one exists because a source repo paid for its absence.

| Primitive | Values | Appears on | The rule the design must not break |
| --- | --- | --- | --- |
| `rung` | 0–5, ordinal, **cumulative** | every module, every pattern, install profiles, the ladder | Rung 5 is a **cost warning, not a tier**. A ramp where 5 reads as premium inverts brief §4: *"Selling rung 5 to a rung 1 repo is the most likely way this tool does harm."* |
| `source` | `AM` · `HG` · `HT` · `RF` · `4/4` · none | every pattern row, most wiki claims | `4/4` (four independent repos converged) is the strongest claim in the corpus and must read stronger than one mark. **None is a real value**, not missing data — see the specimen in §4 |
| `evidence` / `opinion` | binary, exhaustive | every claim in the wiki | An **unmarked** claim must look wrong. CLAUDE.md's reasoning: the next reader treats unmarked as measured |
| `measurement` | count **+ date + the command that produced it** | every number on every surface | No component may render a number without its date. `rift-forge` shipped 7 false population claims out of 11 because the numbers moved and the sentences did not |
| `cost` | prose, e.g. *"~1 hour, then near-zero"*, *"a script + its self-test, each"* | rungs, modules, patterns | Cost sits **adjacent to the capability**, never quarantined in a pricing section. A pattern recorded without its cost gets recommended to repos that cannot afford it |
| `enforcement` | `gated` \| `review-only` | every generated rule | Exactly two states, **no default and no absent state**. This is the product's `enforcement-declaration` |

**The last row is the design system's own governing rule.** All four source repos had a silent
third category — rules nobody checked and nobody had marked as unchecked. Inherit the fix:
**no component may render metadata-bearing content in a neutral state when its metadata is
missing.** Missing provenance must be loud. Design the failure state before the happy state.

---

## 4. Real specimens — design against these, never against lorem ipsum

Every one is verbatim from the repo. Several are deliberately awkward; those are the test.

**A pattern row where the source is a counter-example.** Not missing data — the absence *is* the
finding, and it carries a measurement:

```text
| core-size-budget | The always-loaded core has a declared line budget; overflow
  routes to a scoped guide | *(none — RF counter-example at 1513)* | 2 |
```

**A pattern row at maximum claim strength**, which must not look like the same badge:

```text
| entry-point | One canonical agent-instruction file: identity · non-negotiables ·
  repo map · routing. Everything else links to it | 4/4 | 0 |
```

**The rung check — the interaction the product name exists to make legible.** This is the
landing page's best demo and probably its hero:

```console
$ npx @rungs/cli add concurrency
  concurrency is rung 5 (~5+ concurrent sessions).
  This repo shows 1 active session. Install anyway? [y/N]
```

**`doctor` findings**, which are the research made detectable:

> *"you have an audit skill and no findings register"* · *"this rule says MANDATORY and has no
> gate"* · *"14 near-identical release workflows"*

**A measurement done right** (ADR-0006): *84 candidate names checked on 2026-08-14 with
`npm view <name> version`. 56 taken, 28 free.* — count, date, and command in one line.

**An opinion, marked** (ADR-0006): *"Opinion, mine, offered as opinion: every one of the 28
available candidates could have been argued for, and the choice among them is judgement, not
measurement."* First person, and visibly not a measurement.

**The status paragraph the landing page must not soften** (README): *31 gates register and all 31
have engines — 28 pass, 2 fail, 0 unimplemented.* Two failing gates go on the site. Make honest
failure read as confidence rather than as a broken build; that is a real design problem and
solving it well is most of the personality.

**A dependency chain**, each arrow earned by a repo violating it: `audit → findings → backlog`

**A managed merge marker**, which appears inside the user's own files:
`<!-- rungs:begin backlog@1.0.0 -->`

**Also handle:** the output-contract file tree (brief §5), ADR status chips with revisit triggers,
the 15-module dependency graph, the 5 install profiles as a progression, and the four source repos
with their period, scale, workflow style, and stack.

---

## 5. Hard constraint — the wiki is generated from markdown that already exists

`docs/research/`, `docs/design/`, and `docs/decisions/` are the wiki. Their authors will keep
writing plain markdown, and the evidence rule already costs them something.

**Prefer conventions detectable from plain markdown over hand-authored component wrappers.** A
`Rung` column header, a `4/4` token in a `Src` cell, a `> **Opinion:**` blockquote prefix, an
`ADR-####` string — these can all be picked up by a build step. Every component that requires an
author to remember custom syntax is a component that will be forgotten, and a provenance affordance
that is forgotten is worse than none, because now the unmarked claim looks intentional.

Deliver this as an explicit **markdown → component mapping table**, and flag anything that
genuinely cannot be inferred.

---

## 6. Aesthetic raw material

Do not take this as a prescription — it is the vocabulary the project already speaks, offered so
the direction comes from the repo rather than from a template.

The name shortlist in ADR-0006 is effectively a mood board: *rungs, rootstock, trodden, ropewalk,
benchdog, trysquare, ratline, paveway, jigwork, truing, bracing, asbuilt, snagging, wellworn*.
Workshop, surveying, construction, as-built drawings. Things that measure, brace, and record what
was actually built against what was drawn. The project is about **retrofit** — reinforcing a
structure that already stands, and being honest about which parts you did not touch.

The tone is dry, exact, first-person about opinions, and unembarrassed about failure. It is not
playful and not corporate.

---

## 7. Anti-goals

- No gradient hero, glassmorphism, floating 3D geometry, or AI-purple-to-cyan.
- No three feature cards reading Fast / Simple / Powerful.
- No logo wall or "trusted by" strip. The four source repos are private, and there are no users
  yet — inventing social proof is an unevidenced claim on the page that argues for evidence.
- No animated terminal typing out a fake command. If a terminal moves, it shows real output.
- No number without a date, anywhere, including the landing page.
- Do not make rung 5 aspirational, and do not use a green→red ramp; higher is not worse, it is
  more expensive.
- Do not hide what is unresolved. As of 2026-08-14 that is the marker-prefix coupling
  ([ADR-0006](../decisions/ADR-0006-the-name.md)'s open follow-up) and Phase 5's incompleteness —
  **name the open items rather than a count**, because this line previously read "the 2 failing
  gates, the unclaimed npm name" and both had ceased to be true without the sentence moving.
- Do not restate a pattern's definition on a page that should cite it — including in a hero.

---

## 8. Deliverables, in two steps

**Step 1 — stop and wait for a choice.** Three genuinely distinct directions, each as: one
paragraph of argument tied to §2, a type pairing, a nine-value palette sketch with the rung ramp
worked out, and the one specimen from §4 it handles best. Say which you would ship and why. Do
not build anything yet.

**Step 2 — after a direction is chosen**, build it out:

1. `docs/design/web/design-system.md` — principles, tokens, type scale, color (light **and**
   dark), spacing, and every component with its rules and its **missing-metadata failure state**.
2. A tokens file — CSS custom properties, no external font or CDN dependency.
3. A single self-contained HTML specimen sheet rendering every component against the §4 content
   verbatim, so the system can be judged rather than described.
4. Three page templates: the landing page; one wiki article using pattern-catalog §A **unedited**;
   the contribute index.
5. The §5 markdown → component mapping table.
6. Open questions, and what you decided by judgment versus by constraint.

**The design doc obeys CLAUDE.md.** Aesthetic choices are opinion and get marked as opinion in the
first person. Choices forced by a content constraint cite the constraint. "Blue conveys trust,"
unmarked, would fail this repo's own review.

---

## 9. Acceptance check — answer each one explicitly before you finish

1. Does pattern-catalog §A render without horizontal scroll at 390px?
2. Does rung 5 read as expensive rather than as premium?
3. Is there any component that can render a count without its date? If yes, that is a bug.
4. Does an unmarked claim look wrong next to a marked one?
5. Can a reader tell a canonical definition from a citation to one, without reading the prose?
6. Does `4/4` read as stronger than `RF`, and does the `core-size-budget` counter-example row read
   as a finding rather than as a gap?
7. Does the wiki work with JavaScript disabled?
8. Light and dark both complete, both with explicit backgrounds?
9. WCAG 2.1 AA on contrast, focus, and target size?
10. Would someone who has read the repo recognise the site as belonging to it — and would someone
    who has not, still be told exactly what is unfinished?
