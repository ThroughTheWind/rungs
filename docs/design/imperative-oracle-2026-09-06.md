# Imperative detection — the hand-classified oracle

> **Classified 2026-09-06 for [WI-061](../backlog/items/WI-061-imperative-staleness-detection.md),
> before any matcher existed**, from the candidate lines
> [`imperative-corpus-2026-08-17.md`](imperative-corpus-2026-08-17.md) collected. The grep is the
> corpus document's own — `\b(must|never|always|shall|required|mandatory|do not|don't)\b`, case
> insensitive, over each repo's `AGENTS.md` and `CLAUDE.md` — and the counts it produced today match
> the corpus document's exactly, at the commits below. Every verdict here was written by reading the
> line, not by running anything. The detector is measured against this document, never the reverse.

## Verdicts

Two verdicts and nothing in between. **rule**: the line instructs the agent (or constrains an
artefact the agent produces) — imperative mood, or a modal stating what must or must never be done.
**not-a-rule**: everything else — a heading whose qualifier says MANDATORY, a statement of fact
about the project or its history, a description of a tool or a document, a quoted or explanatory
sentence. A line is classified as a whole; a line that carries both a rule and narrative is a rule.

| Repository | Commit | Candidates | rule | not-a-rule | not-a-rule share |
| --- | --- | ---: | ---: | ---: | ---: |
| `hexguard` | `51b25da` | 10 | 9 | 1 | 10% |
| `hexguard-templates` | `d24cf0a` | 10 | 10 | 0 | 0% |
| `ai-cli` (this repo) | `6acfc39` | 24 | 19 | 5 | 21% |
| `rewind` | `71b0ef9` | 31 | 25 | 6 | 19% |
| `rift-forge-candidate` | `b1f4dd4b7` | 134 | 40 | 94 | **70%** |
| `axiom-mesh` | `3e1508a` | 0 | 0 | 0 | — |
| `gridforge` | `2645fbe` | 0 | 0 | 0 | — |

**The corpus document's impression was wrong for the one repository that dominates the count.** It
said "almost all of them are genuine imperatives"; that is true of the four small files and false of
`rift-forge-candidate`, whose `CLAUDE.md` runs to 1,368 lines and whose second half is project
history in which *never* and *always* are narrative ("Meraki has never served them", "a seed was
never a corpus reading"). A matcher tuned on the small files would have shipped at a 70% false
positive rate on the largest one — the WI-042 shape again, seen before the engine exists this time.

## Not-a-rule lines, by repository

Every candidate not listed here is a **rule**.

### `hexguard`

| Line | Why not a rule |
| --- | --- |
| `AGENTS.md:101` | design statement — "recording one must cost almost nothing" describes the register's purpose |

### `ai-cli`

| Line | Why not a rule |
| --- | --- |
| `AGENTS.md:56` | design statement (same sentence as hexguard's) |
| `AGENTS.md:75` | fact — "they do not prove actor identity" |
| `CLAUDE.md:16` | heading qualifier — `## The evidence rule (MANDATORY)` |
| `CLAUDE.md:65` | heading qualifier — `## Editing files from the shell (MANDATORY)` |
| `CLAUDE.md:83` | explanatory prose — "the earlier steps never ran" |

### `rewind`

| Line | Why not a rule |
| --- | --- |
| `AGENTS.md:42` | fact about setup — "Two directories are required to work here" |
| `AGENTS.md:52` | heading — `### 2.3 Apply the principles; do not re-ask what they answer` |
| `AGENTS.md:62` | fact inside a quotation — "they almost never do" |
| `AGENTS.md:199` | fact — "Codex and Claude do not share memory" |
| `CLAUDE.md:4` | description — "specifics that do not belong there" |
| `CLAUDE.md:12` | fact about setup — "are gitignored but required" |

Kept as rules, and worth stating because they are the arguable ones: `AGENTS.md:46` (a table cell
that instructs — "do not fabricate one"), `AGENTS.md:76` (a table cell — "Answer it. Never surface
it"), `CLAUDE.md:38` and `CLAUDE.md:44` (table rows constraining what a command and a subagent may
report — "structure only, never values").

### `rift-forge-candidate`

The **rule** lines, since they are the minority (40):

`AGENTS.md:11, 13, 15, 18` · `CLAUDE.md:22, 35, 38, 40, 42, 44, 45, 52, 53, 64, 71, 86, 100, 109,
112, 115, 127, 130, 132, 136, 145, 146, 153, 173, 194, 223, 248, 257, 286, 287, 288, 292, 322, 869,
880, 1162`.

The 94 **not-a-rule** lines, by shape:

| Shape | Lines | Example |
| --- | --- | --- |
| Heading qualifier | `CLAUDE.md:20, 94, 171, 229` | `## Engineering principles (MANDATORY for all development)` |
| Description of a document or process | `AGENTS.md:8` · `CLAUDE.md:84, 92, 218` | "Build-internals are never mirrored" |
| Project history and design narrative | `CLAUDE.md:325` through `CLAUDE.md:1365`, every candidate not listed as a rule (85 lines) | "Meraki has never served them"; "a value that was *always wrong*"; "never a second table" (as history, `837`; the same words at `869` are a rule) |
| Dev command line | `CLAUDE.md:1368` | `pnpm build:web · pnpm build:server …` |

## What the classification says about the matcher

Read *before* the matcher, these are the shapes it has to separate, in order of weight:

1. **Past-tense and narrative modals.** "was never", "had never", "never served", "never a X"
   (noun phrase), "is always reversible". Every one in this corpus is history. Rules use *never* and
   *always* at the head of a clause or after *must*.
2. **Headings.** Any `#` line is out.
3. **`do not` with a subject.** "they do not", "Codex and Claude do not", "the tests do not" are
   facts; "Do not restate" and "; do not lay out options" are rules. The subject pronoun or noun
   before *do not* is the separator.
4. **`required` and `mandatory` as adjectives** are almost always headings or setup facts here
   ("are required to work here", "gitignored but required"). The rules that use them also carry a
   stronger modal on the same line, so dropping the two words loses nothing this oracle contains.
5. **Design statements about the system** ("summing the parts must reproduce the previously
   published figure") are classified not-a-rule when they describe an invariant of the product
   rather than instruct the agent. A matcher cannot separate these from rules by form; they are
   the residual error to measure, not to engineer away.

## What this cannot tell you

- One operator's repositories, one classifier's reading. The four small files were read twice; the
  134 lines of `rift-forge-candidate` once, with the narrative region judged by shape.
- The verdicts are about *lines*, because the corpus was collected per line. A rule spanning two
  lines counts twice; a heading and the rule under it count separately.
- Zero candidates in `axiom-mesh` and `gridforge` remain the two repositories any "instruction files
  always carry unenforced rules" claim is falsified by.
