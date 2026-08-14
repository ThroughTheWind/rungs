/**
 * A module rendered as a sheet: name, rung badge with its cost adjacent, declared dependencies, one-line description. Dependencies are always shown — "none" is a real value.
 */
export interface ModuleCardProps {
  /** Module name, e.g. "concurrency" */
  name: string;
  /** 0–5; omit to render RUNG UNSTATED */
  rung?: 0 | 1 | 2 | 3 | 4 | 5;
  /** Module's own stated cost; defaults to the ladder's line for that rung */
  cost?: string;
  /** Declared dependencies, e.g. ["backlog", "gates", "ci"] */
  deps?: string[];
  /** One line of what it is, from the catalog */
  blurb?: React.ReactNode;
  href?: string;
}
export declare function ModuleCard(props: ModuleCardProps): JSX.Element;
