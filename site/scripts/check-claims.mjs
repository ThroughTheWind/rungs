#!/usr/bin/env node
/**
 * Refuses a generated snapshot that no longer matches the repo.
 *
 * The snapshot is committed so a pristine checkout builds without the CLI; this
 * is what stops that convenience becoming a stale claim. Same shape as
 * `check-vendored`, which already guards the vendored design system.
 */
import { derive, readSnapshot, OUT } from "./claims.mjs";

let snapshot;
try {
  snapshot = readSnapshot();
} catch {
  console.error("check-claims: no generated claims. Run `npm run claims` in site/.");
  process.exit(1);
}

const now = derive();
const diffs = [];
const cmp = (label, a, b) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(`${label}: snapshot ${JSON.stringify(a)} vs repo ${JSON.stringify(b)}`);
};

cmp("gateCount", snapshot.gateCount, now.gateCount);
cmp("gateIds", snapshot.gateIds, now.gateIds);
cmp("hookIds", snapshot.hookIds, now.hookIds);
cmp("reportOnlyIds", snapshot.reportOnlyIds ?? [], now.reportOnlyIds);
cmp("modules", snapshot.modules.map((m) => `${m.name}@${m.rung}@${m.version}`), now.modules.map((m) => `${m.name}@${m.rung}@${m.version}`));
cmp("profiles", snapshot.profiles.map((p) => `${p.name}:${p.modules.length}`), now.profiles.map((p) => `${p.name}:${p.modules.length}`));

if (diffs.length) {
  console.error(`check-claims: ${diffs.length} claim(s) on the site no longer match the repo:`);
  for (const d of diffs) console.error(`  ${d}`);
  console.error("\nRun `npm run claims` in site/ and commit the result.");
  process.exit(1);
}
console.log(`check-claims: ${now.gateCount} gates, ${now.modules.length} modules, ${now.profiles.length} profiles — all match`);
