import React from "react";
const css = `
.rgs-tb{display:grid;grid-auto-flow:column;grid-auto-columns:auto;grid-template-columns:1fr;border:1px solid var(--ink);background:var(--surface-card)}
.rgs-tb-cell{padding:10px 14px;border-left:1px solid var(--ink);min-width:0}
.rgs-tb-cell:first-child{border-left:0}
.rgs-tb-lab{font:600 var(--text-2xs)/1 var(--font-label);letter-spacing:var(--track-label);text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:4px}
.rgs-tb-title{font:700 20px/1.1 var(--font-display);text-transform:uppercase;letter-spacing:var(--track-display)}
.rgs-tb-val{font:500 12.5px/1.3 var(--font-mono)}
@media (max-width:560px){.rgs-tb{grid-auto-flow:row;grid-auto-columns:unset}.rgs-tb-cell{border-left:0;border-top:1px solid var(--ink)}.rgs-tb-cell:first-child{border-top:0}}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-tb-css")) {
    const s = document.createElement("style"); s.id = "rgs-tb-css"; s.textContent = css; document.head.appendChild(s);
  }
}
export function TitleBlock({ title, kicker, fields = [] }) {
  inject();
  return (
    <header className="rgs-tb">
      <div className="rgs-tb-cell">{kicker ? <span className="rgs-tb-lab">{kicker}</span> : null}<div className="rgs-tb-title">{title}</div></div>
      {fields.map((f, i) => <div key={i} className="rgs-tb-cell"><span className="rgs-tb-lab">{f.label}</span><div className="rgs-tb-val">{f.value}</div></div>)}
    </header>
  );
}
