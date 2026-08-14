import React from "react";
const css = `
.rgs-meas{font:400 var(--text-md) var(--font-mono)}
.rgs-meas-val{font-weight:600}
.rgs-meas-sep{color:var(--text-muted)}
.rgs-meas-date{color:var(--text-muted)}
.rgs-meas-cmd{background:var(--surface-tint);padding:1px 4px;font-size:.92em}
.rgs-meas-bad{border:2px dashed var(--redline);background:var(--redline-tint);padding:2px 6px}
.rgs-meas-bad-tag{color:var(--redline);font:600 10px var(--font-label);letter-spacing:.1em;text-transform:uppercase;margin-left:6px}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-meas-css")) {
    const s = document.createElement("style"); s.id = "rgs-meas-css"; s.textContent = css; document.head.appendChild(s);
  }
}
/** count + date + command, or the loud failure state. A number may not render without its date. */
export function Measurement({ value, date, command }) {
  inject();
  if (!date || !command) {
    return <span className="rgs-meas rgs-meas-bad"><span className="rgs-meas-val">{value}</span>
      <span className="rgs-meas-bad-tag">{!date ? "undated number" : "no command"}</span></span>;
  }
  return <span className="rgs-meas"><span className="rgs-meas-val">{value}</span>
    <span className="rgs-meas-sep"> · </span><span className="rgs-meas-date">{date}</span>
    <span className="rgs-meas-sep"> · </span><code className="rgs-meas-cmd">{command}</code></span>;
}
