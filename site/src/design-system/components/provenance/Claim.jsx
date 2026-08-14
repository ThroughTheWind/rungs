import React from "react";
const css = `
.rgs-claim{max-width:var(--measure)}
.rgs-claim-inline{display:inline}
.rgs-claim-ev{font-family:var(--font-serif)}
.rgs-claim-cite{font:500 11px var(--font-mono);color:var(--stamp);white-space:nowrap}
.rgs-claim-cite::before{content:"[";color:var(--text-muted)}
.rgs-claim-cite::after{content:"]";color:var(--text-muted)}
.rgs-claim-op{color:var(--text-opinion);font-style:italic}
.rgs-claim-op-lead{font:600 10px var(--font-label);letter-spacing:.1em;text-transform:uppercase;color:var(--text-opinion);font-style:normal;margin-right:6px}
.rgs-claim-unmarked{border:2px dashed var(--redline);background:var(--redline-tint);padding:2px 6px}
.rgs-claim-unmarked-tag{color:var(--redline);font:600 10px var(--font-label);letter-spacing:.1em;text-transform:uppercase;margin-left:6px}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-claim-css")) {
    const s = document.createElement("style"); s.id = "rgs-claim-css"; s.textContent = css; document.head.appendChild(s);
  }
}
/** evidence (cited) or opinion (pencil italic, first person). Unmarked renders loud. */
export function Claim({ kind, cite, children }) {
  inject();
  if (kind === "evidence") return <span className="rgs-claim rgs-claim-inline rgs-claim-ev">{children}{cite ? <> <span className="rgs-claim-cite">{cite}</span></> : null}</span>;
  if (kind === "opinion") return <span className="rgs-claim rgs-claim-inline rgs-claim-op"><span className="rgs-claim-op-lead">Opinion</span>{children}</span>;
  return <span className="rgs-claim rgs-claim-inline rgs-claim-unmarked">{children}<span className="rgs-claim-unmarked-tag">unmarked claim</span></span>;
}
