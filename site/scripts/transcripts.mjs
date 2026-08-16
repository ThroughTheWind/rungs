/**
 * Real command output, captured against fixtures the script builds itself.
 *
 * WI-046 / F-011. The `Console` component renders `date` and `source` as the
 * literal label **`real output · <command>`**, and nothing checked that the
 * lines beneath it had ever been produced. Two of the three blocks on the
 * landing page were fabricated when WI-040 found them — one showed `doctor`
 * emitting defect lines it did not emit until `--explain` shipped weeks later,
 * and an outside reviewer read it as a shipped capability.
 *
 * A page may show a **subset** of a command's output — the hero shows six lines
 * of a much longer `doctor` run — so the invariant is *every displayed line
 * appears in the capture, in order*, not equality. That catches invention, which
 * is the failure that happened, without forcing the page to print everything.
 *
 * Fixtures are built here rather than pointed at a repo on disk: a transcript
 * captured against the author's working tree is not reproducible by anyone else,
 * which is the same defect one level along.
 */
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const OUT = join(REPO, "site", "src", "generated", "transcripts.json");

const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

/**
 * Each fixture is a repo shape plus the command to run in it. Keyed by the
 * command exactly as the page's `source` names it, before the comma.
 */
const FIXTURES = {
  "npx @rungs/cli doctor": {
    build(dir) {
      execSync("git init -q .", { cwd: dir });
      writeFileSync(join(dir, "README.md"), "# demo\n");
      mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
      writeFileSync(join(dir, ".github", "workflows", "ci.yml"), "name: ci\n");
      execSync("git add -A && git commit -qm init", { cwd: dir });
    },
    args: (dir) => `doctor "${dir}"`,
  },
  "npx @rungs/cli add concurrency": {
    build(dir) {
      execSync("git init -q .", { cwd: dir });
      writeFileSync(join(dir, "README.md"), "# demo\n");
      execSync("git add -A && git commit -qm init", { cwd: dir });
    },
    args: (dir) => `add concurrency --into "${dir}"`,
  },
};

export function capture() {
  const out = {};
  for (const [command, fx] of Object.entries(FIXTURES)) {
    const dir = mkdtempSync(join(tmpdir(), "rungs-transcript-"));
    try {
      fx.build(dir);
      let raw;
      try {
        raw = execSync(`node src/cli.ts ${fx.args(dir)}`, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      } catch (e) {
        raw = e.stdout ?? "";
      }
      out[command] = {
        command,
        // The fixture, so a reader can rebuild it rather than trust the lines.
        fixture: fx.build.toString().replace(/\s+/g, " ").slice(0, 300),
        output: strip(raw).split("\n").map((l) => l.replace(/\s+$/, "")),
      };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  return out;
}

export function readTranscripts() {
  return JSON.parse(readFileSync(OUT, "utf8"));
}

/** Every `<Console>` on a page, with the command its `source` names. */
export function consoleBlocks(astro) {
  return [...astro.matchAll(/<Console\b([\s\S]*?)\/>/g)].map((m) => {
    const block = m[1];
    const source = /source=\{?"([^"]*)"/.exec(block)?.[1] ?? "";
    // A `cmd` line is the prompt echo — the command the reader is being shown,
    // not something the command printed. Checking it against its own output
    // fails every honest block.
    const lines = [...block.matchAll(/\{\s*type:\s*"(\w+)",\s*text:\s*"((?:[^"\\]|\\.)*)"/g)]
      .filter((t) => t[1] !== "cmd")
      .map((t) => t[2].replace(/\\"/g, '"'));
    return { source, command: source.split(",")[0].trim(), lines };
  });
}
