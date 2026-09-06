---
id: WI-096
title: Anchor the private inline-interpreter hook to the interpreter's own arguments
type: chore
status: done
branch: feature/WI-096-hook-flag-anchoring
created: 2026-09-06
updated: 2026-09-06
related: [WI-086, WI-085]
epic:
children: []
---

## Proposal (rationale)

F-060: the repository's private PreToolUse hook `.claude/hooks/no-inline-interpreter-scripts.mjs`
matches an inline-script flag anywhere after an interpreter token on the same line, so
`node src/cli.ts check … && git -c user.name=x commit …` and `node script.mjs && grep -c pattern
file` are blocked whenever the command spans lines. It also reads flags inside a heredoc body that
is being written to a file, so `cat > script.sh <<'EOF'` whose content contains `node -e '…'` is
blocked although nothing is piped into an interpreter. Measured 2026-09-06: three legitimate
commands blocked in one session, each rewritten to dodge the pattern.

## Decision

`accepted` — 2026-09-06, at the user's request to tackle F-059 to F-063. Anchor the flag match to the
interpreter's own argument list and ignore heredoc bodies that are not fed to an interpreter; keep
every refusal the hook exists for.

## Plan

### Requirements

- An inline flag counts only when it follows the interpreter token within the same command segment
  (no `&&`, `||`, `;`, `|` between them).
- A heredoc body is stripped before the inline-flag test; a heredoc that feeds an interpreter is
  still refused from the original text.
- Still refused: a multi-line `-e`/`-c` script, `python - <<'PY'`, `node <<EOF`.
- Still allowed: single-line `-e`, `git commit -F-`, `cat > x <<'EOF'` with any body.

### Impacts

- `.claude/hooks/no-inline-interpreter-scripts.mjs`, `test/core.test.js` (a test that drives the hook
  with payloads).

### Approach

Bound the regex segment with `[^\n;|&]*` and strip `<<DELIM … DELIM` bodies before applying it.
Alternative — a shell parser — rejected as disproportionate for a private hook.

### Acceptance criteria / tests

1. A core test spawns the hook with nine payloads: the four refusals above exit 2 with the hook's
   message; the five allowed forms exit 0; a non-Bash tool exits 0.
2. Serial suite and `rungs check` pass.

### Out of scope

- Shipping this hook as a module (roadmap Phase 5 candidate); nothing else deferred.

## Execution

Branch `feature/WI-096-hook-flag-anchoring` from `4f9f1603`, 2026-09-06. As planned. The heredoc
stripper keeps the `<<DELIM` line itself so the `HEREDOC` refusal, which runs on the original text,
and the position of any following command are unaffected; only the body between the delimiter line
and its terminator is removed before the inline-flag test.

## Review

1. `node --test --test-name-pattern '^the private inline-interpreter hook' test/core.test.js`: 1/1
   (2026-09-06) — refused with exit 2: multi-line `node -e`, multi-line `python3 -c`, `python - <<'PY'`,
   `node <<EOF`; allowed with exit 0: single-line `-e`, `node … && git -c … commit` over two lines,
   `node … && grep -c …` over two lines, a `cat > file <<'EOF'` whose body names `node -e`, and
   `git commit -F- <<'EOF'`; a non-Bash tool exits 0.
2. `npm test`: 156 tests, 153 pass, 0 fail, 3 skipped, 150 s. `node src/cli.ts check`: 32 pass after
   archiving (the one pre-archive failure was the closure row's link to this item's archive path).
