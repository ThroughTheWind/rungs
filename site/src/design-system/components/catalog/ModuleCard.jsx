import React from "react";
import { RungBadge } from "../provenance/RungBadge.jsx";
const css = `
.rgs-mod{background:var(--surface-card);border:1px solid var(--ink);box-shadow:var(--shadow-sheet);display:block;text-decoration:none;color:var(--text-body)}
a.rgs-mod{transition:box-shadow var(--dur) var(--ease)}
a.rgs-mod:hover{box-shadow:var(--shadow-sheet-hover)}
a.rgs-mod:active{transform:translate(2px,2px);box-shadow:none}
.rgs-mod-hd{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--ink)}
.rgs-mod-name{font:600 15px var(--font-mono)}
.rgs-mod-body{padding:10px 14px}
.rgs-mod-blurb{font:400 13.5px/1.5 var(--font-serif);color:var(--text-body);margin:0}
.rgs-mod-meta{display:flex;flex-wrap:wrap;gap:6px 14px;padding:8px 14px;border-top:1px solid var(--line);font:400 11px var(--font-mono);color:var(--text-muted)}
.rgs-mod-meta b{font-weight:500;color:var(--text-body)}
.rgs-mod-deps a{color:var(--color-link)}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-mod-css")) {
    const s = document.createElement("style"); s.id = "rgs-mod-css"; s.textContent = css; document.head.appendChild(s);
  }
}
/** One module as a sheet: name, rung with cost adjacent, dependencies, one-line what-it-is. */
export function ModuleCard({ name, rung, cost, deps = [], blurb, href }) {
  inject();
  const Tag = href ? "a" : "div";
  return (
    <Tag className="rgs-mod" href={href}>
      <div className="rgs-mod-hd"><span className="rgs-mod-name">{name}</span><RungBadge rung={rung} cost={cost} /></div>
      {blurb ? <div className="rgs-mod-body"><p className="rgs-mod-blurb">{blurb}</p></div> : null}
      <div className="rgs-mod-meta"><span className="rgs-mod-deps"><b>deps:</b> {deps.length ? deps.join(" · ") : "none"}</span></div>
    </Tag>
  );
}
