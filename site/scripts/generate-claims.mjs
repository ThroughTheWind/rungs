#!/usr/bin/env node
/**
 * Writes site/src/generated/claims.json. Run after anything that changes gates,
 * modules or profiles — `npm run claims` in site/.
 *
 * This one **does** run `rungs check`, and `check-claims.mjs` deliberately does
 * not: this is a manual step, that one is a gate the runner executes, and a gate
 * that invokes its own runner is a recursion rather than a verification.
 *
 * Generating the run result too is the difference between a number that is
 * stale and a number that cannot be. Typed by hand, `22 pass` sat next to a
 * derived `23 gates register` within minutes of the derivation landing.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { derive, OUT, REPO } from "./claims.mjs";

const claims = derive();

const raw = execSync("node src/cli.ts check", { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const line = raw.replace(/\x1b\[[0-9;]*m/g, "").match(/(\d+) pass · (\d+) fail · (\d+) unimplemented · (\d+) error/);
if (!line) {
  console.error("generate-claims: could not read a summary line from `rungs check`. Its output shape changed.");
  process.exit(1);
}
claims.run = {
  pass: Number(line[1]), fail: Number(line[2]), unimplemented: Number(line[3]), error: Number(line[4]),
  at: new Date().toISOString().slice(0, 10),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(claims, null, 2)}\n`);
console.log(
  `generate-claims: ${claims.gateCount} gates (+${claims.hookCount} hook), ${claims.modules.length} modules, ` +
    `${claims.profiles.length} profiles · run ${claims.run.pass} pass ${claims.run.fail} fail on ${claims.run.at}`,
);
