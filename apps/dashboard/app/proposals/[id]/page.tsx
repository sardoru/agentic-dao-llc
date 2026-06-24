import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProposal, fetchRationale } from "../../lib/client";
import { formatAddress, formatBigInt, formatCountdown, formatTimestamp } from "../../lib/utils";
import { StateChip } from "../../components/StateChip";
import { QuorumBar } from "../../components/QuorumBar";

const BASESCAN = "https://sepolia.basescan.org/tx/";

function supportLabel(s: 0 | 1 | 2) {
  if (s === 1) return <span className="text-success">For</span>;
  if (s === 0) return <span className="text-danger">Against</span>;
  return <span className="text-muted">Abstain</span>;
}

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposal = await fetchProposal(id);
  if (!proposal) notFound();

  const rationale = await fetchRationale(proposal.rationaleURI, proposal.rationaleHash);

  return (
    <div className="px-8 py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-start gap-3 mb-2">
          <h1 className="text-xl font-semibold text-ink flex-1">{proposal.title}</h1>
          <StateChip state={proposal.state} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>
            Proposed by agent{" "}
            <span className="font-mono text-accent-2">{formatAddress(proposal.proposerAgent)}</span>{" "}
            <span className="text-muted/60">({proposal.proposerAgentId})</span>
          </span>
          <span>
            Principal:{" "}
            <span className="text-ink">
              {proposal.proposerPrincipalName ?? formatAddress(proposal.proposerPrincipal)}
            </span>
          </span>
          <span>
            <a
              href={`${BASESCAN}${proposal.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              View on Basescan ↗
            </a>
          </span>
        </div>
        <p className="mt-3 text-sm text-muted leading-relaxed">{proposal.description}</p>
      </div>

      {/* Decoded calls */}
      {proposal.decodedCalls && proposal.decodedCalls.length > 0 && (
        <section>
          <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
            Decoded Actions
          </h2>
          <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="text-left px-4 py-2.5 font-normal">#</th>
                  <th className="text-left px-4 py-2.5 font-normal">Target</th>
                  <th className="text-left px-4 py-2.5 font-normal">Function</th>
                  <th className="text-left px-4 py-2.5 font-normal">Arguments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {proposal.decodedCalls.map((call, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 text-muted">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-accent-2">
                      {formatAddress(call.target)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-ink">{call.fn}</td>
                    <td className="px-4 py-2.5 text-muted">{call.args}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Simulation result */}
      {proposal.simResult && (
        <section>
          <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
            Simulation Result
          </h2>
          <div
            className={`bg-surface-2 border rounded-lg p-4 ${proposal.simResult.success ? "border-success/30" : "border-danger/30"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={proposal.simResult.success ? "text-success" : "text-danger"}>
                {proposal.simResult.success ? "✓ Simulation passed" : "✗ Simulation failed"}
              </span>
              <span className="text-xs text-muted">
                Gas: {Number(proposal.simResult.gasUsed).toLocaleString()}
              </span>
            </div>
            {proposal.simResult.revertReason && (
              <div className="text-xs font-mono text-danger bg-danger/10 px-3 py-2 rounded">
                Revert: {proposal.simResult.revertReason}
              </div>
            )}
            {proposal.simResult.assetChanges && proposal.simResult.assetChanges.length > 0 && (
              <div className="mt-2 text-xs text-muted space-y-1">
                {proposal.simResult.assetChanges.map((c, i) => (
                  <div key={i} className="font-mono">
                    {c.symbol}: {c.delta.startsWith("-") ? c.delta : `+${c.delta}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Rationale */}
      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
          Rationale (IPFS)
        </h2>
        <div className="bg-surface-2 border border-border rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-muted">
              URI: <span className="font-mono text-accent-2">{proposal.rationaleURI}</span>
            </span>
            <span className={rationale.verified ? "text-success" : "text-danger"}>
              {rationale.verified
                ? "✓ Content hash verified"
                : "⚠ HASH NOT VERIFIED — content may not match on-chain anchor"}
            </span>
          </div>
          <div className="text-xs font-mono text-muted bg-surface-3 rounded px-3 py-2 whitespace-pre-wrap">
            {rationale.content}
          </div>
        </div>
      </section>

      {/* Quorum */}
      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
          Votes & Quorum
        </h2>
        <div className="bg-surface-2 border border-border rounded-lg p-4 mb-4">
          <QuorumBar
            forVotes={proposal.forVotes}
            quorumVotes={proposal.quorumVotes}
            totalSupply={proposal.totalSupply}
          />
          <div className="mt-3 flex gap-6 text-xs">
            <span className="text-success">For: {Number(proposal.forVotes)}</span>
            <span className="text-danger">Against: {Number(proposal.againstVotes)}</span>
            <span className="text-muted">Abstain: {Number(proposal.abstainVotes)}</span>
          </div>
        </div>

        {/* Votes table */}
        <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="text-left px-4 py-2.5 font-normal">Agent</th>
                <th className="text-left px-4 py-2.5 font-normal">Principal</th>
                <th className="text-left px-4 py-2.5 font-normal">Vote</th>
                <th className="text-left px-4 py-2.5 font-normal">Weight</th>
                <th className="text-left px-4 py-2.5 font-normal">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {proposal.votes.map((vote, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 font-mono text-accent-2">
                    {formatAddress(vote.agentAddress)}
                    {vote.agentId !== "self" && (
                      <span className="text-muted/60 ml-1">({vote.agentId})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{formatAddress(vote.principal)}</td>
                  <td className="px-4 py-2.5">{supportLabel(vote.support)}</td>
                  <td className="px-4 py-2.5 font-mono">{Number(vote.weight)}</td>
                  <td className="px-4 py-2.5 text-muted max-w-xs truncate">{vote.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Timelock */}
      {proposal.timelockEta && (
        <section>
          <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Timelock</h2>
          <div className="bg-surface-2 border border-warn/30 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-ink">
                In delay window until{" "}
                <span className="font-mono text-warn">{formatTimestamp(proposal.timelockEta)}</span>
              </div>
              <div className="text-xs text-muted mt-1">{formatCountdown(proposal.timelockEta)}</div>
            </div>
            <Link
              href="/guardian"
              className="text-xs bg-danger/20 text-danger hover:bg-danger/30 border border-danger/40 px-3 py-1.5 rounded transition-colors"
            >
              Guardian Console →
            </Link>
          </div>
        </section>
      )}

      <div className="pt-2">
        <Link href="/" className="text-xs text-muted hover:text-ink transition-colors">
          ← Back to proposals
        </Link>
      </div>
    </div>
  );
}
