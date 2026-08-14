import React from "react";
const css = `
.rgs-src{display:inline-flex;gap:4px;align-items:center;vertical-align:baseline}
.rgs-src-44{background:var(--stamp);color:var(--sheet);font:600 11px/1 var(--font-mono);padding:3px 7px}
.rgs-src-one{border:1px solid var(--ink);color:var(--ink);font:500 11px/1 var(--font-mono);padding:2px 6px}
.rgs-src-none{color:var(--redline);font:italic 400 .95em var(--font-serif)}
.rgs-src-missing{border:2px dashed var(--redline);background:var(--redline-tint);color:var(--redline);font:600 10px/1 var(--font-label);letter-spacing:.1em;text-transform:uppercase;padding:3px 7px}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-src-css")) {
    const s = document.createElement("style"); s.id = "rgs-src-css"; s.textContent = css; document.head.appendChild(s);
  }
}
/** AM · HG · HT · RF chips; 4/4 solid stamp; counter-example italic redline; nothing → loud UNSOURCED. */
export function SourceMark({ sources, converged = false, counterExample }) {
  inject();
  if (converged) return <span className="rgs-src" title="four independent repos converged"><span className="rgs-src-44">4/4</span></span>;
  if (counterExample) return <span className="rgs-src rgs-src-none">none — {counterExample}</span>;
  if (sources && sources.length) return <span className="rgs-src">{sources.map((s) => <span key={s} className="rgs-src-one">{s}</span>)}</span>;
  return <span className="rgs-src rgs-src-missing">unsourced</span>;
}
