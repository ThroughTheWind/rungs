import React from "react";
const COSTS = ["~1 hour, then near-zero", "minutes per item", "authoring only", "a script + its self-test, each", "ongoing rule curation", "high; a real tooling project"];
const css = `
.rgs-rung{display:inline-flex;align-items:stretch;border:1px solid var(--ink);background:var(--surface-card);vertical-align:middle}
.rgs-rung-swatch{width:26px;border-right:1px solid var(--ink)}
.rgs-rung-txt{padding:4px 8px}
.rgs-rung-n{font:700 12px/1 var(--font-display);letter-spacing:.06em;display:block}
.rgs-rung-cost{font:400 10px/1.3 var(--font-mono);color:var(--text-muted);display:block;margin-top:2px}
.rgs-rung-sm{display:inline-flex;align-items:center;gap:5px;font:500 12px var(--font-mono);white-space:nowrap}
.rgs-rung-sm i{width:12px;height:12px;border:1px solid var(--ink);display:inline-block}
.rgs-rung-missing{border:2px dashed var(--redline);background:var(--redline-tint);color:var(--redline);font:600 10px/1 var(--font-label);letter-spacing:.1em;text-transform:uppercase;padding:4px 7px;display:inline-block}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-rung-css")) {
    const s = document.createElement("style"); s.id = "rgs-rung-css"; s.textContent = css; document.head.appendChild(s);
  }
}
/** Rung 0–5: cumulative cost, shown as hatch density. Missing rung renders loud. */
export function RungBadge({ rung, cost, size = "md", title }) {
  inject();
  if (rung == null || rung < 0 || rung > 5) return <span className="rgs-rung-missing">rung unstated</span>;
  const hatch = { background: `var(--hatch-r${rung})` };
  const costText = cost === undefined ? COSTS[rung] : cost;
  if (size === "sm") return <span className="rgs-rung-sm" title={title || `rung ${rung} — ${costText}`}><i style={hatch}></i>{rung}</span>;
  return (
    <span className="rgs-rung">
      <span className="rgs-rung-swatch" style={hatch}></span>
      <span className="rgs-rung-txt"><span className="rgs-rung-n">RUNG {rung}</span>{costText ? <span className="rgs-rung-cost">{costText}</span> : null}</span>
    </span>
  );
}
