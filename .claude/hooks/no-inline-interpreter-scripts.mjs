#!/usr/bin/env node
/**
 * PreToolUse hook: refuse a multi-line script passed to an interpreter on the
 * command line or through a heredoc.
 *
 * `CLAUDE.md` § "Editing files from the shell" has required script files rather
 * than `-e` strings since before this repo shipped, and the rule was still
 * broken on 2026-08-16 during WI-038 — `python - <<'PY'` to apply three token
 * replacements to `src/explain.ts`. Python is not installed here, so the
 * interpreter never ran; the file was left 8,486 bytes of NUL, and because it
 * was untracked git had nothing to restore. `file src/explain.ts` said `data`.
 *
 * The rule already existed and was read. CLAUDE.md's own instruction for that
 * case is *"do not restate it — make it mechanical"*, and it names shipping the
 * hook as the mechanical form. This is it.
 *
 * What is deliberately still allowed, because the failure was never about
 * length alone:
 *   - a **single-line** `-e` / `-c` / `-pe` expression, which rule 1 permits and
 *     which is how you re-derive a count without writing anything;
 *   - heredocs that do not feed an interpreter — `git commit -F-`, `cat > x`.
 */
import { readFileSync } from 'node:fs';

const INTERPRETERS = String.raw`node|python3?|perl|ruby|php|deno|bun|pwsh|powershell`;

/** A heredoc feeding an interpreter, quoted or not: `python - <<'PY'`, `node <<EOF`. */
const HEREDOC = new RegExp(String.raw`\b(?:${INTERPRETERS})\b[^\n;|&]*<<-?\s*['"\\]?\w+`);

/** An inline script flag whose body then runs past the end of the line. */
const INLINE_FLAG = new RegExp(String.raw`\b(?:${INTERPRETERS})\b[^\n]*\s-{1,2}(?:e|c|pe|ne|Command)\b`);

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0); // A hook that cannot read its input must not block the session.
}

if (payload.tool_name !== 'Bash') process.exit(0);
const command = payload.tool_input?.command ?? '';

const heredoc = HEREDOC.test(command);
const multilineInline = INLINE_FLAG.test(command) && /\n/.test(command);
if (!heredoc && !multilineInline) process.exit(0);

process.stderr.write(
  `Blocked: this pipes a multi-line script into an interpreter, which CLAUDE.md § "Editing files\n` +
    `from the shell" refuses.\n\n` +
    (heredoc
      ? `  Found: a heredoc feeding ${'`'}${(command.match(new RegExp(INTERPRETERS)) ?? ['an interpreter'])[0]}${'`'}.\n`
      : `  Found: an inline -e/-c script spanning more than one line.\n`) +
    `\nWhy: the interpreter may not exist on this machine (python does not, here), the shell may\n` +
    `expand backticks and $ inside the body, and either way a half-written source file exits 0 or\n` +
    `leaves bytes nobody reads. Measured 2026-08-16: src/explain.ts left as 8,486 NUL bytes.\n\n` +
    `Instead:\n` +
    `  - Editing a file? Use the Edit or Write tool. That is what they are for.\n` +
    `  - Need a real script? Write it to the scratchpad as a file, then run that file.\n` +
    `  - Re-deriving a count? A single-line -e expression is still allowed.\n`,
);
process.exit(2);
