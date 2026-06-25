import { fetchDaoStats, fetchProposals } from "./lib/client";
import { ProposalCard } from "./components/ProposalCard";

export default async function ProposalsPage() {
  const [proposals, stats] = await Promise.all([fetchProposals(), fetchDaoStats()]);

  return (
    <div className="px-4 py-8 sm:px-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink mb-1">Governance Proposals</h1>
        <p className="text-sm text-muted">
          {proposals.length} proposals · {stats.memberCount} members · {stats.quorumFraction}%
          quorum threshold
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-surface-2 border border-border rounded-lg px-4 py-3">
          <div className="text-xs text-muted mb-1">Active</div>
          <div className="text-xl font-mono text-accent-2">
            {proposals.filter((p) => p.state === "Active").length}
          </div>
        </div>
        <div className="bg-surface-2 border border-border rounded-lg px-4 py-3">
          <div className="text-xs text-muted mb-1">Queued</div>
          <div className="text-xl font-mono text-warn">
            {proposals.filter((p) => p.state === "Queued").length}
          </div>
        </div>
        <div className="bg-surface-2 border border-border rounded-lg px-4 py-3">
          <div className="text-xs text-muted mb-1">Executed</div>
          <div className="text-xl font-mono text-success">
            {proposals.filter((p) => p.state === "Executed").length}
          </div>
        </div>
      </div>

      {/* Proposals list */}
      <div className="space-y-3">
        {proposals.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>
    </div>
  );
}
