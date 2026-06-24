import Link from "next/link";
import type { Proposal } from "../lib/types";
import { formatAddress, formatCountdown, formatTimestamp } from "../lib/utils";
import { StateChip } from "./StateChip";
import { QuorumBar } from "./QuorumBar";

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const isQueued = proposal.state === "Queued" && proposal.timelockEta;

  return (
    <Link href={`/proposals/${proposal.id}`}>
      <div className="bg-surface-2 border border-border rounded-lg p-4 hover:border-accent transition-colors cursor-pointer space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium text-ink leading-snug flex-1">{proposal.title}</h3>
          <StateChip state={proposal.state} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>
            Agent:{" "}
            <span className="font-mono text-accent-2">{formatAddress(proposal.proposerAgent)}</span>{" "}
            <span className="text-muted/60">({proposal.proposerAgentId})</span>
          </span>
          <span>
            Principal:{" "}
            <span className="text-ink">
              {proposal.proposerPrincipalName ?? formatAddress(proposal.proposerPrincipal)}
            </span>
          </span>
        </div>

        <QuorumBar
          forVotes={proposal.forVotes}
          quorumVotes={proposal.quorumVotes}
          totalSupply={proposal.totalSupply}
        />

        <div className="flex items-center justify-between text-xs text-muted">
          <span>Proposed {formatTimestamp(proposal.createdAt)}</span>
          {isQueued && proposal.timelockEta && (
            <span className="text-warn">Timelock: {formatCountdown(proposal.timelockEta)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
