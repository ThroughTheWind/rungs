import React from "react";
import { SourceMark } from "../provenance/SourceMark.jsx";
import { RungBadge } from "../provenance/RungBadge.jsx";
const css = `
.rgs-pt{width:100%;border-collapse:collapse;font:400 var(--text-md)/1.5 var(--font-serif);background:var(--surface-card);border:1px solid var(--ink)}
.rgs-pt caption{caption-side:top;text-align:left;font:italic 400 13px/1.5 var(--font-serif);color:var(--text-muted);padding:0 0 10px}
.rgs-pt th{font:600 var(--text-2xs) var(--font-label);letter-spacing:var(--track-label);text-transform:uppercase;color:var(--text-muted);text-align:left;padding:7px 10px;border-bottom:1px solid var(--ink);background:var(--surface-tint)}
.rgs-pt td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
.rgs-pt tr:last-child td{border-bottom:0}
.rgs-pt-id{font:500 12.5px var(--font-mono);white-space:nowrap}
.rgs-pt-id a{color:var(--color-link);text-decoration:none;border-bottom:1px solid var(--line)}
.rgs-pt-id a:hover{color:var(--color-link-hover);border-color:var(--color-link-hover)}
.rgs-pt-anchor{color:var(--stamp);text-decoration:none;font-size:12px;margin-left:4px}
.rgs-pt-counter td{background:var(--redline-tint)}
@media (max-width:560px){
  .rgs-pt thead{display:none}
  .rgs-pt,.rgs-pt tbody,.rgs-pt tr,.rgs-pt td{display:block;width:auto}
  .rgs-pt td{border-bottom:0;padding:2px 10px}
  .rgs-pt tr{border-bottom:1px solid var(--line);padding:8px 0}
}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-pt-css")) {
    const s = document.createElement("style"); s.id = "rgs-pt-css"; s.textContent = css; document.head.appendChild(s);
  }
}
/** The pattern-catalog table: id · pattern · src · rung. Canonical mode adds ¶ anchors; counter-example rows tint redline. */
export function PatternTable({ rows = [], caption, canonical = false }) {
  inject();
  return (
    <table className="rgs-pt">
      {caption ? <caption>{caption}</caption> : null}
      <thead><tr><th>id</th><th>pattern</th><th>src</th><th>rung</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} id={canonical ? r.id : undefined} className={r.src && r.src.counterExample ? "rgs-pt-counter" : undefined}>
            <td className="rgs-pt-id"><a href={`#${r.id}`}>{r.id}</a>{canonical ? <a className="rgs-pt-anchor" href={`#${r.id}`} title="canonical definition">¶</a> : null}</td>
            <td>{r.pattern}</td>
            <td><SourceMark {...(r.src || {})} /></td>
            <td><RungBadge rung={r.rung} size="sm" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
