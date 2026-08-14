import React from "react";
const css = `
.rgs-console{background:var(--surface-pit);border:1px solid var(--ink);font:400 var(--text-md)/1.7 var(--font-mono);color:var(--text-pit)}
.rgs-console-body{padding:14px 18px;overflow-x:auto}
.rgs-console-line{white-space:pre-wrap}
.rgs-console-cmd::before{content:"$ ";color:var(--text-pit-dim)}
.rgs-console-cmd{color:var(--text-pit);font-weight:500}
.rgs-console-out{color:var(--text-pit)}
.rgs-console-dim{color:var(--text-pit-dim)}
.rgs-console-warn{color:#E8825F}
.rgs-console-cap{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--text-pit-dim);padding:6px 18px;
  font:500 var(--text-2xs) var(--font-label);letter-spacing:var(--track-label);text-transform:uppercase;color:var(--text-pit-dim)}
.rgs-console-cap-bad{color:#E8825F;border-top:2px dashed #E8825F}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-console-css")) {
    const s = document.createElement("style"); s.id = "rgs-console-css"; s.textContent = css; document.head.appendChild(s);
  }
}
export function Console({ lines = [], date, source }) {
  inject();
  const dated = !!date;
  return (
    <div className="rgs-console">
      <div className="rgs-console-body">
        {lines.map((l, i) => <div key={i} className={`rgs-console-line rgs-console-${l.type || "out"}`}>{l.text}</div>)}
      </div>
      {dated
        ? <div className="rgs-console-cap"><span>real output{source ? ` · ${source}` : ""}</span><span>{date}</span></div>
        : <div className="rgs-console-cap rgs-console-cap-bad"><span>unverified output — date the transcript</span></div>}
    </div>
  );
}
