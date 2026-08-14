import React from "react";
const css = `
.rgs-callout{border-left:2px solid var(--line);padding:8px 14px;background:var(--surface-tint);max-width:var(--measure)}
.rgs-callout p{margin:0}
.rgs-callout-label{font:600 var(--text-2xs)/1 var(--font-label);letter-spacing:var(--track-label);text-transform:uppercase;display:block;margin-bottom:4px;color:var(--text-muted)}
.rgs-callout-gap{border-left-color:var(--redline);background:var(--redline-tint)}
.rgs-callout-gap .rgs-callout-label{color:var(--redline)}
.rgs-callout-amended{border-left-color:var(--stamp);background:var(--stamp-tint)}
.rgs-callout-amended .rgs-callout-label{color:var(--stamp)}
.rgs-callout-body{font:400 var(--text-md)/1.55 var(--font-serif);color:var(--text-body)}
.rgs-callout-ref{font:500 .92em var(--font-mono)}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-callout-css")) {
    const s = document.createElement("style"); s.id = "rgs-callout-css"; s.textContent = css; document.head.appendChild(s);
  }
}
const LABELS = { gap: "Known gap", amended: "Amended", note: "Note" };
export function Callout({ kind = "note", refId, date, children }) {
  inject();
  return (
    <div className={`rgs-callout rgs-callout-${kind}`}>
      <span className="rgs-callout-label">{LABELS[kind] || "Note"}{refId ? <> · <span className="rgs-callout-ref">{refId}</span></> : null}{date ? <> · {date}</> : null}</span>
      <div className="rgs-callout-body">{children}</div>
    </div>
  );
}
