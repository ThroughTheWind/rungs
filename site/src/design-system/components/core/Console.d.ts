/**
 * Terminal transcript. Static by rule: if a terminal moves it shows real output. Undated transcripts render the failure state.
 */
export interface ConsoleLine {
  /** "cmd" (gets $ prefix) | "out" | "dim" | "warn" */
  type?: "cmd" | "out" | "dim" | "warn";
  text: string;
}
export interface ConsoleProps {
  lines: ConsoleLine[];
  /** Absolute date the output was captured, e.g. "2026-08-14". Omitting it renders the loud failure caption. */
  date?: string;
  /** Where the transcript came from, e.g. "npx rungs check" */
  source?: string;
}
export declare function Console(props: ConsoleProps): JSX.Element;
