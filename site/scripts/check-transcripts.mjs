#!/usr/bin/env node
/**
 * Refuses a `<Console>` whose lines were never produced by the command it names.
 *
 * The component renders `real output · <command>`, so a block that invents a
 * line is a provenance claim the page cannot support — which is what happened
 * (F-011) and what an outside reviewer then believed.
 *
 * Checks the **committed** transcript, not a fresh run: the gate must work in a
 * pristine checkout and must not execute the CLI from inside `rungs check`.
 * Drift between the transcript and reality is caught by re-running
 * `npm run transcripts`, whose output is committed and diffable.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, readTranscripts, consoleBlocks } from "./transcripts.mjs";

let transcripts;
try {
  transcripts = readTranscripts();
} catch {
  console.error("check-transcripts: no captured transcripts. Run `npm run transcripts` in site/.");
  process.exit(1);
}

const pagesDir = join(REPO, "site", "src", "pages");
const problems = [];
let checked = 0;

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith(".astro"))) {
  for (const b of consoleBlocks(readFileSync(join(pagesDir, file), "utf8"))) {
    const t = transcripts[b.command];
    if (!t) {
      problems.push(`${file}: Console claims "${b.command}" and no transcript captures it`);
      continue;
    }
    checked++;
    let at = 0;
    for (const line of b.lines) {
      const want = line.trim();
      if (!want) continue;
      // Substring, not equality: a console box is narrow and a page may wrap one
      // long emitted line across two displayed ones — `add concurrency` prints
      // its threshold refusal and the `--confirm-threshold` hint on a single
      // line. Requiring equality rejected an honest block.
      const found = t.output.findIndex((o, i) => i >= at && o.trim().includes(want));
      if (found === -1) problems.push(`${file}: "${want}" is not in the captured output of \`${b.command}\``);
      else at = found;
    }
  }
}

if (problems.length) {
  console.error(`check-transcripts: ${problems.length} console line(s) claim output that was never produced:`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("\nRe-run `npm run transcripts` in site/ if the command's output changed, or fix the page.");
  process.exit(1);
}
console.log(`check-transcripts: ${checked} console block(s) match their captured command output`);
// Pins, on every run. Green here is not "the page is true", it is "no displayed
// line is absent from a capture", and those differ in three stated ways.
console.log("  It does not check that the capture is current — re-run `npm run transcripts` for that.");
console.log("  It matches each line as a substring, so a page may wrap or trim a long emitted line.");
console.log("  It says nothing about lines a page chose to omit: a subset is allowed, by design.");
