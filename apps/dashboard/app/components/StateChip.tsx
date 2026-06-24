import type { ProposalState } from "../lib/types";
import { stateColor } from "../lib/utils";

export function StateChip({ state }: { state: ProposalState }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-mono border ${stateColor(state)} ${stateBorder(state)}`}
    >
      {state}
    </span>
  );
}

function stateBorder(state: ProposalState): string {
  switch (state) {
    case "Active":
      return "border-accent/40 bg-accent/10";
    case "Queued":
      return "border-warn/40 bg-warn/10";
    case "Succeeded":
    case "Executed":
      return "border-success/40 bg-success/10";
    case "Defeated":
      return "border-danger/40 bg-danger/10";
    default:
      return "border-border bg-surface-3";
  }
}
