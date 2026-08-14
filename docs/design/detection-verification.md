# Detection verification

> Run 2026-08-14 with `rungs doctor` against the four source repositories at the working-tree
> states surveyed in [`docs/research/`](../research/README.md). This is
> [ADR-0004 §5](../decisions/ADR-0004-adoption-detection.md)'s acceptance criterion —
> *a module whose `[detect]` block misclassifies any of the four is not finished* — pulled
> forward from Phase 6 because detection was the riskiest unverified claim in the design.

**Reproduce:** `node src/cli.ts doctor <path>`

---

## 1. Result

`A` present · `**P** n` present with *n* artifacts adoptable as `command` gates or a prompt library ·
`¶` different paradigm, reported not acted on · `—` absent

| Module | Rung | rift-forge | hexguard | hexguard-templates | axiom-mesh |
| --- | --- | --- | --- | --- | --- |
| `instructions` | 0 | A | A | A | A |
| `adr` | 1 | A | A | — | A |
| `backlog` | 1 | A | A | A | **¶** |
| `ci` | 1 | A | A | A | A |
| `findings` | 1 | A | — | — | A |
| `gates` | 1 | **P** 16 | — | — | **P** 7 |
| `session` | 1 | — | — | — | A |
| `audit` | 2 | — | A | A | — |
| `skills` | 2 | A | **P** 3 | — | **P** 22 |
| `specs` | 2 | A | — | A | **¶** |
| `workflows` | 2 | — | A | A | — |
| `design-sync` | 3 | A | **¶** | — | — |
| `release` | 3 | A | A | A | — |
| `doc-authority` | 4 | A | — | — | **P** 1 |
| `concurrency` | 5 | A | — | — | — |

**The cells the whole product rests on came out right:**

- **`gates` on rift-forge → P 16.** It has more gate machinery than anyone and no ledger, and
  detection finds its validators adoptable as `command` gates without proposing to touch one.
- **`gates` on axiom-mesh → P 7.** The PowerShell validators, in a repo with no root
  `package.json`, adopt without a Node dependency — which is what ADR-0002 was for.
- **`doc-authority` on axiom-mesh → P 1**, matching its ownership registry as
  `registry-without-gates`: the hard part already done, the enforcement missing.
- **`backlog` on axiom-mesh → ¶**, correctly refusing to act on a milestone system.
- **`skills` on axiom-mesh → P 22.** Better than the catalog predicted, which said *create*. The
  21 playbooks are adoptable now that the format is an open standard.
- **`concurrency`** discriminates cleanly: 21 custom merge-driver declarations in rift-forge, zero
  in the other three.

## 2. Seven bugs, all found by running

None of these were visible from reading the manifests. Each is fixed and re-verified.

| # | Bug | Consequence | Fix |
| --- | --- | --- | --- |
| 1 | **`adopt_as` matches did not set state** | **`gates` reported *absent* on rift-forge** — the catalogue's single headline case, invisible | An `adopt_as` match is ADR-0004 state 4: the function exists in a shape we can map |
| 2 | Paradigm evaluated even when paths matched | rift-forge's pulled design mirror reported as *both* an external authority and an in-repo design system, on a `theme.ts` the pattern never meant to reach | Paradigm is consulted only when nothing else matched |
| 3 | `audit` matched `*-audit-*.md` anywhere | Hit `WI-108-…-audit-epic.md` and a launch-readiness epic — **work items, not audits** | Narrowed to a dedicated audits directory |
| 4 | `findings` inferred by frequency | Proposed `WI` — the *backlog's* prefix — because a register cites work items more than it defines its own ids, 787 to 722 | An `anchor` on the register's own `NEXT-*` marker wins outright |
| 5 | `\b([A-Z]{1,6})-\d` matched inside compound ids | Proposed `US` on hexguard-templates from `FOUND-US-110` — **exactly the false positive ADR-0004 was written about**, arriving through inference instead of presence | Negative lookbehind `(?<![A-Za-z0-9-])` |
| 6 | Encodings share the id shape | Proposed `UTF` (32 matches, from `UTF-8`) as hexguard's backlog prefix | `exclude_values` stoplist |
| 7 | `.gitattributes` as a `concurrency` signature | Reported axiom-mesh — 29 branches, no land protocol — as having concurrency tooling. **A signature matching nearly every repo is not a signature** | Scan the file's *content* for a custom merge driver via new `marker_paths` |

Two module signatures were also widened after the run: `adr` missed hexguard's four decisions in
`docs/.ai/decisions/` (glob was `docs/decisions/**`), and `specs` lost an inference rule that
proposed a *prefix* for a parameter whose value is a *shape*.

## 3. What the run does not establish

- **The A-versus-P distinction is not measured.** Detection reports presence and adoptable
  artifacts; whether an existing system is a superset, a partial, or a near-miss is a per-artifact
  judgement, and per-artifact detection is **not implemented**. The catalogue's expectation matrix
  predicts completeness this run cannot confirm or refute.
- **`workflows` reads absent on rift-forge and axiom-mesh**, where the catalogue expected partial.
  Both have decision procedures — in skills and in 21 prompt playbooks — but neither has a plan-
  document tree, which is what the signature looks for. Left as-is: under-detection is the chosen
  bias, and widening this one would start matching any directory of markdown.
- **Nothing was installed.** `add`, `render` and `check` do not exist yet, so the claim that
  adopting rift-forge's gates yields a ledger *without touching its files* remains a design intent.
- **Detection says nothing about quality**, only that files are where a module's files would be.

## 4. Verdict against the acceptance criterion

**Met for presence and paradigm; not yet testable for completeness.** Every paradigm case is
correctly refused, every adoptable case is correctly surfaced, and no module claims a repo it does
not have. The A/P refinement waits on per-artifact detection.
