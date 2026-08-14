import React from "react";
const css = `
.rgs-enf{font:600 10px/1 var(--font-label);letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;display:inline-block;vertical-align:middle}
.rgs-enf-gated{background:var(--ink);color:var(--paper)}
.rgs-enf-review{border:1px solid var(--ink);color:var(--ink);padding:2px 7px}
.rgs-enf-undeclared{border:2px dashed var(--redline);background:var(--redline-tint);color:var(--redline)}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-enf-css")) {
    const s = document.createElement("style"); s.id = "rgs-enf-css"; s.textContent = css; document.head.appendChild(s);
  }
}
/** gated | review-only. Anything else is the silent third category, rendered loudly. */
export function EnforcementTag({ state }) {
  inject();
  if (state === "gated") return <span className="rgs-enf rgs-enf-gated">gated</span>;
  if (state === "review-only") return <span className="rgs-enf rgs-enf-review">review-only</span>;
  return <span className="rgs-enf rgs-enf-undeclared">undeclared</span>;
}
