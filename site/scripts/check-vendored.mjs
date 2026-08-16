/**
 * F-003. `VENDORED.md` records a sha per vendored file and nothing re-read one,
 * so the directory that says "do not edit any file here" could be edited and its
 * own provenance line would not say so.
 *
 * Measured 2026-08-15: `npm run vendor` changed exactly one tracked file,
 * `components/core/Console.d.ts`. `VENDORED.md` at `a006b5c` already listed that
 * file at `703ccb58f7e1` — the sha of the *new* text — while the committed file
 * hashed to `8c3fddb45c14`. The tracked copy had been hand-edited after
 * generation, and the record that disproved it sat in the same commit, unread.
 *
 * Nobody re-reads a sha by hand. That is the whole argument for the check.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DS = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "design-system");
const RECORD = join(DS, "VENDORED.md");

// Same function as the generator (`vendor-design-system.mjs`), deliberately
// duplicated rather than imported: a checker that shares the producer's hashing
// cannot detect the producer hashing wrongly, and this repo has already shipped
// one verification that agreed with the thing it was checking (WI-042).
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);

const lines = readFileSync(RECORD, "utf8").split("\n");
const entries = lines.flatMap((l) => {
  const m = /^-\s+`([^`]+)`\s+·\s+`?([0-9a-f]{12})`?\s*$/.exec(l.trim());
  return m ? [{ file: m[1], recorded: m[2] }] : [];
});

if (!entries.length) {
  console.error("check-vendored: VENDORED.md lists no file shas. The record's shape changed.");
  process.exit(1);
}

const bad = [];
for (const { file, recorded } of entries) {
  let actual;
  try {
    actual = sha(readFileSync(file.startsWith("public/") ? join(DS, "..", "..", file) : join(DS, file), "utf8"));
  } catch {
    bad.push(`${file}: listed in VENDORED.md and missing from disk`);
    continue;
  }
  if (actual !== recorded) bad.push(`${file}: recorded ${recorded}, on disk ${actual}`);
}

if (bad.length) {
  console.error(`check-vendored: ${bad.length} of ${entries.length} vendored file(s) do not match their record:`);
  for (const b of bad) console.error(`  ${b}`);
  console.error("\nEither the directory was hand-edited (re-run `npm run vendor`), or the record is stale.");
  process.exit(1);
}

console.log(`check-vendored: ${entries.length} vendored file(s) match their recorded sha`);
