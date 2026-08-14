import React from "react";
const css = `
.rgs-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;text-decoration:none;box-sizing:border-box;
  font:600 13px/1 var(--font-label);letter-spacing:.08em;text-transform:uppercase;border-radius:var(--radius-0);
  transition:background-color var(--dur) var(--ease),color var(--dur) var(--ease),box-shadow var(--dur) var(--ease)}
.rgs-btn:focus-visible{outline:var(--focus-ring);outline-offset:2px}
.rgs-btn-md{min-height:var(--target-min);padding:0 20px}
.rgs-btn-sm{min-height:34px;padding:0 14px;font-size:12px}
.rgs-btn-primary{background:var(--ink);color:var(--paper);border:1px solid var(--ink);box-shadow:var(--shadow-sheet)}
.rgs-btn-primary:hover{background:var(--ink-2)}
.rgs-btn-secondary{background:var(--surface-card);color:var(--ink);border:1px solid var(--ink);box-shadow:var(--shadow-sheet)}
.rgs-btn-secondary:hover{background:var(--surface-tint)}
.rgs-btn-primary:active,.rgs-btn-secondary:active{transform:translate(2px,2px);box-shadow:none}
.rgs-btn-ghost{background:transparent;color:var(--color-link);border:1px solid transparent;text-decoration:underline;text-underline-offset:3px}
.rgs-btn-ghost:hover{color:var(--color-link-hover)}
.rgs-btn[disabled],.rgs-btn-disabled{opacity:.45;pointer-events:none;box-shadow:none}`;
function inject() {
  if (typeof document !== "undefined" && !document.getElementById("rgs-btn-css")) {
    const s = document.createElement("style"); s.id = "rgs-btn-css"; s.textContent = css; document.head.appendChild(s);
  }
}
export function Button({ variant = "primary", size = "md", disabled = false, href, onClick, children }) {
  inject();
  const cls = `rgs-btn rgs-btn-${variant} rgs-btn-${size}${disabled ? " rgs-btn-disabled" : ""}`;
  if (href && !disabled) return <a className={cls} href={href} onClick={onClick}>{children}</a>;
  return <button className={cls} disabled={disabled} onClick={onClick}>{children}</button>;
}
