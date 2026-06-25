import { calcQuorumPct } from "../lib/utils";

interface QuorumBarProps {
  forVotes: bigint;
  quorumVotes: bigint;
  totalSupply: bigint;
}

export function QuorumBar({ forVotes, quorumVotes, totalSupply }: QuorumBarProps) {
  const pct = calcQuorumPct(forVotes, quorumVotes);
  const reached = forVotes >= quorumVotes;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Quorum: {Number(forVotes)}/{Number(quorumVotes)} votes
        </span>
        <span className={reached ? "text-success" : "text-warn"}>
          {reached ? "Reached" : `${pct}%`}
        </span>
      </div>
      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${reached ? "bg-success" : "bg-accent"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="text-xs text-muted">
        {Number(totalSupply)} total members · 60% quorum threshold
      </div>
    </div>
  );
}
