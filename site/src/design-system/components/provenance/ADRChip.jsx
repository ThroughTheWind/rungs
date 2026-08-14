import React from "react";
const css = `
.rgs-adr{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--surface-card);padding:4px 9px;font:500 12px var(--font-mono);text-decoration:none;color:var(--text-body)}
a.rgs-adr:hover{border-color:var(--ink)}
.rgs-adr-status{font:600 10px var(--font-label);letter-spacing:.08em;text-transform:uppercase}
.rgs-adr-accepted{color:var(--stamp)}
.rgs-adr-proposed{color:var(--text-muted)}
.rgs-adr-superseded{color:var(--text-muted);text-decoration:line-through}
.rgs-adr-rejected{color:var(--redline)}
.rgs-adr-revisit{color:var(--redline);font:italic 400 11px var(--font-serif)}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-adr-css")) {
    const s = document.createElement("style"); s.id = "rgs-adr-css"; s.textContent = css; document.head.appendChild(s);
  }
}
/** ADR status chip with optional revisit trigger — triggers stay visible, they are the honest part. */
export function ADRChip({ id, status = "proposed", revisit, href }) {
  inject();
  const body = <>
    <span>{id}</span>
    <span className={`rgs-adr-status rgs-adr-${status}`}>{status}</span>
    {revisit ? <span className="rgs-adr-revisit">revisit: {revisit}</span> : null}
  </>;
  return href ? <a className="rgs-adr" href={href}>{body}</a> : <span className="rgs-adr">{body}</span>;
}
