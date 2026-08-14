/**
 * Maturity-rung badge, 0–5. Density of hatching = cost of upkeep, so rung 5 reads expensive rather than premium. Cost text sits adjacent by default; a missing rung renders loud.
 */
export interface RungBadgeProps {
  /** 0–5. null/undefined renders the RUNG UNSTATED failure state. */
  rung?: 0 | 1 | 2 | 3 | 4 | 5;
  /** Override the default ladder cost line; pass null to hide (sm size hides it into a title attr) */
  cost?: string | null;
  /** "md" (label + cost) | "sm" (table-cell mini: hatch square + numeral) */
  size?: "md" | "sm";
  title?: string;
}
export declare function RungBadge(props: RungBadgeProps): JSX.Element;
