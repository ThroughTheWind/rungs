/**
 * rehype-rungs — the markdown → component mapping table, as code.
 *
 * The wiki is generated from plain markdown that already exists in `docs/`, and its authors keep
 * writing plain markdown. So every rule here detects a convention that is already in the source;
 * none of them require an author-side wrapper. See the design system's readme, "Markdown →
 * component mapping", which this file implements.
 *
 * It emits the same class names the React components emit, and `components.css` (extracted from
 * those components at vendor time) styles both. That is what lets the wiki ship zero JavaScript.
 *
 * RULES below is the honest inventory: `done` rules run, `todo` rules do not. There is no third
 * state, which is the same rule the product enforces on itself.
 */
import { fileURLToPath } from "node:url";
import { visit } from "unist-util-visit";
import { routeForDoc } from "../lib/routes.mjs";

export const RULES = [
  { id: "pattern-table", status: "done", detects: "table with id · pattern · src · rung headers" },
  { id: "source-mark", status: "done", detects: "4/4 · AM/HG/HT/RF · (none — … counter-example …) in a src cell" },
  { id: "rung-badge", status: "done", detects: "0–5 in a rung cell; anything else renders RUNG UNSTATED" },
  { id: "console", status: "done", detects: "```console fence — undated, so it renders the loud caption" },
  { id: "enforcement-tag", status: "done", detects: "`gated` / `review-only` inline code" },
  { id: "adr-chip", status: "done", detects: "a standalone ADR-#### link in a cell or list item" },
  { id: "opinion-claim", status: "done", detects: "emphasis or blockquote opening with 'Opinion'" },
  { id: "callout", status: "done", detects: "blockquote opening with ⚠️ Known gap / **Amended <date>**" },
  { id: "doc-links", status: "done", detects: "relative *.md hrefs — rewritten to wiki routes or GitHub" },
  { id: "measurement", status: "todo", detects: "count + date + command in prose — needs a regex pass with a false-positive budget" },
  { id: "title-block", status: "todo", detects: "'Authoritative for:' scope headers — currently supplied by the layout from frontmatter" },
];

const REPO = "https://github.com/ThroughTheWind/rungs/blob/main/";

/** Repo root — this file sits at <root>/site/src/plugins/. Source paths arrive absolute. */
const ROOT = fileURLToPath(new URL("../../../", import.meta.url)).replace(/\\/g, "/").replace(/\/$/, "");
const SOURCES = new Set(["AM", "HG", "HT", "RF"]);

const el = (tagName, properties = {}, children = []) => ({ type: "element", tagName, properties, children });
const txt = (value) => ({ type: "text", value });

function text(node) {
  if (!node) return "";
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(text).join("");
}

const cells = (row, tag) => (row?.children ?? []).filter((c) => c.type === "element" && c.tagName === tag);
const addClass = (node, ...names) => {
  const have = node.properties.className ?? [];
  node.properties.className = [...(Array.isArray(have) ? have : [have]), ...names];
};

/* --- src cell -------------------------------------------------------------------------------
 * 4/4 is the strongest claim in the corpus and must not look like one repo's mark. A
 * counter-example is a finding, not a gap. Nothing at all is loud. Anything that does not parse
 * is left exactly as authored — the mapping table's own note is that only mechanically
 * detectable things may be rendered as verified. */
function sourceMark(raw) {
  const s = raw.trim();
  if (!s) return el("span", { className: ["rgs-src", "rgs-src-missing"] }, [txt("unsourced")]);
  if (s === "4/4") {
    return el("span", { className: ["rgs-src"], title: "four independent repos converged" }, [
      el("span", { className: ["rgs-src-44"] }, [txt("4/4")]),
    ]);
  }
  const none = s.match(/^\(?\s*none\s*[—–-]\s*(.+?)\s*\)?$/i);
  if (none) return el("span", { className: ["rgs-src", "rgs-src-none"] }, [txt(`none — ${none[1]}`)]);

  const tokens = s.split(/[,·/\s]+/).filter(Boolean);
  if (tokens.length && tokens.every((t) => SOURCES.has(t))) {
    return el("span", { className: ["rgs-src"] }, tokens.map((t) => el("span", { className: ["rgs-src-one"] }, [txt(t)])));
  }
  return null; // unparsed — render as authored rather than assert a strength it might not have
}

/** Hatch density is cost of upkeep, so rung 5 reads expensive. A missing rung is loud. */
function rungBadge(raw) {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 0 || n > 5) {
    return el("span", { className: ["rgs-rung-missing"] }, [txt("rung unstated")]);
  }
  return el("span", { className: ["rgs-rung-sm"] }, [
    el("i", { style: `background:var(--hatch-r${n})` }, []),
    txt(String(n)),
  ]);
}

function isPatternTable(table) {
  const head = table.children.find((c) => c.type === "element" && c.tagName === "thead");
  const headers = cells(head?.children?.find((r) => r.tagName === "tr"), "th").map((c) => text(c).trim().toLowerCase());
  return headers.length === 4 && headers[0] === "id" && headers[2] === "src" && headers[3] === "rung";
}

/**
 * Resolve a relative markdown link to its wiki route, or to GitHub when the target is not
 * published. `routeForDoc` is shared with content.config.ts so the two cannot disagree about
 * where a document lives.
 */
function rewriteHref(href, fromDir) {
  if (/^([a-z]+:|\/\/|#|\/)/i.test(href)) return href;
  const [path, hash] = href.split("#");
  if (!path.endsWith(".md")) return href;

  const parts = [...fromDir.split("/").filter(Boolean)];
  for (const seg of path.split("/")) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }

  const repoRel = parts.join("/");
  const route = routeForDoc(repoRel);
  return (route ?? REPO + repoRel) + (hash ? `#${hash}` : "");
}

export function rehypeRungs() {
  return (tree, file) => {
    // Repo-relative, so that a document at the root (README.md) resolves its links from the root
    // rather than from inside docs/. Getting this wrong is silent: every relative link still
    // produces a plausible-looking URL, it just points at the wrong file.
    const abs = (file?.history?.[0] ?? file?.path ?? "").replace(/\\/g, "/");
    const repoRel = abs.startsWith(`${ROOT}/`) ? abs.slice(ROOT.length + 1) : abs;
    const fromDir = repoRel.includes("/") ? repoRel.slice(0, repoRel.lastIndexOf("/")) : "";
    const canonical = repoRel === "docs/research/pattern-catalog.md";

    visit(tree, "element", (node, index, parent) => {
      /* R1 · pattern tables ---------------------------------------------------------------- */
      if (node.tagName === "table" && isPatternTable(node)) {
        addClass(node, "rgs-pt");
        const body = node.children.find((c) => c.type === "element" && c.tagName === "tbody");
        for (const row of cells(body, "tr")) {
          const td = cells(row, "td");
          if (td.length !== 4) continue;

          const id = text(td[0]).trim();
          if (id) {
            addClass(td[0], "rgs-pt-id");
            td[0].children = [el("a", { href: `#${id}` }, [txt(id)])];
            if (canonical) {
              row.properties.id = id;
              td[0].children.push(
                el("a", { className: ["rgs-pt-anchor"], href: `#${id}`, title: "canonical definition" }, [txt("¶")]),
              );
            }
          }

          const src = sourceMark(text(td[2]));
          if (src) {
            td[2].children = [src];
            if (src.properties.className?.includes("rgs-src-none")) addClass(row, "rgs-pt-counter");
          }
          td[3].children = [rungBadge(text(td[3]))];
        }
        return;
      }

      /* R2 · console transcripts ------------------------------------------------------------
       * Markdown carries no capture date, and a number — or a transcript — without its date does
       * not get a quiet rendering. The caption is loud by design, not by omission. */
      if (node.tagName === "pre") {
        const code = node.children.find((c) => c.type === "element" && c.tagName === "code");
        const lang = [].concat(code?.properties?.className ?? []).find((c) => String(c).startsWith("language-"));
        if (code && lang === "language-console") {
          const lines = text(code).replace(/\n$/, "").split("\n").map((line) => {
            const cmd = line.match(/^\s*\$\s?(.*)$/);
            if (cmd) return el("div", { className: ["rgs-console-line", "rgs-console-cmd"] }, [txt(cmd[1])]);
            const type = /\[y\/N\]/i.test(line) ? "dim" : "out";
            return el("div", { className: ["rgs-console-line", `rgs-console-${type}`] }, [txt(line)]);
          });
          parent.children[index] = el("div", { className: ["rgs-console"] }, [
            el("div", { className: ["rgs-console-body"] }, lines),
            el("div", { className: ["rgs-console-cap", "rgs-console-cap-bad"] }, [
              el("span", {}, [txt("unverified output — date the transcript")]),
            ]),
          ]);
          return;
        }
      }

      /* R3 · enforcement declarations -------------------------------------------------------- */
      if (node.tagName === "code" && parent?.tagName !== "pre") {
        const v = text(node).trim();
        if (v === "gated" || v === "review-only") {
          parent.children[index] = el(
            "span",
            { className: ["rgs-enf", v === "gated" ? "rgs-enf-gated" : "rgs-enf-review"] },
            [txt(v)],
          );
          return;
        }
      }

      /* R4 · standalone ADR references -------------------------------------------------------
       * Only when the link is the whole cell or list item. An ADR cited mid-sentence stays a
       * link — a chip in flowing prose is noise, and the citation is not a status claim. */
      if (node.tagName === "a" && /^ADR-\d{4}$/.test(text(node).trim())) {
        const standalone =
          (parent?.tagName === "td" || parent?.tagName === "li") &&
          parent.children.filter((c) => c.type !== "text" || c.value.trim()).length === 1;
        if (standalone) addClass(node, "rgs-adr");
      }

      /* R5 · opinion, marked ------------------------------------------------------------------ */
      if (node.tagName === "em" || node.tagName === "strong") {
        if (/^opinion\b/i.test(text(node).trim())) addClass(node, "rgs-claim", "rgs-claim-inline", "rgs-claim-op");
      }

      /* R6 · callouts and opinion blockquotes ------------------------------------------------- */
      if (node.tagName === "blockquote") {
        const body = text(node).trim();
        const kind = /^(⚠️|⚠)?\s*\**known gap/i.test(body) || /^⚠️/.test(body)
          ? "gap"
          : /^\**amended\b/i.test(body)
            ? "amended"
            : null;
        if (kind) {
          node.tagName = "div";
          addClass(node, "rgs-callout", `rgs-callout-${kind}`);
          node.children.unshift(
            el("span", { className: ["rgs-callout-label"] }, [txt(kind === "gap" ? "Known gap" : "Amended")]),
          );
        } else if (/^\**opinion\b/i.test(body)) {
          addClass(node, "rgs-claim", "rgs-claim-op");
        }
      }

      /* R9 · cross-document links -------------------------------------------------------------- */
      if (node.tagName === "a" && typeof node.properties?.href === "string") {
        node.properties.href = rewriteHref(node.properties.href, fromDir);
      }
    });
  };
}

export default rehypeRungs;
